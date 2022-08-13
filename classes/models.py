import json
import logging
import time
from config import paths
from peewee import *
from playhouse.sqlite_ext import JSONField, SqliteExtDatabase
import uuid
import zpaq

db = SqliteExtDatabase(paths.DB_FILE)


# logger = logging.getLogger("peewee")
# logger.setLevel(logging.DEBUG)
# logger.addHandler(logging.StreamHandler())


class CompressedJsonField(BlobField):
    def db_value(self, value: dict | list):
        return zpaq.compress(json.dumps(value).encode())

    def python_value(self, value):
        return json.loads(zpaq.decompress(value))


class BaseModel(Model):
    class Meta:
        database = db


class Battle(BaseModel):
    pk = CharField(default=lambda: uuid.uuid4().hex)
    idx = CharField(default=lambda: uuid.uuid4().hex)

    active = BooleanField()
    created = FloatField(default=time.time)
    data = CompressedJsonField(default=list)
    unparsed = JSONField(default=list)
    meta = JSONField(null=True)


class ActiveBattleTurn(BaseModel):
    pk = AutoField()

    events = JSONField()
    meta = JSONField(null=True)

    battle = ForeignKeyField(Battle, backref="turns")


class BattleReport(BaseModel):
    pk = AutoField()

    type = CharField()
    data = JSONField()

    battle = ForeignKeyField(Battle, backref="reports")


db.create_tables([Battle, ActiveBattleTurn, BattleReport])
