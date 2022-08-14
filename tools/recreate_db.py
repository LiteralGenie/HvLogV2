import json
from classes.models import Battle
from classes.types import RawTurnLog
from config import paths
from utils.parse import log_from_file, purge_battle


def main():
    for fp in list(paths.BATTLE_LOG_DIR.glob("*.hv")):
        target = fp.stem
        purge_battle(target)

        with open(paths.BATTLE_LOG_DIR / (target + ".hv")) as file:
            lines = file.readlines()
            data = [json.loads(l.strip()) for l in lines]

        meta = data[0]
        battle = Battle.create(
            pk=meta["pk"], data=data[1:], time=meta["time"], active=False
        )

        turns = [RawTurnLog(lines=x["lines"], time=x["time"]) for x in data[1:]]
        log_from_file(turns, battle)


if __name__ == "__main__":
    import cProfile

    cProfile.run("main()", "benchmark")

    import pstats

    pstats.Stats("benchmark").strip_dirs().sort_stats(
        pstats.SortKey.CUMULATIVE
    ).print_stats()
