import json
import time
import uuid
import zlib

import zpaq
from config import paths
from peewee import *
from playhouse.fields import CompressedField
from playhouse.sqlite_ext import JSONField, SqliteExtDatabase

db = SqliteExtDatabase(paths.DB_FILE)

# import logging
# logger = logging.getLogger("peewee")
# logger.setLevel(logging.DEBUG)
# logger.addHandler(logging.StreamHandler())


class CustomField(BlobField):
    """https://gist.github.com/rosscdh/f4f26758b0228f475b132c688f15af2b"""

    def db_value(self, value):
        return zpaq.compress(json.dumps(value).encode()) if value else None
        # return value if value is None else json.dumps(value)

    def python_value(self, value):
        return json.loads(zpaq.decompress(value)) if value else None
        # return value if value is None else json.loads(value)


class BaseModel(Model):
    class Meta:
        database = db


class Battle(BaseModel):
    # id = CharField(primary_key=True, default=lambda: uuid.uuid4().hex)
    id = AutoField()

    created = FloatField(default=time.time)
    type = CharField(null=True)
    rounds = IntegerField(null=True)
    active = BooleanField()
    meta = JSONField(null=True)


# No unique constraint on (idx, battle) because peewee doesnt like composite keys
class Turn(BaseModel):
    idx = IntegerField()

    time = FloatField(null=True)
    meta = JSONField(null=True)

    battle = ForeignKeyField(Battle, backref="turns")


# No unique constraint on (idx, turn) because peewee doesnt like composite keys
class Event(BaseModel):
    idx = IntegerField()

    type = CharField()
    data = JSONField()

    turn = ForeignKeyField(Turn, backref="events")
    battle = ForeignKeyField(Battle, backref="events")


db.create_tables([Battle, Turn, Event])
