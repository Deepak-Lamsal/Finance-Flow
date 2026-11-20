from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

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
@app.put("/api/transactions/{transaction_id}", response_model=TransactionOut)
def update_transaction(transaction_id: int, transaction: TransactionCreate):
    conn = get_connection()

    # First check the record exists
    existing = conn.execute(
        "SELECT id FROM transactions WHERE id = ?", (transaction_id,)
    ).fetchone()

    if existing is None:
        conn.close()
        raise HTTPException(status_code=404, detail="Transaction not found")

    conn.execute(
        """
        UPDATE transactions
        SET type = ?, title = ?, amount = ?, category = ?, date = ?
        WHERE id = ?
        """,
        (
            transaction.type,
            transaction.title,
            transaction.amount,
            transaction.category,
            transaction.date.isoformat(),
            transaction_id,
        ),
    )
    conn.commit()

    row = conn.execute(
        "SELECT * FROM transactions WHERE id = ?", (transaction_id,)
    ).fetchone()
    conn.close()

    return dict(row)


@app.delete("/api/transactions/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int):
    conn = get_connection()

    cursor = conn.execute(
        "DELETE FROM transactions WHERE id = ?", (transaction_id,)
    )
    conn.commit()
    conn.close()

    # rowcount = how many rows were deleted. 0 means that id didn't exist
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")

# Serve the frontend files (HTML, CSS, JS)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")