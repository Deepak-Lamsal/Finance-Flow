from fastapi import FastAPI
from database import init_db

app = FastAPI(title="FinanceFlow")

# Create the database tables when the server starts
init_db()


@app.get("/")
def read_root():
    return {"message": "Hello from FinanceFlow!"}