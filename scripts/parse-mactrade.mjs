function normalizeText(value) {
  return String(value || "")
    .replace(/&#0*39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
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

function parseCpuCores(text) {
  const m = text.match(/(\d+)[-\s]*Core CPU/i);
  return m ? Number(m[1]) : null;
}

function parseGpuCores(text) {
  const m = text.match(/(\d+)[-\s]*Core GPU/i);
  return m ? Number(m[1]) : null;
}

function parseYear(text) {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function deriveCondition(title) {
  const lower = title.toLowerCase();

  if (lower.includes("gebraucht")) return "gebraucht";
  if (lower.includes("refurb")) return "refurbished";
  if (lower.includes("vorgängermodell")) return "vorgaengermodell";
  if (lower.includes("rp")) return "restposten";

  return "unbekannt";
}

function deriveModel(title) {
  if (/macbook pro 14/i.test(title)) return "MacBook Pro 14";
  if (/macbook pro 16/i.test(title)) return "MacBook Pro 16";
  if (/macbook air 13/i.test(title)) return "MacBook Air 13";
  if (/macbook air 15/i.test(title)) return "MacBook Air 15";
  if (/studio display/i.test(title)) return "Studio Display";
  return "Mac";
}

function deriveChip(title, variant) {
  const text = `${title} ${variant}`;
  const m = text.match(/\b(M[1-9]\s?(?:Pro|Max|Ultra)?|M4(?:\s?Pro|\s?Max)?|M3(?:\s?Pro|\s?Max)?|M2(?:\s?Pro|\s?Max)?|M1(?:\s?Pro|\s?Max)?)/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

export function parseMacTradeOffers(html, source) {
  const marker = "let onEventDataLayer = JSON.parse(";
  const start = html.indexOf(marker);

  if (start === -1) {
    return [];
  }

  const slice = html.slice(start);
  const firstQuote = slice.indexOf("'");
  const lastQuote = slice.indexOf("');");

  if (firstQuote === -1 || lastQuote === -1) {
    return [];
  }

  const jsonStringEscaped = slice.slice(firstQuote + 1, lastQuote);
  const jsonString = jsonStringEscaped
    .replace(/\\u2011/g, "-")
    .replace(/\\u00fc/g, "ü")
    .replace(/\\u00df/g, "ß")
    .replace(/\\u00f6/g, "ö")
    .replace(/\\u00e4/g, "ä")
    .replace(/\\\//g, "/");

  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return [];
  }

  const items = parsed?.[0]?.ecommerce?.items ?? [];

  return items.map((item) => {
    const title = normalizeText(item.item_name);
    const variant = normalizeText(item.item_variant);

    const ramFromVariant = parseRamGb(variant);
    const ramFromTitle = parseRamGb(title);

    const storageFromVariant = parseStorageGb(variant);
    const storageFromTitle = parseStorageGb(title);

    const cpuCores = parseCpuCores(title) ?? parseCpuCores(variant);
    const gpuCores = parseGpuCores(title) ?? parseGpuCores(variant);

    return {
      id: `${source.key}-${item.item_id}`,
      sourceKey: source.key,
      sourceType: source.type,
      sourceUrl: source.url,
      vendor: "MacTrade",
      title,
      variant,
      model: deriveModel(title),
      chip: deriveChip(title, variant),
      year: parseYear(title),
      condition: deriveCondition(title),
      price: Number(item.price),
      currency: "EUR",
      ramGb: ramFromVariant ?? ramFromTitle,
      storageGb: storageFromVariant ?? storageFromTitle,
      cpuCores,
      gpuCores,
      productId: item.item_id,
      link: source.url
    };
  });
}
