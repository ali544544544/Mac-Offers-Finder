const metaEl = document.getElementById("meta");
const bestOfferEl = document.getElementById("bestOffer");
const offersEl = document.getElementById("offers");
const offerCountEl = document.getElementById("offerCount");

const searchFilterEl = document.getElementById("searchFilter");
const sortFilterEl = document.getElementById("sortFilter");
const modelFilterEl = document.getElementById("modelFilter");

// Custom Filter Elements
const colorSwatchesEl = document.getElementById("colorSwatches");
const sourceBoxEl = document.getElementById("sourceFilterBox");
const ramBoxEl = document.getElementById("ramFilterBox");
const ssdBoxEl = document.getElementById("ssdFilterBox");

const premiumPriceSlider = document.getElementById("premiumPriceSlider");
const priceRangeLabel = document.getElementById("priceRangeLabel");
let priceSliderInstance = null;

// State
const filterState = {
  search: "",
  sort: "score",
  vendors: new Set(),
  model: "",
  colors: new Set(),
  minPrice: 0,
  maxPrice: 6000,
  rams: new Set(),
  storages: new Set()
};

const COLOR_MAP = {
  "space schwarz": "#2b2b2b",
  "space grau": "#7d7e80",
  "spacegrau": "#7d7e80",
  "silber": "#e3e4e5",
  "mitternacht": "#2e3642",
  "polarstern": "#f4e8ce"
};

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

const ICON = {
  condition: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
  color:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="12" r="2.5"/><circle cx="13.5" cy="17.5" r="2.5"/><circle cx="5" cy="12" r="3"/></svg>`,
  cpu:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2"/></svg>`,
  gpu:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M14 12h4"/><path d="M6 9v6"/><path d="M18 9v6"/><circle cx="12" cy="12" r="2"/></svg>`,
  bench:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 18v4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M20 12h4"/><path d="m19.07 4.93-2.83 2.83"/><circle cx="12" cy="12" r="4"/></svg>`,
  metal:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
};

function formatStorage(gb) {
  if (!gb) return "-";
  if (gb >= 1000) return (gb / 1000) % 1 === 0 ? `${gb/1000} TB` : `${(gb/1000).toFixed(1)} TB`;
  return `${gb} GB`;
}

