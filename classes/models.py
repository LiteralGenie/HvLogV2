import logging
import time
from config import paths
from peewee import *
from playhouse.sqlite_ext import JSONField, SqliteExtDatabase

db = SqliteExtDatabase(paths.DB_FILE)


# logger = logging.getLogger("peewee")
# logger.setLevel(logging.DEBUG)
# logger.addHandler(logging.StreamHandler())


class BaseModel(Model):
    class Meta:
        database = db


class Battle(BaseModel):
    id = AutoField()

    created = FloatField(default=time.time)
    active = BooleanField()
    meta = JSONField(null=True)

    _key_map = JSONField(default=list)


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

    _parsed_data = None

    @property
    def parsed_data(self):
        if self._parsed_data is None:
            self._parsed_data = {
                self.battle._key_map[int(i)]: v for i, v in self.data.items()
            }
        return self._parsed_data


class BattleReport(BaseModel):
    id = AutoField()

    type = CharField()
    data = JSONField()

    battle = ForeignKeyField(Battle, backref="reports")


db.create_tables([Battle, Turn, Event, BattleReport])
