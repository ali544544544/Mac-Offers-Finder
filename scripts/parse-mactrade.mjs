function cleanup(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEuro(value) {
  const m = String(value || "").match(/(\d[\d.,]*)/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

function parseRamGb(text) {
  const m = text.match(/(\d+)\s*GB(?:\s+gemeinsamer)?\s+Arbeitsspeicher/i) || text.match(/(\d+)\s*GB/i);
  return m ? Number(m[1]) : null;
}

function parseStorageGb(text) {
  const tb = text.match(/(\d+(?:[.,]\d+)?)\s*TB\s*SSD/i) || text.match(/(\d+(?:[.,]\d+)?)\s*TB/i);
  if (tb) return Math.round(Number(tb[1].replace(",", ".")) * 1024);

  const gb = text.match(/(\d+)\s*GB\s*SSD/i) || text.match(/(\d+)\s*GB/i);
  return gb ? Number(gb[1]) : null;
}

function parseCpuCores(text) {
  const m = text.match(/(\d+)[-\s–-]*Core CPU/i);
  return m ? Number(m[1]) : null;
}

function parseGpuCores(text) {
  const m = text.match(/(\d+)[-\s–-]*Core GPU/i);
  return m ? Number(m[1]) : null;
}

function parseYear(text) {
  const m = text.match(/\b(20\d{2})\b/);
  return m ? Number(m[1]) : null;
}

function parseChip(text) {
  const m = text.match(/\b(M[1-9](?:\s?(?:Pro|Max|Ultra))?)\b/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

function parseScreenInch(text) {
  const m = text.match(/(\d{1,2}(?:[.,]\d)?)\s*(?:''|"|Zoll)/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function deriveModel(title) {
  if (/macbook pro 14/i.test(title)) return "MacBook Pro 14";
  if (/macbook pro 16/i.test(title)) return "MacBook Pro 16";
  if (/macbook air 13/i.test(title)) return "MacBook Air 13";
  if (/macbook air 15/i.test(title)) return "MacBook Air 15";
  if (/mac studio/i.test(title)) return "Mac Studio";
  if (/mac mini/i.test(title)) return "Mac mini";
  return "Mac";
}

function absUrl(href, base) {
  try {
    return new URL(href, base).toString();
  } catch {
    return href || null;
  }
}

function extractJsonLdObjects(html) {
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const result = [];

  for (const match of matches) {
    const raw = match[1].trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) result.push(...parsed);
      else result.push(parsed);
    } catch {
      // ignore broken json-ld
    }
  }

  return result;
}

function findProductJsonLd(objects) {
  return objects.find((obj) => obj?.["@type"] === "Product");
}

export function parseMacTradeListing(html, source) {
  const linkMatches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*class="product-name"[^>]*>([\s\S]*?)<\/a>/gi)];

  const items = [];
  for (const [index, match] of linkMatches.entries()) {
    const link = absUrl(match[1], source.url);
    const title = cleanup(match[2]);

    items.push({
      id: `${source.key}-${index + 1}`,
      sourceKey: source.key,
      sourceType: source.type,
      sourceUrl: source.url,
      vendor: "MacTrade",
      title,
      variant: "",
      model: deriveModel(title),
      chip: parseChip(title),
      year: parseYear(title),
      condition: source.key.includes("gebraucht") ? "gebraucht" : "vorgaengermodell",
      price: null,
      currency: "EUR",
      ramGb: parseRamGb(title),
      storageGb: parseStorageGb(title),
      cpuCores: parseCpuCores(title),
      gpuCores: parseGpuCores(title),
      screenInches: parseScreenInch(title),
      productId: null,
      link
    });
  }

  return items;
}

export function parseMacTradeDetail(html, baseOffer) {
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] || baseOffer.link;
  const ogTitle = cleanup(html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] || "");
  const ogDescription = cleanup(html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] || "");
  const ogPrice = parseEuro(html.match(/<meta[^>]+property="product:price:amount"[^>]+content="([^"]+)"/i)?.[1] || "");

  const jsonLdObjects = extractJsonLdObjects(html);
  const product = findProductJsonLd(jsonLdObjects);

  const title = cleanup(product?.name || ogTitle || baseOffer.title);
  const description = cleanup(product?.description || ogDescription || "");
  const price = Number(product?.offers?.[0]?.price || ogPrice || baseOffer.price || 0) || null;
  const sku = cleanup(product?.sku || baseOffer.productId || "");
  const brand = cleanup(product?.brand?.name || "MacTrade");

  const combinedText = `${title} ${description}`;

  return {
    ...baseOffer,
    title,
    vendor: brand || "MacTrade",
    link: canonical,
    productId: sku || baseOffer.productId,
    description,
    model: deriveModel(title),
    chip: parseChip(combinedText) || baseOffer.chip,
    year: parseYear(combinedText) || baseOffer.year,
    price: price ?? baseOffer.price,
    ramGb: parseRamGb(combinedText) ?? baseOffer.ramGb,
    storageGb: parseStorageGb(combinedText) ?? baseOffer.storageGb,
    cpuCores: parseCpuCores(combinedText) ?? baseOffer.cpuCores,
    gpuCores: parseGpuCores(combinedText) ?? baseOffer.gpuCores,
    screenInches: parseScreenInch(combinedText) ?? baseOffer.screenInches
  };
}
