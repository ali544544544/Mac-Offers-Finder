const metaEl = document.getElementById("meta");
const bestOfferEl = document.getElementById("bestOffer");
const offersEl = document.getElementById("offers");
const offerCountEl = document.getElementById("offerCount");

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
    console.log("offers.json geladen:", data);

    const offers = Array.isArray(data.offers) ? data.offers : [];

    if (offerCountEl) {
      offerCountEl.textContent = String(offers.length);
    }

    metaEl.textContent = `${offers.length} Angebote geladen · Letztes Update: ${data.updatedAt ?? "-"}`;

    if (offers.length === 0) {
      bestOfferEl.innerHTML = `<div class="empty-box">Keine Angebote vorhanden.</div>`;
      offersEl.innerHTML = "";
      return;
    }

    const sorted = [...offers].sort((a, b) => {
      const av = Number(a.valueScore ?? 0);
      const bv = Number(b.valueScore ?? 0);
      return bv - av;
    });

    bestOfferEl.innerHTML = renderOfferCard(sorted[0], true);
    offersEl.innerHTML = sorted.map((offer) => renderOfferCard(offer)).join("");
  } catch (error) {
    console.error("Fehler in init():", error);
    metaEl.textContent = "Fehler beim Laden";
    bestOfferEl.innerHTML = `<div class="empty-box">${esc(error.message)}</div>`;
    offersEl.innerHTML = "";
  }
}

window.addEventListener("load", init);
