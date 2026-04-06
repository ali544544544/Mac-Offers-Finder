import fs from "node:fs/promises";

async function main() {
  try {
    const data = JSON.parse(await fs.readFile("data/offers.json", "utf8"));
    const offers = data.offers || [];
    
    let md = "# Aktuelle MacBook Pro Angebote\n\n";
    md += `Zuletzt aktualisiert: ${new Date(data.updatedAt).toLocaleString("de-DE")}\n\n`;
    
    if (offers.length === 0) {
      md += "Keine Angebote gefunden.\n";
    } else {
      md += "| Modell | CPU/GPU | RAM | SSD | Preis | Händler | Link |\n";
      md += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n";
      
      for (const o of offers) {
        const specs = `${o.cpuCores || "?"}/${o.gpuCores || "?"}`;
        const price = o.price ? `${o.price.toLocaleString("de-DE")} €` : "N/A";
        md += `| ${o.model || "MBP"} | ${specs} | ${o.ramGb || "?"}GB | ${o.storageGb || "?"}GB | ${price} | ${o.vendor} | [Link](${o.link}) |\n`;
      }
    }
    
    await fs.writeFile("report.md", md, "utf8");
    console.log("report.md wurde erfolgreich erstellt.");
  } catch (error) {
    console.error("Fehler beim Erstellen des Reports:", error.message);
    process.exit(1);
  }
}

main();
