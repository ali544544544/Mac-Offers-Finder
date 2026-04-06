const sourceFilter = document.getElementById("sourceFilter");
const modelFilter = document.getElementById("modelFilter");
const maxPriceFilter = document.getElementById("maxPriceFilter");
const minRamFilter = document.getElementById("minRamFilter");
const minStorageFilter = document.getElementById("minStorageFilter");

const bestOfferEl = document.getElementById("bestOffer");
const offersEl = document.getElementById("offers");
const metaEl = document.getElementById("meta");

let allOffers = [];

function euro(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function fillSelect(select, values) {
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function passesFilters(offer) {
  if (sourceFilter.value && offer.sourceKey !== sourceFilter.value) return false;
  if (modelFilter.value && offer.model !== modelFilter.value) return false;
  if (maxPriceFilter.value && offer.price > Number(maxPriceFilter.value)) return false;
  if (minRamFilter.value && (offer.ramGb ?? 0) < Number(minRamFilter.value)) return false;
  if (minStorageFilter.value && (offer.storageGb ?? 0) < Number(minStorageFilter.value)) return false;
  return true;
}

function renderOfferCard(offer) {
  return `
    <article class="offer-card">
      <h3>${offer.title}</h3>
      <p><strong>Preis:</strong> ${euro(offer.price)}</p>
      <p><strong>Quelle:</strong> ${offer.vendor}</p>
      <p><strong>Modell:</strong> ${offer.model ?? "-"}</p>
      <p><strong>Chip:</strong> ${offer.chip ?? "-"}</p>
      <p><strong>RAM:</strong> ${offer.ramGb ?? "-"} GB</p>
      <p><strong>SSD:</strong> ${offer.storageGb ?? "-"} GB</p>
      <p><strong>Score:</strong> ${offer.valueScore}</p>
      <p><a href="${offer.link}" target="_blank" rel="noopener noreferrer">Zum Angebot</a></p>
    </article>
  `;
}

function render() {
  const filtered = allOffers
    .filter(passesFilters)
    .sort((a, b) => b.valueScore - a.valueScore);

  metaEl.textContent = `${filtered.length} Angebote gefunden`;

  if (filtered.length > 0) {
    bestOfferEl.innerHTML = renderOfferCard(filtered[0]);
  } else {
    bestOfferEl.innerHTML = "<p>Kein passendes Angebot gefunden.</p>";
  }

  offersEl.innerHTML = filtered.map(renderOfferCard).join("");
}

async function init() {
  const response = await fetch("./data/offers.json");
  const data = await response.json();
  allOffers = data.offers ?? [];

  fillSelect(sourceFilter, unique(allOffers.map((o) => o.sourceKey)));
  fillSelect(modelFilter, unique(allOffers.map((o) => o.model)));

  [sourceFilter, modelFilter, maxPriceFilter, minRamFilter, minStorageFilter]
    .forEach((el) => el.addEventListener("input", render));

  render();
}

init();
