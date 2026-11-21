const currencySelect = document.getElementById("currency-select");
const preview = document.getElementById("preview");
const saveButton = document.getElementById("save-settings");
const message = document.getElementById("settings-message");

function updatePreview() {
  currentCurrency = currencySelect.value;
  preview.textContent = formatMoney(12500.5);
}

currencySelect.addEventListener("change", updatePreview);

saveButton.addEventListener("click", async () => {
  try {
    await saveSettings({ currency: currencySelect.value });
    message.textContent = "Saved!";
  } catch (error) {
    message.textContent = error.message;
  }
  message.hidden = false;
});

async function start() {
  await loadCurrency();
  currencySelect.value = currentCurrency;
  updatePreview();
}

start();