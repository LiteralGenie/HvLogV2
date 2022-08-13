from typing import TypedDict

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from classes.models import ActiveBattleTurn, Battle, BattleReport
from config import paths
from utils.parse import parse_events


class RawTurnLog(BaseModel):
    lines: list[str]
    time: int | None


class Turn(TypedDict):
    events: list[dict]
    time: int | None


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_active_battle(
    round_start_event: dict | None = None,
) -> tuple[Battle, BattleReport | None, bool]:
    is_new_battle = False

    # Get or create latest battle
    active_battle = Battle.get_or_none(Battle.active == True)
    if active_battle is None:
        active_battle = Battle.create(active=True)

    # Get latest battle info
    active_report = (
        BattleReport.select().join(Battle).where(Battle.pk == active_battle.pk).first()
    )

    # If we have info to create or update a report...
    if ev := round_start_event:
        if active_report is None:
            # If no existing report, create one
            active_report = BattleReport.create(
                type="meta",
                data=dict(
                    battle_type=ev["battle_type"],
                    last_round=ev["current"],
                    max_rounds=ev["max"],
                ),
                battle=active_battle,
            )
        else:
            # Else check if event is for a new battle
            is_earlier_round = ev["current"] < active_report.data["last_round"]
            is_different_type = ev["battle_type"] != active_report.data["battle_type"]
            is_different_round_max = ev["max"] != active_report.data["max_rounds"]

            if is_different_type or is_different_round_max or is_earlier_round:
                # Event is for new battle, so create battle / report
                active_battle.update(active=False).execute()
                active_battle = Battle.create(active=True)
                is_new_battle = True

                active_report = BattleReport.create(
                    type="meta",
                    data=dict(
                        battle_type=ev["battle_type"],
                        last_round=ev["current"],
                        max_rounds=ev["max"],
                    ),
                    battle=active_battle,
                )
            else:
                # Event is for current battle so update battle report
                active_report.data["last_round"] = ev["current"]
                active_report.save()

    return active_battle, active_report, is_new_battle


def parse_logs(raw_logs: list[RawTurnLog]) -> tuple[list[Turn], list[str]]:
    # Sort by time
    raw_sorted = [
        log
        for idx, log in sorted(
            enumerate(raw_logs), key=lambda pair: pair[1].time or pair[0]
        )
    ]

    # Parse into events
    events = parse_events([line for turn in raw_sorted for line in turn.lines])

    # Regroup into Turns
    rejects: list[str] = []
    turns: list[Turn] = []
    for raw_log in raw_logs:
        turns.append(Turn(events=[], time=raw_log.time))
        for line in raw_log.lines:
            ev = events.pop(0)
            if ev:
                turns[-1]["events"].append(ev)
            else:
                rejects.append(line)

    return turns, rejects


@app.post("/logs")
def post_logs(raw_logs: list[RawTurnLog]):
    """
    Assumptions:
        -> All turn_logs are for the same battle
        -> At least one log starts with a ROUND_START event
    """

    # Parse logs
    [turns, unparseable] = parse_logs(raw_logs)
    for line in unparseable:
        print(f"WARNING: Failed to parse line [{line}]")

    # Get or create active battle
    round_start = next(
        (
            ev
            for turn in turns
            for ev in turn["events"]
            if ev and ev["event_type"] == "ROUND_START"
        ),
        None,
    )
    active_battle, active_report, is_new_battle = get_active_battle(round_start)

    # Append events to db
    for turn in turns:
        ActiveBattleTurn.create(
            events=turn["events"], meta=dict(time=turn["time"]), battle=active_battle
        )

    # Append events to file
    out_file = paths.BATTLE_LOG_DIR / f"{active_battle.pk}.hv"
    with open(out_file, "a") as file:
        turns = [t.json() for t in raw_logs]
        file.write("\n".join(turns) + "\n")


class ReportGenerator:
    """
    Interface. Returns dict of data that should be saved to db as necessary.
    If server restarts, this generator should be fed the events from scratch and the final return value is what goes in db.
    """

    def __init__(self, start_event):
        """
        If start_event is not a battle start or round_initializer, it's the responsibility of the implementation to fail
        """

    def step(self, event) -> dict | None:
        """
        Update state, return a dict if something needs to update
        """
        pass

    def finalize(self, event) -> dict | None:
        """
        Indicates that battle is over, step() should never be called again. finalize() should also never be called again
        """
        pass


if __name__ == "__main__":
    uvicorn.run(
        "run_server:app", host="0.0.0.0", port=9999, log_level="debug", reload=True
    )
