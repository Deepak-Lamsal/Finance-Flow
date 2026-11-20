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

async function getTransactions(filters = {}) {
  const params = new URLSearchParams();

  // Only add filters that have a value
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.append(key, value);
  }

  const query = params.toString();
  const url = query ? `${API_URL}/transactions?${query}` : `${API_URL}/transactions`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load transactions");
  }

  return response.json();
}
async function updateTransaction(id, data) {
  const response = await fetch(`${API_URL}/transactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Could not update the transaction");
  }

  return response.json();
}

async function deleteTransaction(id) {
  const response = await fetch(`${API_URL}/transactions/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Could not delete the transaction");
  }
}
async function getSummary(month, year) {
  let url = `${API_URL}/summary`;
  if (month && year) {
    url += `?month=${month}&year=${year}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load the summary");
  }

  return response.json();
}
async function getChartData(month, year) {
  let url = `${API_URL}/chart-data`;
  if (month && year) {
    url += `?month=${month}&year=${year}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Could not load chart data");
  }

  return response.json();
}