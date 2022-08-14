import re
from classes.types import Turn
from .base import Reporter


class TotalGains(Reporter):
    type = "TotalGains"

    def next_turn(self, turn: Turn) -> None:
        def add(name: str, quantity: float, default=0):
            target = self.data
            target.setdefault(name, default)
            target[name] += quantity

        for ev in turn["events"]:
            ev_type = ev["event_type"]
            match ev_type:
                case "DROP":
                    if m := re.match(r"(\d+)x? (.*)", ev["item"]):
                        [quant, name] = m.groups()
                        add(name, int(quant))
                    else:
                        add(ev["item"], 1)
                case "GEM":
                    add(ev["type"], 1)
                case "CREDITS":
                    add("Credits", ev["value"])
                case "PROFICIENCY":
                    add(ev["type"], ev["value"])
                case "EXPERIENCE":
                    add("Experience", ev["value"])
                case "AUTO_SALVAGE":
                    add(ev["item"], ev["value"])
                case "CREDITS" | "AUTO_SELL":
                    add("Salvage Credits", ev["value"])
                case "TOKEN_BONUS" | "EVENT_ITEM":
                    add(ev["item"], 1)


class Time(Reporter):
    type = "Time"

    _max_gap = 10
    "For averaging purposes, time gaps btwn turns are capped at this threshold"

    def next_turn(self, turn: Turn) -> None:
        self.data.setdefault("count", 0)  # Number of turns
        self.data.setdefault("total", 0)  # Total time elapsed
        self.data.setdefault("total_capped", 0)  # Total time with time gaps clipped
        self.state.setdefault("last_turn_time", None)  # Timestamp of previous turn

        # Update data and state
        self.data["count"] += 1

        if self.state["last_turn_time"]:
            # If this is not the first turn..
            elapsed = turn["time"] - self.state["last_turn_time"]
            self.data["total"] += elapsed
            self.data["total_capped"] += min(elapsed, self._max_gap)
        else:
            self.data["total"] = 0
            self.data["total_capped"] = 0

        self.state["last_turn_time"] = turn["time"]


Reporters = {rptr.type: rptr for rptr in [TotalGains, Time]}
