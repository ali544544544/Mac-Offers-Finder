const metaEl = document.getElementById("meta");
const bestOfferEl = document.getElementById("bestOffer");
const offersEl = document.getElementById("offers");

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

function renderOfferCard(offer) {
  return `
    <article class="offer-card">
      <h3>${esc(offer.title || "Ohne Titel")}</h3>
      <p><strong>Preis:</strong> ${euro(offer.price)}</p>
      <p><strong>Anbieter:</strong> ${esc(offer.vendor || "-")}</p>
      <p><strong>Quelle:</strong> ${esc(offer.sourceKey || "-")}</p>
      <p><strong>Modell:</strong> ${esc(offer.model || "-")}</p>
      <p><strong>Chip:</strong> ${esc(offer.chip || "-")}</p>
      <p><strong>RAM:</strong> ${offer.ramGb ?? "-"} GB</p>
      <p><strong>SSD:</strong> ${offer.storageGb ?? "-"} GB</p>
      <p><strong>Score:</strong> ${offer.valueScore ?? "-"}</p>
      <p><a href="${offer.link || "#"}" target="_blank" rel="noopener noreferrer">Zum Angebot</a></p>
    </article>
  `;
}

async function init() {
  try {
    const response = await fetch("./data/offers.json?t=" + Date.now(), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("offers.json konnte nicht geladen werden. HTTP " + response.status);
    }

    const data = await response.json();

    console.log("Geladene Daten:", data);

    const offers = Array.isArray(data.offers) ? data.offers : [];

    metaEl.textContent = `${offers.length} Angebote geladen`;

    if (offers.length === 0) {
      bestOfferEl.innerHTML = "<p>Keine Angebote vorhanden.</p>";
      offersEl.innerHTML = "";
      return;
    }

    const sorted = [...offers].sort((a, b) => {
      const av = Number(a.valueScore ?? 0);
      const bv = Number(b.valueScore ?? 0);
      return bv - av;
    });

    bestOfferEl.innerHTML = `
      <h2>Bestes Angebot</h2>
      ${renderOfferCard(sorted[0])}
    `;

    offersEl.innerHTML = `
      <h2>Alle Angebote</h2>
      ${sorted.map(renderOfferCard).join("")}
    `;
  } catch (error) {
    console.error(error);
    metaEl.textContent = "Fehler beim Laden";
    bestOfferEl.innerHTML = `<p>${esc(error.message)}</p>`;
    offersEl.innerHTML = "";
  }
}

init();
