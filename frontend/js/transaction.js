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

// ----- Elements -----
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const openButton = document.getElementById("add-button");
const closeButton = document.getElementById("close-modal");
const form = document.getElementById("transaction-form");
const categorySelect = document.getElementById("category-select");
const formError = document.getElementById("form-error");
const txList = document.getElementById("tx-list");
const resultCount = document.getElementById("result-count");

const filterSearch = document.getElementById("filter-search");
const filterType = document.getElementById("filter-type");
const filterCategory = document.getElementById("filter-category");
const filterFrom = document.getElementById("filter-from");
const filterTo = document.getElementById("filter-to");
const filterClear = document.getElementById("filter-clear");

let transactions = [];

// ----- Helpers -----
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatMoney(amount) {
  const sign = amount < 0 ? "-" : "";
  return sign + "NPR " + Math.abs(amount).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

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

// The filter dropdown lists every category once (income + expense)
function fillFilterCategories() {
  const all = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];
  for (const name of all) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    filterCategory.appendChild(option);
  }
}

// ----- Popup -----
function openModal(transaction) {
  form.reset();
  formError.hidden = true;

  if (transaction) {
    modalTitle.textContent = "Edit Transaction";
    form.elements.id.value = transaction.id;
    form.elements.type.value = transaction.type;
    form.elements.title.value = transaction.title;
    form.elements.amount.value = transaction.amount;
    form.elements.date.value = transaction.date;
    fillCategories(transaction.type, transaction.category);
  } else {
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
  if (event.target.name === "type") fillCategories(event.target.value);
});

// ----- Draw the list -----
function renderTransactions() {
  txList.innerHTML = "";
  resultCount.textContent = `${transactions.length} result${transactions.length === 1 ? "" : "s"}`;

  if (transactions.length === 0) {
    txList.innerHTML = '<li class="tx-empty">No transactions match your filters.</li>';
    return;
  }

  for (const tx of transactions) {
    const isIncome = tx.type === "income";
    const sign = isIncome ? "+" : "-";

    const item = document.createElement("li");
    item.className = "tx-item";
    item.innerHTML = `
      <div class="tx-info">
        <p class="tx-title"></p>
        <p class="tx-meta"></p>
      </div>
      <p class="tx-amount ${isIncome ? "income" : "expense"}">${sign}${formatMoney(tx.amount)}</p>
      <div class="tx-actions">
        <button type="button" class="tx-btn" data-action="edit" data-id="${tx.id}">Edit</button>
        <button type="button" class="tx-btn tx-btn-danger" data-action="delete" data-id="${tx.id}">Delete</button>
      </div>
    `;

    item.querySelector(".tx-title").textContent = tx.title;
    item.querySelector(".tx-meta").textContent = `${tx.category} • ${formatDate(tx.date)}`;

    txList.appendChild(item);
  }
}

// ----- Load with the current filters -----
async function loadTransactions() {
  const filters = {
    search: filterSearch.value.trim(),
    type: filterType.value,
    category: filterCategory.value,
    date_from: filterFrom.value,
    date_to: filterTo.value,
  };

  try {
    transactions = await getTransactions(filters);
    renderTransactions();
  } catch (error) {
    txList.innerHTML = '<li class="tx-empty">Could not load transactions. Is the server running?</li>';
  }
}

// Wait until the person stops typing before searching (less server traffic)
let searchTimer;
filterSearch.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadTransactions, 300);
});

for (const element of [filterType, filterCategory, filterFrom, filterTo]) {
  element.addEventListener("change", loadTransactions);
}

filterClear.addEventListener("click", () => {
  filterSearch.value = "";
  filterType.value = "";
  filterCategory.value = "";
  filterFrom.value = "";
  filterTo.value = "";
  loadTransactions();
});

// ----- Edit and Delete -----
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

// ----- Save (add or edit) -----
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
// If the page was opened as transactions.html?type=income, pre-select the filter
const urlType = new URLSearchParams(window.location.search).get("type");
if (urlType === "income" || urlType === "expense") {
  filterType.value = urlType;
}

// ----- Start -----
fillFilterCategories();
loadCurrency().then(loadTransactions);