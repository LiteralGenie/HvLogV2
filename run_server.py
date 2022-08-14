import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from classes.models import ActiveBattleTurn, Battle, BattleReport
from classes.types import RawTurnLog
from utils.parse import log_turns

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/logs")
async def post_logs(raw_logs: list[RawTurnLog]):
    log_turns(raw_logs)


@app.get("/ids")
def get_ids():
    battles = Battle.select()
    pks = [b.pk for b in battles]
    return pks


@app.get("/reports/{id}")
def get_reports(id: str):
    reports: list[BattleReport] = (
        BattleReport.select().join(Battle).where(Battle.pk == id)
    )
    result: dict[str, BattleReport] = {rpt.type: rpt.data for rpt in reports}
    return result


@app.get("/events/{id}")
def get_events(id: str):
    battle: Battle = Battle.select().where(Battle.pk == id).first()

    if battle.active:
        events = [turn.events for turn in ActiveBattleTurn.select()]
        print("here", events)
    else:
        events = battle.data

    return events


@app.post("/search/logs")
def post_search_logs():
    pass


if __name__ == "__main__":
    uvicorn.run(
        "run_server:app",
        host="0.0.0.0",
        port=9999,
        workers=1,
        log_level="debug",
        reload=True,
    )
