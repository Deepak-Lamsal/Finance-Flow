// ----- Categories (fixed list) -----
const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Education",
  "Shopping",
  "Entertainment",
  "Internet & Bills",
  "Healthcare",
  "Other",
];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Gift", "Other"];

// ----- Grab the elements we need -----
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const openButton = document.getElementById("add-button");
const closeButton = document.getElementById("close-modal");
const form = document.getElementById("transaction-form");
const categorySelect = document.getElementById("category-select");
const formError = document.getElementById("form-error");
const txList = document.getElementById("tx-list");

const monthPicker = document.getElementById("month-picker");
const expenseNote = document.getElementById("expense-note");

const incomeValue = document.getElementById("income-value");
const expenseValue = document.getElementById("expense-value");
const balanceValue = document.getElementById("balance-value");
const savingsValue = document.getElementById("savings-value");

// Keep the loaded transactions here so Edit can find them
let transactions = [];

// Today's date in YYYY-MM-DD using the computer's local time
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// The month being viewed. Starts as the current month, e.g. "2026-11"
let selectedMonth = todayString().slice(0, 7);
monthPicker.value = selectedMonth;

// ----- Helpers -----
function fillCategories(type, selected) {
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  categorySelect.innerHTML = "";

  for (const name of list) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  }

  if (selected) categorySelect.value = selected;
}

function formatMoney(amount) {
  const sign = amount < 0 ? "-" : "";
  return sign + "NPR " + Math.abs(amount).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function selectedParts() {
  const [year, month] = selectedMonth.split("-").map(Number);
  return { year, month };
}

// ----- Open and close the popup -----
function openModal(transaction) {
  form.reset();
  formError.hidden = true;

  if (transaction) {
    // Edit mode: fill the form with the existing values
    modalTitle.textContent = "Edit Transaction";
    form.elements.id.value = transaction.id;
    form.elements.type.value = transaction.type;
    form.elements.title.value = transaction.title;
    form.elements.amount.value = transaction.amount;
    form.elements.date.value = transaction.date;
    fillCategories(transaction.type, transaction.category);
  } else {
    // Add mode: empty form with today's date
    modalTitle.textContent = "Add Transaction";
    form.elements.id.value = "";
    form.elements.date.value = todayString();
    fillCategories("expense");
  }

  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

openButton.addEventListener("click", () => openModal());
closeButton.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

form.addEventListener("change", (event) => {
  if (event.target.name === "type") {
    fillCategories(event.target.value);
  }
});

// ----- Draw the transaction list -----
function renderTransactions() {
  txList.innerHTML = "";

  if (transactions.length === 0) {
    txList.innerHTML = '<li class="tx-empty">No transactions yet. Add your first one!</li>';
    return;
  }

  // Show only the 8 most recent
  for (const tx of transactions.slice(0, 8)) {
    const isIncome = tx.type === "income";
    const sign = isIncome ? "+" : "-";

    const item = document.createElement("li");
    item.className = "tx-item";
    item.innerHTML = `
      <div class="tx-info">
        <p class="tx-title"></p>
        <p class="tx-meta"></p>
      </div>
      <p class="tx-amount ${isIncome ? "income" : "expense"}">
        ${sign}${formatMoney(tx.amount)}
      </p>
      <div class="tx-actions">
        <button type="button" class="tx-btn" data-action="edit" data-id="${tx.id}">Edit</button>
        <button type="button" class="tx-btn tx-btn-danger" data-action="delete" data-id="${tx.id}">Delete</button>
      </div>
    `;

    // textContent (not innerHTML) so titles can never inject HTML
    item.querySelector(".tx-title").textContent = tx.title;
    item.querySelector(".tx-meta").textContent = `${tx.category} • ${formatDate(tx.date)}`;

    txList.appendChild(item);
  }
}

// ----- "12% more than last month" under Total Expenses -----
function showComparison(current, previous) {
  expenseNote.className = "card-note";

  if (previous === 0) {
    expenseNote.textContent = "No spending last month to compare";
    return;
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.abs(change).toFixed(0);

  if (change > 0) {
    expenseNote.textContent = `▲ ${rounded}% more than last month`;
    expenseNote.classList.add("up");
  } else if (change < 0) {
    expenseNote.textContent = `▼ ${rounded}% less than last month`;
    expenseNote.classList.add("down");
  } else {
    expenseNote.textContent = "Same as last month";
  }
}

// ----- Fill the four summary cards -----
async function loadSummary() {
  try {
    const { year, month } = selectedParts();
    const summary = await getSummary(month, year);

    incomeValue.textContent = formatMoney(summary.total_income);
    expenseValue.textContent = formatMoney(summary.total_expenses);
    balanceValue.textContent = formatMoney(summary.remaining_balance);
    savingsValue.textContent = formatMoney(summary.monthly_savings);

    balanceValue.classList.toggle("negative", summary.remaining_balance < 0);
    savingsValue.classList.toggle("negative", summary.monthly_savings < 0);

       showComparison(summary.total_expenses, summary.previous_expenses);
  } catch (error) {
    console.error(error);
    incomeValue.textContent = "-";
    expenseValue.textContent = "-";
    balanceValue.textContent = "-";
    savingsValue.textContent = "-";
  }
}

// ----- Load data from the backend -----
async function loadTransactions() {
  try {
    transactions = await getTransactions();
    renderTransactions();
  } catch (error) {
    txList.innerHTML = '<li class="tx-empty">Could not load transactions. Is the server running?</li>';
  }

  await loadSummary();

  const { year, month } = selectedParts();
  await updateCharts(month, year);
}

// ----- Edit and Delete buttons (one listener for the whole list) -----
txList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = Number(button.dataset.id);

  if (button.dataset.action === "edit") {
    const tx = transactions.find((t) => t.id === id);
    if (tx) openModal(tx);
  }

  if (button.dataset.action === "delete") {
    if (!confirm("Delete this transaction?")) return;

    try {
      await deleteTransaction(id);
      await loadTransactions();
    } catch (error) {
      alert(error.message);
    }
  }
});

// ----- Save the transaction (add or edit) -----
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const id = formData.get("id");
  const data = {
    type: formData.get("type"),
    title: formData.get("title").trim(),
    amount: parseFloat(formData.get("amount")),
    category: formData.get("category"),
    date: formData.get("date"),
  };

  try {
    if (id) {
      await updateTransaction(id, data);
    } else {
      await createTransaction(data);
    }
    closeModal();
    await loadTransactions();
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  }
});

// ----- Month picker: reload everything when the month changes -----
monthPicker.addEventListener("change", () => {
  if (!monthPicker.value) return; // ignore if the field was cleared
  selectedMonth = monthPicker.value;
  loadTransactions();
});

// ----- Start: load data when the page opens -----
loadCurrency().then(loadTransactions);