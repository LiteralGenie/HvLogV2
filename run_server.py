import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from classes.models import Battle, BattleReport, Event, Turn
from config import paths
from utils.parse import parse_events


class RawTurnLog(BaseModel):
    lines: list[str]
    time: int | None


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/logs")
def post_logs(turn_logs: list[RawTurnLog]):
    """
    Assumptions:
        -> All turn_logs are for the same battle
        -> At least one log starts with a ROUND_START event
    """

    # Sort by time
    turn_logs = [
        log
        for idx, log in sorted(
            enumerate(turn_logs), key=lambda pair: pair[1].time or pair[0]
        )
    ]

    # Parse into events
    turn_inds = [i for i, turn in enumerate(turn_logs) for _ in turn.lines]
    lines = [line for turn in turn_logs for line in turn.lines]
    events = parse_events(lines)

    round_start = next(
        (ev for ev in events if ev and ev["event_type"] == "ROUND_START"), None
    )

    # Get or create latest battle
    active_battle = Battle.get_or_none(Battle.active == True)

    if active_battle is None:
        active_battle = Battle.create(active=True)

    # Get latest battle info
    active_battle_report = (
        BattleReport.select().join(Battle).where(Battle.id == active_battle.id).first()
    )

    # Check if logs are for new battle
    if round_start:

        def is_earlier_round(current: int):
            ev: Event = (
                Event.select()
                .join(Turn)
                .join(Battle)
                .where(Event.type == "ROUND_START", Battle.id == active_battle.id)
                .order_by(Event.idx.desc())
                .first()
            )
            last_round: int = ev.parsed_data["current"] if ev else float("inf")

            return current < last_round

        is_different_type = (
            active_battle_report
            and round_start["battle_type"] != active_battle_report.type
        )
        is_different_round_max = (
            active_battle_report
            and round_start["max"] != active_battle_report.data["rounds"]
        )

        if (
            is_different_type
            or is_different_round_max
            or is_earlier_round(round_start["current"])
        ):
            active_battle.update(active=False).execute()
            active_battle = Battle.create(active=True)

            active_battle_report = BattleReport.create(
                type="meta",
                data=dict(
                    battle_type=round_start["battle_type"],
                    rounds=round_start["max"],
                ),
                battle=active_battle,
            )
        elif active_battle_report is None:
            active_battle_report = BattleReport.create(
                type="meta",
                data=dict(
                    battle_type=round_start["event_type"], rounds=round_start["max"]
                ),
                battle=active_battle,
            )

    # Get largest turn index
    turn_idx_start = (
        Turn.select()
        .join(Battle)
        .where(Battle.id == active_battle.id)
        .order_by(Turn.idx.desc())
        .first()
    )
    turn_idx_start = turn_idx_start.idx if turn_idx_start else -1

    # Get largest event index
    last_ev_idx = (
        Event.select()
        .join(Turn)
        .join(Battle)
        .where(Battle.id == active_battle.id)
        .order_by(Event.idx.desc())
        .first()
    )
    last_ev_idx = last_ev_idx.idx if last_ev_idx else -1

    # Append events to db
    current_turn = None
    current_turn_idx = None
    for i, event, line in zip(turn_inds, events, lines):
        turn_idx = turn_idx_start + i + 1

        if event is None:
            print(f"WARNING: Failed to parse line [{line}]")
            continue

        # Get turn to append to
        if current_turn_idx != turn_idx:
            current_turn = Turn.create(
                idx=turn_idx, time=turn_logs[i].time, battle=active_battle
            )
            current_turn_idx = turn_idx

        # Compress data
        for k in event.keys():
            if k not in active_battle._key_map:
                active_battle._key_map.append(k)
                active_battle.save()
        event_data = {active_battle._key_map.index(k): v for k, v in event.items()}

        # Append
        ev = Event.create(
            idx=last_ev_idx + 1,
            type=event["event_type"],
            data=event_data,
            turn=current_turn,
            battle=active_battle,
        )
        last_ev_idx += 1

    # Append events to file
    out_file = paths.BATTLE_LOG_DIR / f"{active_battle.id}.hv"
    with open(out_file, "a") as file:
        turns = [t.json() for t in turn_logs]
        file.write("\n".join(turns) + "\n")

    # Receive raw log
    # Parse into event
    # If...
    #   No prev log -> create log
    #   Is new log  -> create log
    #   Else        -> noop
    # Append into db
    # Append into file
    # Update report

    # Storage format
    # HEADER {
    #   id: ...
    #   created: ...
    #   meta: ... health, level, stuff when battle started but not contained in logs
    # }
    # TURN {
    #   time: ... optional
    #   lines: [...]
    #   meta: ... battle state?
    # }

    # DB schema
    #
    # Battle:
    #   id              created         type        rounds      active      meta
    #   INTEGER         REAL            TEXT        INTEGER     BOOL        JSON
    #   PRIMARY KEY     NOT NULL        NOT NULL    NOT NULL    NOT NULL
    #
    # Turn:
    #   id              battle_id       meta        time
    #   INTEGER         INTEGER         JSON        REAL
    #   PRIMARY KEY     FOREIGN KEY
    #                   PRIMARY KEY
    #
    # Event:
    #   id             turn_id         battle_id       type         data
    #   INTEGER        INTEGER         INTEGER         TEXT         JSON
    #   PRIMARY KEY    PRIMARY KEY     PRIMARY KEY     NOT NULL     NOT NULL
    #                                  FOREIGN KEY
    # Report:
    #   battle_id       type            data
    #   INTEGER         TEXT            JSON
    #   PRIMARY KEY     PRIMARY KEY     NOT NULL

    # Report generator
    # How to allow custom user parser?
    #   JS allowed?
    # Where do generators go?

    # Cases


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
