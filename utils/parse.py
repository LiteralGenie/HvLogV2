from javascript import require

ParserModule = require("../classes/parser.js")
PARSERS = [ParserModule.PARSERS[x] for x in ParserModule.PARSERS]


def parse_events(lines: list[str], batch_size=1000):
    batches = [lines[i : i + batch_size] for i in range(0, len(lines), batch_size)]

    events = [event for batch in batches for event in ParserModule.parse_events(batch)]
    events = [{k: ev[k] for k in ev} if ev else None for ev in events]

    return events
