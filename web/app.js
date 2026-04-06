const metaEl = document.getElementById("meta");
const bestOfferEl = document.getElementById("bestOffer");
const offersEl = document.getElementById("offers");
const offerCountEl = document.getElementById("offerCount");

const searchFilterEl = document.getElementById("searchFilter");
const sourceFilterEl = document.getElementById("sourceFilter");
const modelFilterEl = document.getElementById("modelFilter");
const maxPriceFilterEl = document.getElementById("maxPriceFilter");
const minRamFilterEl = document.getElementById("minRamFilter");
const minStorageFilterEl = document.getElementById("minStorageFilter");

let allOffers = [];

function euro(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(num);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function badge(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `<span class="badge"><strong>${esc(label)}:</strong> ${esc(value)}</span>`;
}

function renderOfferCard(offer, isBest = false) {
  return `
    <article class="offer-card ${isBest ? "best-card" : ""}">
      <div class="offer-card-top">
        <div class="offer-source">${esc(offer.vendor || offer.sourceKey || "-")}</div>
        <div class="offer-price">${euro(offer.price)}</div>
      </div>

      <h3 class="offer-title">${esc(offer.title || "Ohne Titel")}</h3>

      <div class="badges">
        ${badge("Modell", offer.model)}
        ${badge("Chip", offer.chip)}
        ${badge("RAM", offer.ramGb ? `${offer.ramGb} GB` : null)}
        ${badge("SSD", offer.storageGb ? `${offer.storageGb} GB` : null)}
        ${badge("Score", offer.valueScore)}
      </div>

      <div class="offer-details">
        <div><span>Quelle</span><strong>${esc(offer.sourceKey || "-")}</strong></div>
        <div><span>CPU</span><strong>${offer.cpuCores ?? "-"}</strong></div>
        <div><span>GPU</span><strong>${offer.gpuCores ?? "-"}</strong></div>
        <div><span>Jahr</span><strong>${offer.year ?? "-"}</strong></div>
      </div>

      <div class="offer-actions">
        <a class="offer-link" href="${offer.link || "#"}" target="_blank" rel="noopener noreferrer">
          Zum Angebot
        </a>
      </div>
    </article>
  `;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "de"));
}

function populateFilters(offers) {
  const currentSource = sourceFilterEl.value;
  const currentModel = modelFilterEl.value;

  sourceFilterEl.innerHTML = `<option value="">Alle</option>`;
  modelFilterEl.innerHTML = `<option value="">Alle</option>`;

  uniqueSorted(offers.map(o => o.sourceKey)).forEach((source) => {
    sourceFilterEl.innerHTML += `<option value="${esc(source)}">${esc(source)}</option>`;
  });

  uniqueSorted(offers.map(o => o.model)).forEach((model) => {
    modelFilterEl.innerHTML += `<option value="${esc(model)}">${esc(model)}</option>`;
  });

  sourceFilterEl.value = currentSource;
  modelFilterEl.value = currentModel;
}

function filteredOffers() {
  const search = (searchFilterEl.value || "").toLowerCase().trim();
  const source = sourceFilterEl.value;
  const model = modelFilterEl.value;
  const maxPrice = Number(maxPriceFilterEl.value || 0);
  const minRam = Number(minRamFilterEl.value || 0);
  const minStorage = Number(minStorageFilterEl.value || 0);

  return allOffers.filter((offer) => {
    if (!/macbook pro/i.test(offer.title || "")) return false;

    if (search) {
      const haystack = `${offer.title} ${offer.chip} ${offer.model} ${offer.vendor}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (source && offer.sourceKey !== source) return false;
    if (model && offer.model !== model) return false;
    if (maxPrice && Number(offer.price || 0) > maxPrice) return false;
    if (minRam && Number(offer.ramGb || 0) < minRam) return false;
    if (minStorage && Number(offer.storageGb || 0) < minStorage) return false;

    return true;
  });
}

function render() {
  const offers = filteredOffers().sort((a, b) => Number(b.valueScore || 0) - Number(a.valueScore || 0));

  if (offerCountEl) {
    offerCountEl.textContent = String(offers.length);
  }

  metaEl.textContent = `${offers.length} passende MacBook Pro Angebote`;

  if (!offers.length) {
    bestOfferEl.innerHTML = `<div class="empty-box">Keine Angebote passend zu den Filtern.</div>`;
    offersEl.innerHTML = "";
    return;
  }

  bestOfferEl.innerHTML = renderOfferCard(offers[0], true);
  offersEl.innerHTML = offers.map((offer) => renderOfferCard(offer)).join("");
}

async function init() {
  try {
    metaEl.textContent = "Lade Daten …";

    const response = await fetch("./data/offers.json?t=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`offers.json konnte nicht geladen werden (HTTP ${response.status})`);
    }

    const data = await response.json();

    allOffers = (Array.isArray(data.offers) ? data.offers : []).filter((offer) =>
      /macbook pro/i.test(offer.title || "")
    );

    populateFilters(allOffers);

    [
      searchFilterEl,
      sourceFilterEl,
      modelFilterEl,
      maxPriceFilterEl,
      minRamFilterEl,
      minStorageFilterEl
    ].forEach((el) => el.addEventListener("input", render));

    render();
  } catch (error) {
    console.error("Fehler in init():", error);
    metaEl.textContent = "Fehler beim Laden";
    bestOfferEl.innerHTML = `<div class="empty-box">${esc(error.message)}</div>`;
    offersEl.innerHTML = "";
  }
}

window.addEventListener("load", init);
