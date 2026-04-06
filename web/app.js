const metaEl = document.getElementById("meta");
const bestOfferEl = document.getElementById("bestOffer");
const offersEl = document.getElementById("offers");
const offerCountEl = document.getElementById("offerCount");

// Filter and Sort Elements
const searchFilterEl = document.getElementById("searchFilter");
const sortFilterEl = document.getElementById("sortFilter");
const sourceFilterEl = document.getElementById("sourceFilter");
const modelFilterEl = document.getElementById("modelFilter");
const colorFilterEl = document.getElementById("colorFilter");
const maxPriceFilterEl = document.getElementById("maxPriceFilter");
const minRamFilterEl = document.getElementById("minRamFilter");
const minStorageFilterEl = document.getElementById("minStorageFilter");

// Theme Elements
const themeToggleBtn = document.getElementById("themeToggle");
const moonIcon = document.getElementById("moonIcon");
const sunIcon = document.getElementById("sunIcon");

let allOffers = [];

// --- Theme Logic ---
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "dark");
    moonIcon.style.display = "none";
    sunIcon.style.display = "block";
  } else {
    document.documentElement.removeAttribute("data-theme");
    moonIcon.style.display = "block";
    sunIcon.style.display = "none";
  }
}

themeToggleBtn.addEventListener("click", () => {
  const isDark = document.documentElement.hasAttribute("data-theme");
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    moonIcon.style.display = "block";
    sunIcon.style.display = "none";
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    moonIcon.style.display = "none";
    sunIcon.style.display = "block";
  }
});
initTheme();
// -------------------

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

function renderOfferCard(offer, isBest = false, index = 0) {
  const delay = Math.min(index * 0.05, 0.5);
  const score = (offer.valueScore || 0).toFixed(1);
  const scoreClass = offer.valueScore >= 40 ? "score-high" : offer.valueScore >= 20 ? "score-mid" : "score-low";

  return `
    <article class="offer-card ${isBest ? "best-card" : ""}" style="animation-delay: ${delay}s">

      <div class="offer-card-top">
        <div class="offer-source">${esc(offer.vendor || offer.sourceKey || "-")}</div>
        <div class="offer-score-pill ${scoreClass}">
          <span class="score-label">Score</span>
          <span class="score-value">${score}</span>
        </div>
      </div>

      <div class="offer-price-row">
        <div class="offer-price">${euro(offer.price)}</div>
        ${isBest ? `<div class="best-badge">🏆 Top Deal</div>` : ""}
      </div>

      <div class="offer-image-container">
        ${offer.imageUrl ? `<img src="${esc(offer.imageUrl)}" alt="${esc(offer.title)}" class="offer-image" loading="lazy">` : `<div class="offer-image-placeholder">💻</div>`}
      </div>

      <h3 class="offer-title">${esc(offer.title || "Ohne Titel")}</h3>

      <div class="spec-grid">
        <div class="spec-tile">
          <div class="spec-icon">💾</div>
          <div class="spec-info">
            <span class="spec-label">Chip</span>
            <strong class="spec-value">${esc(offer.chip || "-")}</strong>
          </div>
        </div>
        <div class="spec-tile">
          <div class="spec-icon">🧠</div>
          <div class="spec-info">
            <span class="spec-label">RAM</span>
            <strong class="spec-value">${offer.ramGb ? offer.ramGb + " GB" : "-"}</strong>
          </div>
        </div>
        <div class="spec-tile">
          <div class="spec-icon">💿</div>
          <div class="spec-info">
            <span class="spec-label">SSD</span>
            <strong class="spec-value">${offer.storageGb ? (offer.storageGb >= 1000 ? (offer.storageGb/1024).toFixed(offer.storageGb % 1024 === 0 ? 0 : 1) + " TB" : offer.storageGb + " GB") : "-"}</strong>
          </div>
        </div>
      </div>

      <div class="offer-details">
        <div><span>Zustand</span><strong>${esc(offer.condition || "-")}</strong></div>
        <div><span>Modell</span><strong>${esc(offer.model || "-")}</strong></div>
        <div><span>Farbe</span><strong>${esc(offer.color || "-")}</strong></div>
        <div><span>CPU</span><strong>${offer.cpuCores ? offer.cpuCores + " Kerne" : "-"}</strong></div>
        <div><span>GPU</span><strong>${offer.gpuCores ? offer.gpuCores + " Kerne" : "-"}</strong></div>
        <div><span>Jahr</span><strong>${offer.year || "-"}</strong></div>
      </div>

      <div class="offer-actions">
        <a class="offer-link" href="${offer.link || "#"}" target="_blank" rel="noopener noreferrer">
          Zum Angebot →
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
  const currentColor = colorFilterEl.value;

  sourceFilterEl.innerHTML = `<option value="">Alle Quellen</option>`;
  modelFilterEl.innerHTML = `<option value="">Alle Modelle</option>`;
  colorFilterEl.innerHTML = `<option value="">Beliebig</option>`;

  uniqueSorted(offers.map(o => o.sourceKey)).forEach((source) => {
    sourceFilterEl.innerHTML += `<option value="${esc(source)}">${esc(source)}</option>`;
  });

  uniqueSorted(offers.map(o => o.model)).forEach((model) => {
    modelFilterEl.innerHTML += `<option value="${esc(model)}">${esc(model)}</option>`;
  });

  uniqueSorted(offers.map(o => o.color)).forEach((color) => {
    colorFilterEl.innerHTML += `<option value="${esc(color)}">${esc(color)}</option>`;
  });

  sourceFilterEl.value = currentSource;
  modelFilterEl.value = currentModel;
  colorFilterEl.value = currentColor;
}

function filteredOffers() {
  const search = (searchFilterEl.value || "").toLowerCase().trim();
  const source = sourceFilterEl.value;
  const model = modelFilterEl.value;
  const color = colorFilterEl.value;
  const maxPrice = Number(maxPriceFilterEl.value || 0);
  const minRam = Number(minRamFilterEl.value || 0);
  const minStorage = Number(minStorageFilterEl.value || 0);

  return allOffers.filter((offer) => {
    // Only MacBook Pros! (User request constraint)
    if (!/macbook pro/i.test(offer.title || "")) return false;

    if (search) {
      const haystack = `${offer.title} ${offer.chip} ${offer.model} ${offer.color} ${offer.vendor} ${offer.description}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (source && offer.sourceKey !== source) return false;
    if (model && offer.model !== model) return false;
    if (color && offer.color !== color) return false;
    if (maxPrice && Number(offer.price || 0) > maxPrice) return false;
    if (minRam && Number(offer.ramGb || 0) < minRam) return false;
    if (minStorage && Number(offer.storageGb || 0) < minStorage) return false;

    return true;
  });
}

