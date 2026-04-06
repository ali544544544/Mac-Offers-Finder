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
  const m = text.match(/(\d{1,2}(?:[.,]\d)?)\s*(?:''|"|Zoll)/i);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function parseColor(text) {
  const colors = ["Space Grau", "Space Schwarz", "Silber", "Mitternacht", "Polarstern", "Himmelblau"];
  return colors.find((c) => text.toLowerCase().includes(c.toLowerCase())) || null;
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

function extractDataLayer(html) {
  try {
    // MacTrade stores it in let onEventDataLayer = JSON.parse('...');
    // We need to unescape the JSON string inside the JS code.
    const m = html.match(/let onEventDataLayer = JSON\.parse\('(.*?)'\);/);
    if (!m) return null;
    const jsonStr = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    const data = JSON.parse(jsonStr);
    return Array.isArray(data) ? data[0] : data;
  } catch (e) {
    console.error("DataLayer extraction error:", e.message);
    return null;
  }
}

export function parseMacTradeListing(html, source) {
  const dataLayer = extractDataLayer(html);
  const jsonItems = dataLayer?.ecommerce?.items || [];
  
  // Also get links and images from HTML
  const linkMatches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*class="product-name"[^>]*>/gi)];
  const idToLink = new Map();
  for (const match of linkMatches) {
    const link = absUrl(match[1], source.url);
    const idMatch = link.match(/\/([\d.]+)\/?$/);
    if (idMatch) idToLink.set(idMatch[1], link);
  }

  // Extract images: <img ... class="product-image" title="[TITLE]" src="[SRC]">
  const imgMatches = [...html.matchAll(/<img[^>]+class="[^"]*product-image[^"]*"[^>]+title="([^"]+)"[^>]+src="([^"]+)"/gi)];
  const titleToImage = new Map();
  for (const match of imgMatches) {
    titleToImage.set(cleanup(match[1]), absUrl(match[2], source.url));
  }

  const items = [];
  
  if (jsonItems.length > 0) {
    for (const [index, item] of jsonItems.entries()) {
      const title = cleanup(item.item_name);
      const variant = cleanup(item.item_variant || "");
      const combined = `${title} ${variant}`;
      const link = idToLink.get(item.item_id) || source.url;
      const imageUrl = titleToImage.get(title) || null;

      // Filter: only MacBook Pro
      if (!/macbook pro/i.test(title)) continue;

      items.push({
        id: `${source.key}-${item.item_id || index}`,
        sourceKey: source.key,
        sourceType: source.type,
        sourceUrl: source.url,
        vendor: "MacTrade",
        title,
        variant,
        model: deriveModel(title),
        chip: parseChip(combined),
        year: parseYear(combined),
        condition: source.key.includes("gebraucht") ? "gebraucht" : "vorgaengermodell",
        price: Number(item.price) || null,
        currency: "EUR",
        ramGb: parseRamGb(combined),
        storageGb: parseStorageGb(combined),
        cpuCores: parseCpuCores(combined),
        gpuCores: parseGpuCores(combined),
        screenInches: parseScreenInch(combined),
        color: parseColor(combined),
        productId: item.item_id || null,
        imageUrl,
        link
      });
    }
  } else {
    // FALLBACK to old HTML parsing if DataLayer fails
    const nameMatches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*class="product-name"[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const [index, match] of nameMatches.entries()) {
      const link = absUrl(match[1], source.url);
      const title = cleanup(match[2]);
      if (!/macbook pro/i.test(title)) continue;

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
        color: parseColor(title),
        productId: null,
        link
      });
    }
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

    const model = deriveModel(title);

  // HARTER FILTER: nur MacBook Pro
  if (!/macbook pro/i.test(title) && model !== "MacBook Pro 14" && model !== "MacBook Pro 16") {
    return null;
  }

  return {
    ...baseOffer,
    title,
    vendor: brand || "MacTrade",
    link: canonical,
    productId: sku || baseOffer.productId,
    description,
    model,
    chip: parseChip(combinedText) || baseOffer.chip,
    year: parseYear(combinedText) || baseOffer.year,
    price: price ?? baseOffer.price,
    ramGb: parseRamGb(combinedText) ?? baseOffer.ramGb,
    storageGb: parseStorageGb(combinedText) ?? baseOffer.storageGb,
    cpuCores: parseCpuCores(combinedText) ?? baseOffer.cpuCores,
    gpuCores: parseGpuCores(combinedText) ?? baseOffer.gpuCores,
    screenInches: parseScreenInch(combinedText) ?? baseOffer.screenInches,
    color: parseColor(combinedText) || baseOffer.color || null
  };
}
