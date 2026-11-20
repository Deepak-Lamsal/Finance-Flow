// All communication with the backend lives in this file.
const API_URL = "/api";

async function createTransaction(data) {
  const response = await fetch(`${API_URL}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Could not save the transaction");
  }

  return response.json();
}

async function getTransactions() {
  const response = await fetch(`${API_URL}/transactions`);

  if (!response.ok) {
    throw new Error("Could not load transactions");
  }

  return response.json();
}