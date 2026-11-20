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
const openButton = document.querySelector(".btn-primary");
const closeButton = document.getElementById("close-modal");
const form = document.getElementById("transaction-form");
const categorySelect = document.getElementById("category-select");
const formError = document.getElementById("form-error");

// ----- Fill the category dropdown depending on income/expense -----
function fillCategories(type) {
  const list = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  categorySelect.innerHTML = "";

  for (const name of list) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  }
}

// ----- Open and close the popup -----
function openModal() {
  form.reset();
  form.elements.date.value = new Date().toISOString().slice(0, 10);
  fillCategories("expense");
  formError.hidden = true;
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
}

openButton.addEventListener("click", openModal);
closeButton.addEventListener("click", closeModal);

// Clicking the dark background also closes the popup
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

// Switching Expense/Income changes the category list
form.addEventListener("change", (event) => {
  if (event.target.name === "type") {
    fillCategories(event.target.value);
  }
});

// ----- Save the transaction -----
form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop the browser from reloading the page

  const formData = new FormData(form);
  const data = {
    type: formData.get("type"),
    title: formData.get("title").trim(),
    amount: parseFloat(formData.get("amount")),
    category: formData.get("category"),
    date: formData.get("date"),
  };

  try {
    await createTransaction(data);
    closeModal();
    console.log("Saved!", await getTransactions());
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  }
});