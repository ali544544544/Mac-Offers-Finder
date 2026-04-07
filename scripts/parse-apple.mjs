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

// Valid Apple SSD sizes in GB (marketing values)
const VALID_STORAGE_GB = new Set([256, 512, 1000, 2000, 4000, 8000]);

function parseStorageGb(text) {
  // Only scan title/description-length text, not full HTML (avoids "bis zu X TB" marketing blurbs)
  const safeText = text.slice(0, 2000);

  let tb = safeText.match(/(\d+(?:[.,]\d+)?)\s*TB(?:\s*SSD)?/i);
  if (tb) {
    const val = Math.round(Number(tb[1].replace(",", ".")) * 1000);
    // Only return if it matches a known Apple storage size
    if (VALID_STORAGE_GB.has(val)) return val;
  }

  let gb = safeText.match(/(\d+)\s*GB\s*SSD/i);
  if (gb) {
    let val = Number(gb[1]);
    if (val === 1024) val = 1000;
    else if (val === 2048) val = 2000;
    else if (val === 4096) val = 4000;
    else if (val === 8192) val = 8000;
    if (VALID_STORAGE_GB.has(val)) return val;
  }

  gb = safeText.match(/\b(128|256|512|1000|1024|2000|2048|4000|4096|8000|8192)\s*GB\b/i);
  if (gb) {
    let val = Number(gb[1]);
    if (val === 1024) val = 1000;
    else if (val === 2048) val = 2000;
    else if (val === 4096) val = 4000;
    else if (val === 8192) val = 8000;
    if (VALID_STORAGE_GB.has(val)) return val;
  }

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
  if (/14.?[" ]?macbook pro|macbook pro 14|mbp 14/i.test(title)) return "MacBook Pro 14";
  if (/16.?[" ]?macbook pro|macbook pro 16|mbp 16/i.test(title)) return "MacBook Pro 16";
  if (/13.?[" ]?macbook pro|macbook pro 13|mbp 13/i.test(title)) return "MacBook Pro 13";
  if (/15.?[" ]?macbook pro|macbook pro 15|mbp 15/i.test(title)) return "MacBook Pro 15";
  if (/macbook air/i.test(title)) return "MacBook Air";
  if (/macbook pro|mbp/i.test(title)) return "MacBook Pro";
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
  // 1. New structure: <li> with class rf-refurb-producttile
  const tileRe = /<li[^>]+class="[^"]*rf-refurb-producttile[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  
  const offers = [];
  let index = 0;

  for (const tMatch of html.matchAll(tileRe)) {
    const tileHtml = tMatch[1];
    
    // Link & Title
    // <a class="rf-refurb-producttile-link" href="...">...</a>
    const linkMatch = tileHtml.match(/<a[^>]+href="([^"]+)"[^>]*class="[^"]*rf-refurb-producttile-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
                   || tileHtml.match(/<a[^>]+class="[^"]*rf-refurb-producttile-link[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    
    if (!linkMatch) continue;
    
    const link = absUrl(linkMatch[1], source.url);
    const title = cleanup(linkMatch[2]);
    if (!title || title.length < 10) continue; 
    if (!/macbook pro/i.test(title)) continue;

    // Price
    // <span class="rf-refurb-producttile-currentprice">...</span>
    const priceMatch = tileHtml.match(/class="[^"]*rf-refurb-producttile-currentprice[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const price = priceMatch ? parseEuro(priceMatch[1]) : null;

    offers.push({
      id: `${source.key}-${index + 1}`,
      sourceKey: source.key,
      sourceType: source.type,
      sourceUrl: source.url,
      vendor: "Apple",
      title,
      variant: "",
      model: deriveModel(title),
      chip: parseChip(title),
      year: parseYear(title),
      condition: "refurbished",
      price,
      currency: "EUR",
      ramGb: parseRamGb(title),
      storageGb: parseStorageGb(title),
      cpuCores: parseCpuCores(title),
      gpuCores: parseGpuCores(title),
      screenInches: parseScreenInch(title),
      productId: null,
      color: parseColor(title),
      link
    });
    index++;
  }

  // Fallback: If no tiles were found (e.g. structure change), try the old link-based way
  if (offers.length === 0) {
    const anchorRe = /<a[^>]+href="(\/de\/shop\/product\/[^"]+)"[^>]*class="[^"]*rf-refurb-[^"]*link[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorRe)) {
      const link = absUrl(match[1], source.url);
      const title = cleanup(match[2]);
      if (!/macbook pro|mbp/i.test(title)) continue;
      offers.push({
        id: `${source.key}-${index + 1}`,
        sourceKey: source.key,
        sourceType: source.type,
        sourceUrl: source.url,
        vendor: "Apple",
        title,
        variant: "",
        model: deriveModel(title),
        chip: parseChip(title),
        year: parseYear(title),
        condition: "refurbished",
        price: null,
        currency: "EUR",
        ramGb: parseRamGb(title),
        storageGb: parseStorageGb(title),
        cpuCores: parseCpuCores(title),
        gpuCores: parseGpuCores(title),
        screenInches: parseScreenInch(title),
        productId: null,
        color: parseColor(title),
        link
      });
      index++;
    }
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

  const combinedText = `${title} ${description}`; // only title+description, NOT raw html (avoids marketing blurbs like "bis zu 9 TB")
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
