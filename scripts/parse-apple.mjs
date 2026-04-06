function cleanup(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEuro(value) {
  const m = value.match(/(\d[\d\.\,]*)\s*€/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

function parseRamGb(text) {
  const m = text.match(/(\d+)\s*GB/i);
  return m ? Number(m[1]) : null;
}

function parseStorageGb(text) {
  const tb = text.match(/(\d+)\s*TB/i);
  if (tb) return Number(tb[1]) * 1024;
  const gb = text.match(/(\d+)\s*GB/i);
  return gb ? Number(gb[1]) : null;
}

function parseYear(text) {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function deriveModel(title) {
  if (/14.?zoll macbook pro|14-inch macbook pro|macbook pro 14/i.test(title)) return "MacBook Pro 14";
  if (/16.?zoll macbook pro|16-inch macbook pro|macbook pro 16/i.test(title)) return "MacBook Pro 16";
  if (/macbook air 13/i.test(title)) return "MacBook Air 13";
  if (/macbook air 15/i.test(title)) return "MacBook Air 15";
  return "Mac";
}

function deriveChip(text) {
  const m = text.match(/\b(M[1-9](?:\s?(?:Pro|Max|Ultra))?)\b/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

export function parseAppleOffers(html, source) {
  const offers = [];

  const blocks = html.split(/<li[^>]*>/i);

  for (const block of blocks) {
    const text = cleanup(block);

    if (!/macbook|mac/i.test(text)) continue;
    if (!/€/.test(text)) continue;

    const price = parseEuro(text);
    if (!price) continue;

    const titleMatch =
      text.match(/Refurbished\s+([^.]+?MacBook[^.€]+)/i) ||
      text.match(/(MacBook Pro[^.€]+)/i) ||
      text.match(/(MacBook Air[^.€]+)/i);

    const title = cleanup(titleMatch?.[1] || text.slice(0, 140));

    offers.push({
      id: `${source.key}-${offers.length + 1}`,
      sourceKey: source.key,
      sourceType: source.type,
      sourceUrl: source.url,
      vendor: "Apple",
      title,
      variant: "",
      model: deriveModel(title),
      chip: deriveChip(text),
      year: parseYear(text),
      condition: "refurbished",
      price,
      currency: "EUR",
      ramGb: parseRamGb(text),
      storageGb: parseStorageGb(text),
      cpuCores: null,
      gpuCores: null,
      productId: null,
      link: source.url
    });
  }

  return offers;
}
