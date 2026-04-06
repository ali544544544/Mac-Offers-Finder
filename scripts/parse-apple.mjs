function cleanup(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u2011/g, "-")   // non-breaking hyphen → normal hyphen
    .replace(/\u00ad/g, "-")   // soft hyphen
    .replace(/\u2010/g, "-")   // regular unicode hyphen
    .replace(/&[#\w]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEuro(value) {
  const m = String(value || "").match(/(\d[\d.,]*)/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "").replace(",", "."));
}

function parseRamGb(text) {
  let m = text.match(/(\d+)\s*GB(?:\s+gemeinsamer)?\s+(?:Arbeitsspeicher|RAM|Unified Memory)/i);
  if (m) return Number(m[1]);
  m = text.match(/\b(8|16|18|24|32|36|48|64|96|128)\s*GB\b/i);
  if (m) return Number(m[1]);
  return null;
}

function parseStorageGb(text) {
  let tb = text.match(/(\d+(?:[.,]\d+)?)\s*TB(?:\s*SSD)?/i);
  if (tb) return Math.round(Number(tb[1].replace(",", ".")) * 1024);

  let gb = text.match(/(\d+)\s*GB\s*SSD/i);
  if (gb) return Number(gb[1]);

  gb = text.match(/\b(128|256|512|1000|1024|2000|4000|8000)\s*GB\b/i);
  if (gb) return Number(gb[1]);

  return null;
}

function parseCpuCores(text) {
  const m = text.match(/(\d+)\D{0,15}Core\s*CPU/i);
  return m ? Number(m[1]) : null;
}

function parseGpuCores(text) {
  const m = text.match(/(\d+)\D{0,15}Core\s*GPU/i);
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
  const m = text.match(/(\d{1,2}(?:[.,]\d)?)\s*(?:''|"|Zoll|inch)/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function parseColor(text) {
  const colors = ["Space Grau", "Space Schwarz", "Silber", "Mitternacht", "Polarstern", "Himmelblau"];
  return colors.find((c) => text.toLowerCase().includes(c.toLowerCase())) || null;
}

function deriveModel(title) {
  if (/14.?[" ]?macbook pro|macbook pro 14/i.test(title)) return "MacBook Pro 14";
  if (/16.?[" ]?macbook pro|macbook pro 16/i.test(title)) return "MacBook Pro 16";
  if (/macbook air 13/i.test(title)) return "MacBook Air 13";
  if (/macbook air 15/i.test(title)) return "MacBook Air 15";
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
      // ignore
    }
  }

  return result;
}

function findProductJsonLd(objects) {
  return objects.find((obj) => obj?.["@type"] === "Product");
}

export function parseAppleListing(html, source) {
  // Capture both the href AND the anchor text (which contains all product data)
  const anchorRe = /<a[^>]+href="(\/de\/shop\/product\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  const seen = new Set();
  const offers = [];
  let index = 0;

  for (const match of html.matchAll(anchorRe)) {
    const link = absUrl(match[1], source.url);
    if (!link || seen.has(link)) continue;
    seen.add(link);

    // Clean up the anchor text to get the product title
    const rawTitle = cleanup(match[2]);
    if (!rawTitle || rawTitle.length < 10) continue; // skip empty/nav links

    // Only keep MacBook Pros at the listing stage too
    if (!/macbook pro/i.test(rawTitle)) continue;

    const combinedText = rawTitle;

    offers.push({
      id: `${source.key}-${index + 1}`,
      sourceKey: source.key,
      sourceType: source.type,
      sourceUrl: source.url,
      vendor: "Apple",
      title: rawTitle,
      variant: "",
      model: deriveModel(rawTitle),
      chip: parseChip(combinedText),
      year: parseYear(combinedText),
      condition: "refurbished",
      price: null,
      currency: "EUR",
      ramGb: parseRamGb(combinedText),
      storageGb: parseStorageGb(combinedText),
      cpuCores: parseCpuCores(combinedText),
      gpuCores: parseGpuCores(combinedText),
      screenInches: parseScreenInch(combinedText),
      productId: null,
      color: parseColor(combinedText),
      link
    });
    index++;
  }

  return offers;
}

export function parseAppleDetail(html, baseOffer) {
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1] || baseOffer.link;
  const metaDescription = cleanup(html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] || "");

  const jsonLdObjects = extractJsonLdObjects(html);
  const product = findProductJsonLd(jsonLdObjects);

  const title = cleanup(product?.name || baseOffer.title);
  const description = cleanup(product?.description || metaDescription || "");
  const price = Number(product?.offers?.[0]?.price || baseOffer.price || 0) || null;
  const partNumber = cleanup(product?.offers?.[0]?.sku || baseOffer.productId || "");
  const color = cleanup(product?.color || "") || parseColor(`${title} ${description}`) || baseOffer.color || null;

  const combinedText = `${title} ${description}`;
  const model = deriveModel(title);

  // HARTER FILTER: nur MacBook Pro
  if (!/macbook pro/i.test(title) && model !== "MacBook Pro 14" && model !== "MacBook Pro 16") {
    return null;
  }

  return {
    ...baseOffer,
    title,
    link: canonical,
    description,
    vendor: "Apple",
    productId: partNumber || baseOffer.productId,
    model,
    chip: parseChip(combinedText) || baseOffer.chip,
    year: parseYear(combinedText) || baseOffer.year,
    color,
    price: price ?? baseOffer.price,
    ramGb: parseRamGb(combinedText) ?? baseOffer.ramGb,
    storageGb: parseStorageGb(combinedText) ?? baseOffer.storageGb,
    cpuCores: parseCpuCores(combinedText) ?? baseOffer.cpuCores,
    gpuCores: parseGpuCores(combinedText) ?? baseOffer.gpuCores,
    screenInches: parseScreenInch(combinedText) ?? baseOffer.screenInches
  };
}
