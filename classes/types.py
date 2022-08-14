from typing import TypedDict

import pydantic


class RawTurnLog(pydantic.BaseModel):
    lines: list[str]
    time: float


class Turn(TypedDict):
    events: list[dict]
    time: float
