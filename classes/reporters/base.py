from dataclasses import dataclass
from typing import ClassVar, Optional
from venv import create
from classes.models import Battle, BattleReport
from classes.types import Turn


@dataclass
class Reporter:
    """
    Abstract class for summarizing a Battle
    """

    report: BattleReport

    type: ClassVar[str]
    "Name that should be unique between subclasses"

    @property
    def state(self) -> dict:
        """Dict used to calculate self.value and wiped after self.finalize()"""
        return self.report.state

    @property
    def data(self) -> dict:
        """Battle summary"""
        return self.report.data

    def next_turn(self, turn: Turn) -> None:
        """
        Update self.data on new turn
        """
        pass

    def finalize(self):
        """
        Wipes self.state when battle ends
        Override this if you need to perform some final calculation on self.data when the battle ends
        """
        self.report.finalized = True
        self.report.state = dict()
        self.report.save()

    @classmethod
    def get(cls, battle: Battle) -> Optional["Reporter"]:
        """
        Initialize instance from db data
        """
        report = (
            BattleReport.select()
            .where(BattleReport.type == cls.type)
            .join(Battle)
            .where(Battle.pk == battle.pk)
            .first()
        )
        if report is None:
            return None

        return cls(report)

    @classmethod
    def create(cls, battle: Battle) -> "Reporter":
        report = BattleReport.create(type=cls.type, battle=battle)
        return cls(report)
