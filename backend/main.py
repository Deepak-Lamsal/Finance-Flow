from fastapi import FastAPI

from database import get_connection, init_db
from schemas import TransactionCreate, TransactionOut

app = FastAPI(title="FinanceFlow")

# Create the database tables when the server starts
init_db()


@app.get("/")
def read_root():
    return {"message": "Hello from FinanceFlow!"}


@app.post("/api/transactions", response_model=TransactionOut, status_code=201)
def create_transaction(transaction: TransactionCreate):
    conn = get_connection()

    cursor = conn.execute(
        """
        INSERT INTO transactions (type, title, amount, category, date)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            transaction.type,
            transaction.title,
            transaction.amount,
            transaction.category,
            transaction.date.isoformat(),
        ),
    )
    conn.commit()

    # Read the saved record back so we can return it with its new id
    new_id = cursor.lastrowid
    row = conn.execute(
        "SELECT * FROM transactions WHERE id = ?", (new_id,)
    ).fetchone()
    conn.close()

    return dict(row)


@app.get("/api/transactions", response_model=list[TransactionOut])
def list_transactions():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM transactions ORDER BY date DESC, id DESC"
    ).fetchall()
    conn.close()

    return [dict(row) for row in rows]