function renderOfferCard(offer, isBest = false, index = 0) {
  const delay = Math.min(index * 0.05, 0.5);
  const score = (offer.resolveScore || offer.valueScore || 0).toFixed(2);
  const scoreClass = score >= 50 ? "score-high" : score >= 25 ? "score-mid" : "score-low";

  return `
    <article class="offer-card ${isBest ? "best-card" : ""}" style="animation-delay: ${delay}s">

      <div class="offer-card-top">
        <div class="offer-price">${euro(offer.price)}</div>
        <div class="offer-card-top-right">
          ${isBest ? `<div class="best-badge">Top Deal</div>` : ""}
          <div class="offer-score-pill ${scoreClass}">
            <span class="score-label">Resolve</span>
            <span class="score-value">${score}</span>
          </div>
        </div>
      </div>

      <h3 class="offer-title">${esc(offer.title || "Ohne Titel")}</h3>

      <div class="spec-grid">
        <div class="spec-tile">
          <div class="spec-icon">⚡</div>
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
          <div class="spec-icon">💾</div>
          <div class="spec-info">
            <span class="spec-label">SSD</span>
            <strong class="spec-value">${formatStorage(offer.storageGb)}</strong>
          </div>
        </div>
      </div>

      <div class="offer-details">
        <div class="detail-item">${ICON.condition}<div><span>Zustand</span><strong>${esc(offer.condition || "-")}</strong></div></div>
        <div class="detail-item">${ICON.color}<div><span>Farbe</span><strong>${esc(offer.color || "-")}</strong></div></div>
        <div class="detail-item">${ICON.cpu}<div><span>CPU Kerne</span><strong>${offer.cpuCores || "-"}</strong></div></div>
        <div class="detail-item">${ICON.gpu}<div><span>GPU Kerne</span><strong>${offer.gpuCores || "-"}</strong></div></div>
        <div class="detail-item">${ICON.bench}<div><span>Geekbench MC</span><strong>${offer.gb6_mc || "k.A."}</strong></div></div>
        <div class="detail-item">${ICON.metal}<div><span>Metal GPU</span><strong>${offer.metal_gpu || "k.A."}</strong></div></div>
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

function setupMultiChips(container, stateSet, parser = String) {
  if (!container) return;
  const chips = container.querySelectorAll(".chip");
  const allChip = container.querySelector('[data-val=""]');

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const val = chip.dataset.val;
      
      if (!val) {
        stateSet.clear();
        chips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
      } else {
        const parsedVal = parser(val);
        if (stateSet.has(parsedVal)) {
          stateSet.delete(parsedVal);
          chip.classList.remove("active");
        } else {
          stateSet.add(parsedVal);
          chip.classList.add("active");
        }
        
        if (allChip) {
          if (stateSet.size > 0) allChip.classList.remove("active");
          else allChip.classList.add("active");
        }
      }
      render();
    });
  });
}

// Initial Setup
setupMultiChips(sourceBoxEl, filterState.vendors);
setupMultiChips(ramBoxEl, filterState.rams, Number);
setupMultiChips(ssdBoxEl, filterState.storages, Number);

function populateFilters(offers) {
  const currentModel = modelFilterEl.value;

  modelFilterEl.innerHTML = `<option value="">Alle Modelle</option>`;

  uniqueSorted(offers.map(o => o.model)).forEach((model) => {
    modelFilterEl.innerHTML += `<option value="${esc(model)}">${esc(model)}</option>`;
  });

  modelFilterEl.value = currentModel;

  // Render Colors
  colorSwatchesEl.innerHTML = `<div class="color-swatch ${filterState.colors.size === 0 ? 'active' : ''}" style="background: linear-gradient(135deg, #eee, #aaa); display:flex; align-items:center; justify-content:center; font-size:10px" data-color="">Alle</div>`;
  
  const colors = uniqueSorted(offers.map(o => o.color));
  colors.forEach(rawColor => {
    const lColor = rawColor.toLowerCase();
    let hex = "#ddd"; // fallback
    for (const [key, val] of Object.entries(COLOR_MAP)) {
      if (lColor.includes(key)) {
        hex = val;
        break;
      }
    }
    const isActive = filterState.colors.has(rawColor);
    colorSwatchesEl.innerHTML += `<div class="color-swatch ${isActive ? 'active' : ''}" style="background-color: ${hex}" title="${esc(rawColor)}" data-color="${esc(rawColor)}"></div>`;
  });

  // Attach color click events
  const swatches = [...colorSwatchesEl.querySelectorAll(".color-swatch")];
  const allColorSwatch = swatches.find(s => !s.dataset.color);
  
  swatches.forEach(swatch => {
    swatch.addEventListener("click", () => {
      const val = swatch.dataset.color;
      if (!val) {
        filterState.colors.clear();
        swatches.forEach(s => s.classList.remove("active"));
        swatch.classList.add("active");
      } else {
        if (filterState.colors.has(val)) {
          filterState.colors.delete(val);
          swatch.classList.remove("active");
        } else {
          filterState.colors.add(val);
          swatch.classList.add("active");
        }
        
        if (allColorSwatch) {
          if (filterState.colors.size > 0) allColorSwatch.classList.remove("active");
          else allColorSwatch.classList.add("active");
        }
      }
      render();
    });
  });

  // Dynamic Price Range Scale using noUiSlider
  if (offers.length && premiumPriceSlider) {
    const validPrices = offers.map(o => Number(o.price)).filter(Number.isFinite);
    if (validPrices.length) {
      const minVal = Math.floor(Math.min(...validPrices) / 100) * 100;
      const maxVal = Math.ceil(Math.max(...validPrices) / 100) * 100 + 100;
      
      filterState.minPrice = minVal;
      filterState.maxPrice = maxVal;

      if (!priceSliderInstance) {
        noUiSlider.create(premiumPriceSlider, {
          start: [minVal, maxVal],
          connect: true,
          range: { min: minVal, max: maxVal },
          step: 50,
          format: {
            to: value => Math.round(value),
            from: value => Math.round(value)
          }
        });
        
        priceSliderInstance = premiumPriceSlider.noUiSlider;
        priceSliderInstance.on('update', (values) => {
          filterState.minPrice = Number(values[0]);
          filterState.maxPrice = Number(values[1]);
          priceRangeLabel.textContent = `${filterState.minPrice} € - ${filterState.maxPrice === maxVal ? filterState.maxPrice + '+ €' : filterState.maxPrice + ' €'}`;
        });
        
        priceSliderInstance.on('change', render);
      }
    }
  }
}

function filteredOffers() {
  filterState.search = (searchFilterEl.value || "").toLowerCase().trim();
  filterState.model = modelFilterEl.value;
  filterState.sort = sortFilterEl.value;

  const { search, model, vendors, colors, minPrice, maxPrice, rams, storages } = filterState;
  
  // Use absolute max bounds to check if max is open
  const sliderOpts = priceSliderInstance ? priceSliderInstance.options.range : {max: 6000};
  const isMaxOpen = maxPrice >= Number(sliderOpts.max);

  return allOffers.filter((offer) => {
    if (!/macbook pro/i.test(offer.title || "")) return false;

    if (search) {
      const haystack = `${offer.title} ${offer.chip} ${offer.model} ${offer.color} ${offer.vendor} ${offer.description}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (vendors.size > 0 && !vendors.has(offer.vendor)) return false;
    if (model && offer.model !== model) return false;
    if (colors.size > 0 && !colors.has(offer.color)) return false;
    
    // Bounds Check Prices
    const limitMax = isMaxOpen ? 999999 : maxPrice;
    if (Number(offer.price || 0) < minPrice || Number(offer.price || 0) > limitMax) return false;
    
    // Spec bounds (exact multi-select)
    if (rams.size > 0 && !rams.has(Number(offer.ramGb || 0))) return false;
    if (storages.size > 0 && !storages.has(Number(offer.storageGb || 0))) return false;

    return true;
  });
}

function render() {
  let offers = filteredOffers();
  
  // Sorting logic
  const sortMode = sortFilterEl.value;
  if (sortMode === "score") {
    offers.sort((a, b) => Number(b.resolveScore || b.valueScore || 0) - Number(a.resolveScore || a.valueScore || 0));
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
      modelFilterEl
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
