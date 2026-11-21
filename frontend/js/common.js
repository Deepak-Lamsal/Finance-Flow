// Shared by every page. Must load right after api.js.

let currentCurrency = "NPR";

const CURRENCY_LABELS = {
  NPR: "NPR",
  USD: "$",
  EUR: "€",
  INR: "₹",
  GBP: "£",
};

async function loadCurrency() {
  try {
    const settings = await getSettings();
    currentCurrency = settings.currency || "NPR";
  } catch (error) {
    currentCurrency = "NPR";
  }
}

function formatMoney(amount) {
  const sign = amount < 0 ? "-" : "";
  const symbol = CURRENCY_LABELS[currentCurrency] || currentCurrency;
  const gap = symbol.length > 1 ? " " : ""; // "NPR 500" but "$500"
  return sign + symbol + gap + Math.abs(amount).toLocaleString("en-US", { maximumFractionDigits: 2 });
}