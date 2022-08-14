import json
from config import paths
from peewee import *
from playhouse.sqlite_ext import JSONField, SqliteExtDatabase
import uuid
import zlib

db = SqliteExtDatabase(paths.DB_FILE)

# import logging

# logger = logging.getLogger("peewee")
# logger.setLevel(logging.DEBUG)
# logger.addHandler(logging.StreamHandler())


class CompressedJsonField(BlobField):
    def db_value(self, value: dict | list):
        return zlib.compress(json.dumps(value).encode())

    def python_value(self, value):
        return json.loads(zlib.decompress(value))


class BaseModel(Model):
    class Meta:
        database = db


class Battle(BaseModel):
    pk = CharField(default=lambda: uuid.uuid4().hex)

    active = BooleanField()
    time = FloatField(default=0)
    data = CompressedJsonField(default=list)
    unparsed = JSONField(default=list)
    meta = JSONField(default=dict)


class ActiveBattleTurn(BaseModel):
    pk = AutoField()

    events = JSONField()
    meta = JSONField(default=dict)
    time = FloatField()

    battle = ForeignKeyField(Battle, backref="turns")


class BattleReport(BaseModel):
    pk = AutoField()

    data = JSONField(default=dict)
    finalized = BooleanField(default=False)
    state = JSONField(default=dict)
    type = CharField()

    battle = ForeignKeyField(Battle, backref="reports")


db.create_tables([Battle, ActiveBattleTurn, BattleReport])
