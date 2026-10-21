# UrlBase ⚡

> **Zero-Backend, Local-First Modular Relational Database**
> Entire workspaces compressed and shared via URL hash fragments. No server, no accounts, no telemetry — 100% private and portable.

---

## 🚀 Key Highlights

* **Zero-Backend Architecture:** Your entire workspace state (tables, records, schemas, views) is compressed directly into URL hash fragments using `deflate-raw` compression and base64 encoding.
* **Integrity & Checksum Engine:** Every URL contains a truncated CRC32 checksum (`#<payload>.<checksum>`). If messaging platforms or URL shorteners truncate or corrupt the link, UrlBase detects the mismatch and protects your local data.
* **Local-First & Offline-First:** Persists workspaces instantly to IndexedDB with automatic local storage fallback. Work completely offline with zero latency.
* **Multiple Workspace Switching:** Create blank databases, switch between active workspaces, clone workspaces safely, or explore the built-in guide.
* **4 Dynamic Views:**
  * 📊 **Table / Grid View:** Spreadsheet-style interface with cell selection, keyboard navigation, range copy/paste, column resizing, and footer aggregations (Sum, Avg, Min, Max, Count).
  * 📋 **Kanban Board:** Organize records into interactive drag-and-drop workflow columns grouped by select/status fields.
  * 🗂️ **Card Gallery:** Clean visual card overview with configurable grouping and inline editing.
  * 📝 **Sprint List:** Compact checklist view for quick status reviews and task execution.
* **Rich Field Types:**
  * Text & Number
  * Single-Select & Multi-Select Tags (with custom colors and badge management)
  * Checkbox & Dates
  * URLs (with clickable launch icons)
  * **Relational Foreign Keys:** Link records across different tables with instant relational lookup popovers.
* **Universal Data Exchange:**
  * Bidirectional CSV, TSV, and JSON import/export.
  * Live data preview with field delimiter auto-detection.
  * Smart import collision handling (merge, replace, or create new).
* **Power-User Productivity:**
  * Full Undo / Redo history (`Ctrl+Z` / `Ctrl+Y`).
  * Dark & Light theme modes.
  * URL byte counter with real-time payload efficiency metrics.

---

## 🛠️ Tech Stack

* **Framework:** Next.js 16 (App Router with Turbopack)
* **UI & React:** React 19, Lucide Icons, Framer Motion
* **Styling:** Tailwind CSS v4 (monochromatic neo-brutalist / minimalist aesthetic)
* **Compression & Codec:** Native WebStreams `CompressionStream` & `DecompressionStream` (deflate-raw)
* **Testing:** Vitest

---

## 🏁 Getting Started

### Prerequisites

* Node.js 20+
* npm, pnpm, or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/vleon/project-gsql2.git
cd project-gsql2

# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm test
```

### Production Build

```bash
npm run build
npm start
```

---

## 🧪 Architecture & URL Codec

UrlBase serializes its entire schema into a compact JSON state object:
1. State is serialized to JSON and converted to binary via `TextEncoder`.
2. Compressed using raw deflate via browser-native `CompressionStream('deflate-raw')`.
3. Encoded using URL-safe Base64 (`-` and `_` replacing `+` and `/`).
4. Append an 8-character CRC32 checksum hash: `#[base64_data].[checksum]`.
5. When opening a link:
   - Checksum is calculated over the decoded bytes.
   - If checksum matches, state hydrates smoothly.
   - If corrupted or cut off in transit, an alert banner warns the user and falls back safely to local IndexedDB state.

---

## 📄 License

MIT License. Designed and built with ❤️.
