# Booky

Liquid-glass book reader: search Project Gutenberg, Open Library and Internet Archive, read in a customisable reader, download for offline reading, or import your own EPUB / TXT / HTML files.

- **Web:** Vite + React, deployed on Vercel (`api/proxy.js` is a small allow-listed proxy for the book sources).
- **Android:** the same app wrapped with Capacitor. GitHub Actions builds the APK on every push to `main` — download it from the **Releases** page (or the run's *Artifacts*).
- **Design:** Figma file "Lumen — Liquid Glass Book Reader".

## Develop
```bash
npm install
npm run dev
```

## Build the APK
Push to `main` (or run the *Build Android APK* workflow manually). The signed-with-debug-key `Booky.apk` is attached to a new release `build-N`.
