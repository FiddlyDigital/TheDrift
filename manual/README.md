# The Drift — user manual

A printable user manual (PDF) that walks through every feature, illustrated with
mobile (Pixel 5) screenshots.

- **`the-drift-manual.pdf`** — the built manual (the deliverable).
- **`shots/`** — the source mobile screenshots.
- **`capture.mjs`** — drives the running app with Playwright and captures the screenshots.
- **`build-manual.mjs`** — composes the screenshots + copy into a print-styled HTML and renders it to PDF.

## Regenerate

Requires Playwright's Chromium (`npx playwright install chromium`). Set
`PW_CHROMIUM` to a chromium binary to override the bundled one.

```bash
npm run build                       # build the app
npm run preview -- --port 4173 &    # serve it
npm run manual:shots                # capture mobile screenshots -> manual/shots
npm run manual:pdf                  # build manual/the-drift-manual.pdf
```

The generated `the-drift-manual.html` is large (screenshots are inlined as data
URIs) and is git-ignored; the PDF is the artifact to keep.
