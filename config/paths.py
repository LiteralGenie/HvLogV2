from pathlib import Path


SRC_DIR = Path(__file__).parent.parent

DATA_DIR = SRC_DIR / "data"
CACHE_DIR = SRC_DIR / "cache"
CONFIG_DIR = SRC_DIR / "config"

BATTLE_LOG_DIR = DATA_DIR / "battle_logs"

DB_FILE = DATA_DIR / "db.sqlite"

for dir in [DATA_DIR, CACHE_DIR, CONFIG_DIR, BATTLE_LOG_DIR]:
    dir.mkdir(exist_ok=True)
