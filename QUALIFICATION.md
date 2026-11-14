# Kardy — qualification evidence

Date: 2026-11-14
Status: **SOURCE UPLOAD IN PROGRESS / NOT VERIFIED / NOT DEPLOYED**

## Local evidence

- Standalone TypeScript modules `cards.ts`, `storage.ts`, `backup.ts` compiled with strict TypeScript 5.8.3.
- TSX transpile syntax checks passed (not a full typecheck).
- Node.js 22 executed backup roundtrip checks against compiled modules, including exact original photo bytes, checksum validation, invalid archive rejection and large image encoding.
- Icons were created locally; hosted copies and actual device presentation require qualification.

## Unverified

- npm registry DNS unavailable in the original working environment. Full npm install, lint, typecheck, Vitest and production Vite build have not passed there.
- Local Chromium navigation blocked by administrator; desktop/mobile browser E2E and screenshots not obtained.
- Actual iPhone Safari, Add to Home Screen, camera/gallery, installed offline persistence, backup-to-Files and checkout scanner not tested.
- No deployment. GitHub repository is `TarasGez/Kardy`; owner explicitly requested direct commits to `main`.

Do not report the application as production-ready until the tests and real-device checks pass.