function render() {
  let offers = filteredOffers();
  
  // Sorting logic
  const sortMode = sortFilterEl.value;
  if (sortMode === "score") {
    offers.sort((a, b) => Number(b.valueScore || 0) - Number(a.valueScore || 0));
  } else if (sortMode === "priceAsc") {
    offers.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (sortMode === "priceDesc") {
    offers.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  }

  if (offerCountEl) {
    offerCountEl.textContent = String(offers.length);
  }

  metaEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> ${offers.length} MacBook Pro Angebote geladen`;

  if (!offers.length) {
    bestOfferEl.innerHTML = `<div class="empty-box">Keine Angebote passend zu den Filtern gefunden. Versuche weniger strenge Kriterien.</div>`;
    offersEl.innerHTML = "";
    return;
  }

  bestOfferEl.innerHTML = renderOfferCard(offers[0], true, 0);
  
  const remainingOffers = offers.slice(1);
  offersEl.innerHTML = remainingOffers.map((offer, i) => renderOfferCard(offer, false, i+1)).join("");
}

async function init() {
  try {
    metaEl.textContent = "Lade Apple Daten …";

    const response = await fetch("./data/offers.json?t=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`offers.json konnte nicht geladen werden (HTTP ${response.status})`);
    }

    const data = await response.json();

    // Initial filter for MacBook Pros to match user request
    allOffers = (Array.isArray(data.offers) ? data.offers : []).filter((offer) =>
      /macbook pro/i.test(offer.title || "")
    );

    populateFilters(allOffers);

    [
      searchFilterEl,
      sortFilterEl,
      sourceFilterEl,
      modelFilterEl,
      colorFilterEl,
      maxPriceFilterEl,
      minRamFilterEl,
      minStorageFilterEl
    ].forEach((el) => el.addEventListener("input", render));

    render();
  } catch (error) {
    console.error("Fehler in init():", error);
    metaEl.innerHTML = `<span style="color: #ef4444;">Fehler beim Laden</span>`;
    bestOfferEl.innerHTML = `<div class="empty-box">${esc(error.message)}</div>`;
    offersEl.innerHTML = "";
  }
}

window.addEventListener("load", init);
