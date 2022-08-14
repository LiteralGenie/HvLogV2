from typing import TypedDict


class Turn(TypedDict):
    events: list[dict]
    time: float
