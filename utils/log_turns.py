from typing import TypedDict
from pydantic import BaseModel

from classes.models import ActiveBattleTurn, Battle, BattleReport
from .parse import parse_events


class RawTurnLog(BaseModel):
    lines: list[str]
    time: int | None


class Turn(TypedDict):
    events: list[dict]
    time: int | None


def parse_turns(raw_logs: list[RawTurnLog]) -> tuple[list[Turn], list[str]]:
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


def get_active_battle(
    round_start_event: dict | None = None,
) -> tuple[Battle, BattleReport | None, bool]:
    is_new_battle = False

    def flush_active_turns(active_battle: Battle):
        turns = [
            dict(events=t.events, meta=t.meta)
            for t in ActiveBattleTurn.select().order_by(ActiveBattleTurn.pk)
        ]
        active_battle.data = turns

        ActiveBattleTurn.delete().execute()
        active_battle.save()

    def create_new_battle():
        # Compress old battle data
        Battle.update(active=False).execute()
        battle = Battle.create(active=True)

        nonlocal is_new_battle
        is_new_battle = True

        return battle

    # Get or create latest battle
    active_battle = Battle.get_or_none(Battle.active == True)
    if active_battle is None:
        active_battle = create_new_battle()

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
                flush_active_turns(active_battle)
                active_battle = create_new_battle()
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


def log_turns(raw_logs: list[RawTurnLog]):
    """
    Assumptions:
        -> All turn_logs are for the same battle
        -> At least one log starts with a ROUND_START event
    """

    from config import paths

    # Parse logs
    [turns, unparsed] = parse_turns(raw_logs)

    for line in unparsed:
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
    active_battle.unparsed += unparsed

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
