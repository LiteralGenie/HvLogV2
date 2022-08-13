import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from utils.log_turns import RawTurnLog, log_turns

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


if __name__ == "__main__":
    uvicorn.run(
        "run_server:app",
        host="0.0.0.0",
        port=9999,
        workers=1,
        log_level="debug",
        reload=True,
    )
