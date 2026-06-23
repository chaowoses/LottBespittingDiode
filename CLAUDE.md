# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lott-Bespitting Diode (LBD)** is a hardware IR blaster built on the RP2040 microcontroller, controlled via a browser WebSerial app. Three independent components: CircuitPython firmware, a vanilla JS single-page app, and KiCad hardware design. No build tools, no package manager, no test framework.

## Commands

| Action | Command |
|--------|---------|
| Serve web app locally | `python -m http.server 8080` (open in Chromium only) |
| Generate BOM from schematics | `python scripts/generate_bom.py` (modifies `app/index.html` in-place) |
| Deploy firmware | Copy `firmware/code.py` and `firmware/lib/` to `CIRCUITPY` drive root |
| Test IR standalone | Copy `scripts/ir_tester.py` to `CIRCUITPY/code.py` |

## Architecture

### Web Frontend (`app/`)

Two entry points: `app/index.html` (landing page with BOM table and KiCanvas schematic viewer) and `app/controller.html` (the full control SPA).

The controller SPA loads 11 scripts in strict dependency order — **always append new scripts after `app.js`**, never reorder:

```
utils.js → state.js → serial.js → transmit.js → library-ui.js →
sidebar.js → modals.js → drag-drop.js → import.js → irdb.js → app.js
```

Key module responsibilities:
- **state.js** — All global state and localStorage CRUD (`lbd_library`, `lbd_history`, etc.). Single source of truth.
- **transmit.js** — NEC encoding via `flipByte()` and `compileNEC()`. Address and command bytes are bit-flipped then inverted.
- **serial.js** — WebSerial connection lifecycle and log bar.
- **irdb.js** — Fetches from [Lucaslhm/Flipper-IRDB](https://github.com/Lucaslhm/Flipper-IRDB) via GitHub API with response caching.
- **app.js** — Initialization and tab switching only.

All data persists in localStorage; there is no back-end.

### Firmware (`firmware/code.py`)

CircuitPython (not MicroPython) running on RP2040. Listens on USB serial at 115200 baud for newline-terminated, comma-separated 4-byte hex arrays (e.g., `20,df,09,f6\n`). Echoes prefixed status messages: `[SYS]`, `[HW]`, `[OK]`, `[ERR]`. IR output on GP0, status LED on GP16. Uses the compiled `adafruit_irremote.mpy` library in `firmware/lib/`.

### Hardware (`hardware/`)

KiCad project with five hierarchical schematics: main board, `power.kicad_sch`, `flash.kicad_sch`, `usb.kicad_sch`, and a breadboard `prototype/prototype.kicad_sch`. All custom symbols and footprints live in `hardware/LBD_Library/` — do not use external library paths.

### CI/CD

GitHub Actions deploys to GitHub Pages on push to `main` when `app/**`, `hardware/*.kicad_sch`, or the workflow file changes. The pipeline runs `generate_bom.py`, commits the updated BOM, then deploys via `peaceiris/actions-gh-pages`.

## Key Constraints

- **WebSerial only works in Chromium-based browsers** (Chrome, Edge, Opera). Firefox and Safari are unsupported — do not suggest workarounds that imply otherwise.
- **Firmware is CircuitPython**, not MicroPython. The VSCode CircuitPython extension (`joedevivo.vscode-circuitpython`) provides stubs; `.vscode/settings.json` is pre-configured for the RP2040 (VID `0x2E8A`, PID `0x101F`).
- **The PCB design is not finalized.** Prototype builds use breadboard/perfboard with `prototype.kicad_sch`.
- **No tests exist.** Verification requires copying to the board and observing behavior.
- **BOM generation is CI-only.** Running `generate_bom.py` locally is for development only and should not be committed before CI runs it.
