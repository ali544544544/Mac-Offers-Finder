# 🚀 Mac Offers Finder

Der ultimative, automatisierte Scraper für **MacBook Pro** Deals! Findet die besten Angebote von Apple Refurbished und MacTrade, analysiert die technischen Details und präsentiert sie in einem modernen Glassmorphism-Interface.

![GitHub Actions Status](https://github.com/ali544544544/Mac-Offers-Finder/actions/workflows/scrape-offers.yml/badge.svg)

## ✨ Features

- **🔍 Multi-Source Scraping**: Scannt Apple Refurbished, MacTrade Vorgängermodelle, Gebrauchtware und A-Ware.
- **📈 Dynamische Paginierung**: Erfasst automatisch alle verfügbaren Ergebnisseiten (z. B. alle 4+ Seiten im Apple Refurbished Store).
- **🛠️ Detail-Präzision**: Jeder Deal wird auf seiner Detailseite besucht, um CPU/GPU-Kerne und RAM (Unified Memory) punktgenau zu extrahieren.
- **💎 Modernes Interface**: Ein rein textbasiertes, hochmodernes Glassmorphism-UI mit Fokus auf das Wesentliche.
- **🤖 Vollautomatisiert**: Läuft täglich via GitHub Actions und aktualisiert sich selbstständig auf GitHub Pages.
- **📝 Automatischer Report**: Erzeugt bei jedem Lauf eine `report.md` Übersichtstabelle.

## 🛠️ Technologie-Stack

- **Backend**: Node.js & Playwright (Chromium)
- **Styling**: Vanilla CSS (Glassmorphism Design)
- **Automation**: GitHub Actions & GitHub Pages
- **Daten**: JSON-basiertes Datenspeicher-Modell

## 🚀 Schnellstart (Lokal)

### 1. Installation
Stelle sicher, dass Node.js (v20+) installiert ist.
```bash
npm install
npx playwright install chromium
```

### 2. Scraper ausführen
```bash
npm run scrape
```
Die Daten werden in `data/offers.json` gespeichert.

### 3. Vorschau (Web-Interface)
```bash
npm start
```
Öffne [http://localhost:8080](http://localhost:8080) in deinem Browser.

## 📂 Projektstruktur

- `scripts/`: Das Herzstück (Scraper, Parser, Scorer, Report-Generator).
- `web/`: Das Frontend (HTML, CSS, JS für die Web-App).
- `data/`: Speicherort für die tagesaktuellen Angebote (`offers.json`).
- `.github/workflows/`: Konfiguration für die automatischen Läufe.

---

*Entwickelt für die Jagd nach dem perfekten MacBook Pro. 🍏💻*
