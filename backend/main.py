from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
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
def list_transactions(
    type: str | None = Query(None, pattern="^(income|expense)$"),
    category: str | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    # Build the SQL step by step: start with "everything",
    # then add one condition for each filter that was provided.
    sql = "SELECT * FROM transactions WHERE 1=1"
    params = []

    if type:
        sql += " AND type = ?"
        params.append(type)
    if category:
        sql += " AND category = ?"
        params.append(category)
    if search:
        sql += " AND title LIKE ?"
        params.append(f"%{search}%")
    if date_from:
        sql += " AND date >= ?"
        params.append(date_from)
    if date_to:
        sql += " AND date <= ?"
        params.append(date_to)

    sql += " ORDER BY date DESC, id DESC"

    conn = get_connection()
    rows = conn.execute(sql, params).fetchall()
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


def totals_by_type(rows):
    """Turn SQL rows into {'income': 0, 'expense': 0} totals."""
    totals = {"income": 0.0, "expense": 0.0}
    for row in rows:
        totals[row["type"]] = row["total"]
    return totals


@app.get("/api/summary")
def get_summary(
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2000, le=2100),
):
    today = date.today()
    month = month or today.month
    year = year or today.year
    prefix = f"{year:04d}-{month:02d}"

    # Previous month, handling the January -> December rollover
    if month == 1:
        prev_prefix = f"{year - 1:04d}-12"
    else:
        prev_prefix = f"{year:04d}-{month - 1:02d}"

    conn = get_connection()

    month_rows = conn.execute(
        """
        SELECT type, SUM(amount) AS total
        FROM transactions
        WHERE substr(date, 1, 7) = ?
        GROUP BY type
        """,
        (prefix,),
    ).fetchall()

    all_rows = conn.execute(
        "SELECT type, SUM(amount) AS total FROM transactions GROUP BY type"
    ).fetchall()

    prev_row = conn.execute(
        """
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM transactions
        WHERE type = 'expense' AND substr(date, 1, 7) = ?
        """,
        (prev_prefix,),
    ).fetchone()
    conn.close()

    month_totals = totals_by_type(month_rows)
    all_totals = totals_by_type(all_rows)

    return {
        "month": month,
        "year": year,
        "total_income": round(month_totals["income"], 2),
        "total_expenses": round(month_totals["expense"], 2),
        "monthly_savings": round(month_totals["income"] - month_totals["expense"], 2),
        "remaining_balance": round(all_totals["income"] - all_totals["expense"], 2),
        "previous_expenses": round(prev_row["total"], 2),
    }
@app.get("/api/chart-data")
def get_chart_data(
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None, ge=2000, le=2100),
):
    today = date.today()
    month = month or today.month
    year = year or today.year

    conn = get_connection()

    # --- Last 6 months, ending at the selected month ---
    months = []
    y, m = year, month
    for _ in range(6):
        months.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    months.reverse()  # oldest first

    trend_rows = conn.execute(
        """
        SELECT substr(date, 1, 7) AS month, type, SUM(amount) AS total
        FROM transactions
        WHERE substr(date, 1, 7) >= ? AND substr(date, 1, 7) <= ?
        GROUP BY month, type
        """,
        (months[0], months[-1]),
    ).fetchall()

    income = {key: 0.0 for key in months}
    expenses = {key: 0.0 for key in months}
    for row in trend_rows:
        target = income if row["type"] == "income" else expenses
        target[row["month"]] = row["total"]

    # --- Expense categories for the selected month ---
    category_rows = conn.execute(
        """
        SELECT category, SUM(amount) AS total
        FROM transactions
        WHERE type = 'expense' AND substr(date, 1, 7) = ?
        GROUP BY category
        ORDER BY total DESC
        """,
        (months[-1],),
    ).fetchall()
    conn.close()

    return {
        "months": months,
        "income": [round(income[k], 2) for k in months],
        "expenses": [round(expenses[k], 2) for k in months],
        "categories": [row["category"] for row in category_rows],
        "category_totals": [round(row["total"], 2) for row in category_rows],
    }
ALLOWED_CURRENCIES = ["NPR", "USD", "EUR", "INR", "GBP"]


class SettingsUpdate(BaseModel):
    currency: str


@app.get("/api/settings")
def get_settings():
    conn = get_connection()
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {row["key"]: row["value"] for row in rows}


@app.put("/api/settings")
def update_settings(settings: SettingsUpdate):
    if settings.currency not in ALLOWED_CURRENCIES:
        raise HTTPException(status_code=422, detail="Unsupported currency")

    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('currency', ?)",
        (settings.currency,),
    )
    conn.commit()
    conn.close()
    return {"currency": settings.currency}

# Serve the frontend files (HTML, CSS, JS)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")