# AGENTS.md — Lott-Bespitting Diode (LBD)

Vanilla HTML/CSS/JS web app + CircuitPython firmware + KiCad hardware design. No build tools, no package manager, no test framework.

## Commands

| Action | Command |
|--------|---------|
| Serve web app locally | `python -m http.server 8080` (then open `http://localhost:8080` in **Chromium**) |
| Generate BOM from schematics | `python scripts/generate_bom.py` (modifies `app/index.html` in-place) |
| Deploy firmware | Copy `firmware/code.py` and `firmware/lib/` to `CIRCUITPY` drive root |
| Test IR standalone | Copy `scripts/ir_tester.py` to `CIRCUITPY/code.py` |

## Key facts

- **WebSerial only works in Chromium-based browsers** (Chrome, Edge, Opera). Firefox and Safari are not supported.
- **Controller script load order matters** — `app/controller.html` loads 11 scripts in strict dependency order: `utils.js → state.js → serial.js → transmit.js → library-ui.js → sidebar.js → modals.js → drag-drop.js → import.js → irdb.js → app.js`. Always append new scripts after `app.js`.
- **Firmware is CircuitPython** (not MicroPython). Uses `adafruit_irremote.mpy` compiled library. The VSCode extension `joedevivo.vscode-circuitpython` provides stubs for the RP2040 (VID `0x2E8A`, PID `0x101F`).
- **Firmware protocol:** RP2040 listens on USB serial (115200 baud) for comma-separated 4-byte hex arrays, e.g., `20,df,09,f6`. Echoes prefixed log messages: `[SYS]`, `[HW]`, `[OK]`, `[ERR]`.
- **No tests exist** — this is a hardware project. The only verification is copying to the board and observing behavior.
- **CI/CD:** GitHub Actions deploys to GitHub Pages on push to `main` touching `app/**`, `hardware/*.kicad_sch`, or `.github/workflows/deploy.yml`. Pipeline: generate BOM → commit BOM → copy `app/` + schematics to `public/` → deploy with `peaceiris/actions-gh-pages`.
- **Entrypoints:** `app/index.html` (landing page with BOM/schematic), `app/controller.html` (SPA), `firmware/code.py` (RP2040 main).
- **No back-end** — entirely static, no server-side processing. The spreadsheet at `hardware/materials.xlsx` is the manual BOM source.
- **Symbols/footprints** live in `hardware/LBD_Library/` (custom KiCad library). Do not use external library paths.
- **IDEs:** VSCode with CircuitPython extension and Pylance. Settings in `.vscode/settings.json` point to CircuitPython stubs (not standard CPython).
