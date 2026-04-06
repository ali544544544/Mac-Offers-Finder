function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function computeScore(offer) {
  const ram = safeNumber(offer.ramGb, 8);
  const storage = safeNumber(offer.storageGb, 256);
  const cpu = safeNumber(offer.cpuCores, 8);
  const gpu = safeNumber(offer.gpuCores, 8);
  const yearBonus = safeNumber(offer.year, 2022) - 2020;

  const performancePoints =
    ram * 3.0 +
    (storage / 128) * 2.5 +
    cpu * 2.5 +
    gpu * 1.5 +
    yearBonus * 5.0;

  const price = safeNumber(offer.price, 999999);
  const valueScore = Number((Math.pow(performancePoints, 1.25) / price * 100).toFixed(3));

  return {
    performancePoints: Number(performancePoints.toFixed(2)),
    valueScore
  };
}

export function enrichOffers(offers) {
  return offers.map((offer) => {
    const score = computeScore(offer);
    return {
      ...offer,
      ...score
    };
  });
}

export function pickBestOffers(offers) {
  return [...offers]
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 10);
}
