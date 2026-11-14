# Kardy

Personal offline loyalty-card photo wallet PWA for iPhone. Photo storage, no backend, no account, no OCR, no barcode generation, no telemetry.

## Stack

React + TypeScript + Vite + vite-plugin-pwa. Photographs are stored as original binary `Blob` objects in IndexedDB; the service worker caches application resources. Card data is never uploaded by the application.

## Development

Requires Node.js 22+.

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E tests cover Chromium desktop and emulated iPhone portrait/landscape. This does not qualify real Safari.

## Deploy and install on iPhone

Deploy `dist/` to a static HTTPS host. Open the URL on an iPhone in Safari, select **Share → Add to Home Screen**, and launch Kardy. Load the application online at least once before testing offline.

## Usage

- Add a card with a store name and original front/back photographs via camera or gallery.
- View full-screen; pinch, drag and flip.
- Search locally by store name; edit or delete with confirmation.
- Export a JSON backup with SHA-256 checksums; import validates the entire archive before atomically replacing IndexedDB contents.

## Privacy and limitations

iOS may evict site data; export backups regularly. Backups include unencrypted photos. Each photo is limited to 24 MiB, each backup to 128 MiB. Some physical barcode scanners cannot read phone displays. Real iPhone Safari, Home Screen installation, camera picker, backup-to-Files and checkout scanner compatibility require manual verification.

## Delivery

Source is in `main` at the owner's explicit request. No deployment or full qualification has been performed.
