import datetime
from typing import Literal

from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    """What the frontend must send when creating a transaction."""
    type: Literal["income", "expense"]
    title: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    category: str = Field(min_length=1)
    date: datetime.date


class TransactionOut(TransactionCreate):
    """What the backend sends back: the same fields, plus id and created_at."""
    id: int
    created_at: str