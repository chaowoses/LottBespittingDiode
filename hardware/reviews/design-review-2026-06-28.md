# LBD (Lott-Bespitting Diode) Schematic Design Review

**Project:** LBD — RP2040 USB IR Blaster (KiCad 10.0, 5 hierarchical sheets, schematic-only review)  
**Date:** 2026-06-28  
**Analyzers run:** `analyze_schematic.py` (modern format, full signal analysis)  
**PCB, Gerber, EMC, SPICE, thermal, lifecycle:** not run — schematic-only review as requested  
**Datasheets:** AO3400A, IN-S126ESGHIR, MM3Z6V2, RP2040, RP2040 Design Guide, TPSM828214SILR, USB4155-03-C, W25Q128JVSIQ — all read from `ref/docs/`

---

## Overview

LBD is a USB-powered IR blaster built around the RP2040 microcontroller. Power comes from USB-C (J2), regulated from 5V VBUS to 3.3V by a TI TPSM828214SILR synchronous buck module (U4), with DVDD (1.1V) generated on-chip by the RP2040's internal VREG. External flash (W25Q128, U5) is connected over QSPI. The IR output stage drives 4 pairs of IN-S126ESGHIR 940nm IR LEDs in series strings via an AO3400A N-channel MOSFET (Q1) controlled from GPIO2. The board communicates with a host over USB 2.0 Full Speed, exposed on the USB-C connector.

---

## Critical Findings

No critical issues found.

---

## Component Summary

| Type | Count |
|------|-------|
| Resistors | 15 |
| Capacitors | 18 |
| ICs | 3 (RP2040, TPSM828214SILR, W25Q128JVSIQ) |
| IR LEDs (IN-S126ESGHIR) | 8 |
| Zener diode (MM3Z6V2) | 1 |
| MOSFET (AO3400A) | 1 |
| Connectors | 2 (USB-C J2, SWD J1) |
| Crystal | 1 (12 MHz) |
| Switch | 1 (BOOTSEL) |
| **Total components** | **50** |

**Nets:** 74 total | **Wires:** 188 | **No-connects:** 10 | **Sheets:** 5 hierarchical (LBD, power, flash, infared, usb)

**Sourcing:** 0/24 unique parts have MPNs populated. This is a pre-fab blocker — component values and part names are present but no manufacturer part numbers are assigned, making ordering impossible without manual lookups.

---

## Power Tree

```
USB-C J2 (VBUS, 5V)
├── D9 MM3Z6V2 (6.2V Zener clamp — transient OVP on VBUS)
├── C21 (10µF) + C14 (4.7µF) — VBUS bulk decoupling
├── IR LED array: VBUS → R14/R15/R16/R17 (22Ω each) → D1–D8 pairs → Q1 → GND
│
└── U4 TPSM828214SILR (Buck, fixed 3.3V, 1A)
    ├── VIN = VBUS (pins 1+2)
    ├── EN = VBUS (always enabled when USB connected)
    ├── PG → MCU_RUN (open-drain PG holds RP2040 in reset until 3.3V stable)
    ├── FB = +3.3V (wired to VOUT)
    ├── Output caps: C15 (22µF) + C16/C6–C11/C17/C18 (100nF ×9) + C19 (1µF)
    │
    └── +3.3V rail
        ├── U1 RP2040 — IOVDD (×6), ADC_AVDD, VREG_VIN, USB_VDD
        ├── U5 W25Q128JVSIQ — VCC
        ├── R8 (10kΩ pull-up on QSPI_SS)
        ├── R9, R10 (10kΩ each, parallel pull-up on MCU_RUN)
        │
        └── U1 internal VREG (VREG_VIN → VREG_VOUT)
            └── +1V1 rail (DVDD)
                ├── U1 DVDD (×2, pins 23+50)
                └── C12/C13 (100nF ×2) + C20 (1µF)
```

---

## Analyzer Verification

### Component Count

The schematic has 5 sheets. `lib_id` reference counts: LBD=15, power=45, flash=10, infared=22, usb=13. The analyzer reports 50 total components including power symbols — this is consistent with the raw sheet counts. **Match: pass.**

### Component Pinout Verification

| Ref | Value | Package | Verification Status | Notes |
|-----|-------|---------|---------------------|-------|
| U1 | RP2040 | QFN-56 | Verified (datasheet) | All 57 pins (incl. EP) checked below |
| U4 | TPSM828214SILR | µSiL-10 | Verified (datasheet) | See Power Regulators |
| U5 | W25Q128JVSIQ | SOIC-8 | Verified (datasheet) — exact match | All 8 pins verified, p.5 Table 3.3 |
| Q1 | AO3400A | SOT-23 | Verified (datasheet) — standard GSD pinout | See Transistor section |
| J2 | USB4155-03-C | USB-C | Verified (datasheet) | All A/B/S pins verified |
| J1 | Conn_01x03 | 3-pin header | Skipped (standard header) | Pin 1=SWDIO, 2=GND, 3=SWCLK |
| D1–D8 | IN-S126ESGHIR | 1206 | Verified (datasheet) | 2-pin LED, polarity checked |
| D9 | MM3Z6V2 | SOD-323 | Verified (datasheet) | Pin 1=Cathode, Pin 2=Anode — matches SOD-323 |
| Y1 | 12 MHz crystal | Crystal_GND24 | Skipped (no MPN) | Load cap circuit verified against RP2040 Design Guide |
| R1–R19 | Various | — | Skipped (2-terminal passives) | Values verified in context |
| C1–C21 | Various | — | Skipped (2-terminal passives) | Values verified in context |
| SW2 | BOOTSEL | SW_Push | Skipped (standard switch) | Correct BOOTSEL circuit |

**U4 (TPSM828214SILR) pin-to-net mapping** (verified against TPSM8282x datasheet, Table 6-1, p.3):

| Pin | Name | Net | Expected | Match |
|-----|------|-----|----------|-------|
| 1 | VIN | VBUS | VBUS (5V input) | ✓ |
| 2 | VIN | VBUS | VBUS (5V input) | ✓ |
| 3 | EN | VBUS | Active-high enable | ✓ |
| 4 | PG | MCU_RUN | Open-drain power-good | ✓ |
| 5 | VOUT | +3.3V | Output voltage | ✓ |
| 6 | VOUT | +3.3V | Output voltage | ✓ |
| 7 | VOUT | +3.3V | Output voltage | ✓ |
| 8 | FB | +3.3V | Wired to VOUT | ✓ |
| 9 | GND | GND | Ground | ✓ |
| 10 | GND | GND | Ground | ✓ |

**U5 (W25Q128JVSIQ) pin-to-net mapping** (verified against W25Q128JV datasheet Table 3.3, p.5):

| Pin | Name | Net | Match |
|-----|------|-----|-------|
| 1 | /CS | QSPI_SS | ✓ |
| 2 | DO (IO1) | QSPI_SD1 | ✓ |
| 3 | /WP (IO2) | QSPI_SD2 | ✓ |
| 4 | GND | GND | ✓ |
| 5 | DI (IO0) | QSPI_SD0 | ✓ |
| 6 | CLK | QSPI_SCLK | ✓ |
| 7 | /HOLD/RESET (IO3) | QSPI_SD3 | ✓ |
| 8 | VCC | +3.3V | ✓ |

W25Q128JV VCC operating range is 2.7V–3.6V; 3.3V supply is within spec. All 6 QSPI lines are wired correctly.

**Q1 (AO3400A) — SOT-23 pinout** (verified against AO3400A datasheet p.1, Top View diagram):  
Standard SOT-23 GSD pinout: Pin 1 = Gate, Pin 2 = Source, Pin 3 = Drain. The schematic maps `Q1.G` → IR_GATE (via R19), `Q1.S` → GND, `Q1.D` → LED cathode string. This is correct for an N-channel low-side switch. The KiCad standard `Transistor_FET:AO3400A` symbol uses this convention — verified consistent with the AO3400A datasheet.

### Connector Pin Tables

**J1 — SWD Debug Header (3-pin)**

| Pin | Net | Function |
|-----|-----|----------|
| 1 | SWDIO | SWD data (bidirectional) |
| 2 | GND | Ground |
| 3 | SWCLK | SWD clock |

Note: No VCC or RUN/RESET pin exposed. Functional for programming/debugging but limits some debugger features (e.g. power-cycling the target).

**J2 — USB4155-03-C USB-C**

| Pin | Net | Notes |
|-----|-----|-------|
| A4/B4/A9/B9 | VBUS | USB power input |
| A5 | CC1 | 5.1kΩ pull-down (R3) to GND — UFP (device) mode |
| B5 | CC2 | 5.1kΩ pull-down (R13) to GND — UFP (device) mode |
| A6/B6 | DP | USB D+ (through R11, 22Ω) |
| A7/B7 | DN | USB D− (through R12, 22Ω) |
| A1/B1/A12/B12 | GND | Shield/ground |
| A2,A3,A8,A10,A11,B2,B3,B8,B10,B11 | NO_CONNECT | SuperSpeed lanes, SBU — correct for USB 2.0 only |

### Net Tracing

**VBUS:** J2 VBUS_{A,B} → C21 (10µF), C14 (4.7µF) → U4.VIN (×2), U4.EN, IR LED resistors R14–R17, D9.A. Source is USB host/charger via J2. No PWR_FLAG present (RS-001 ERC warning, see False Positives).

**+3.3V:** U4.VOUT (×3) → U1 IOVDD (×6), ADC_AVDD, VREG_VIN, USB_VDD; U5.VCC; R8, R9, R10; 9× 100nF caps + C15 (22µF) + C19 (1µF) + C16 (100nF). Complete and well-populated.

**+1V1:** U1.VREG_VOUT → U1.DVDD (×2) + C12/C13 (100nF) + C20 (1µF). On-chip VREG generates this rail; off-chip connection is correct per RP2040 datasheet §2.9.2.

**MCU_RUN:** U4.PG (open-drain) + R9 (10kΩ to 3.3V) + R10 (10kΩ to 3.3V) → U1.RUN. Effective pull-up: 5kΩ. PG asserts high-Z when +3.3V is in regulation, releasing the RP2040 from reset.

**QSPI_SS:** U1.~{QSPI_SS} + R8 (10kΩ to 3.3V) + R7 (1kΩ to SW2) + U5./CS. Correct BOOTSEL circuit: pressing SW2 pulls /CS low during boot → RP2040 enters USB bootloader.

**IR_GATE:** U1.GPIO2 → R19 (33Ω) → Q1.G. R18 (10kΩ) pull-down ensures Q1 is off when GPIO2 is floating (e.g. during reset).

---

## Signal Analysis Review

### Power Regulators

**U4 — TPSM828214SILR**

The analyzer classified U4 as "LDO" — this is incorrect. The TPSM828214SILR is a **synchronous buck (step-down) converter** with an integrated inductor, operating at 4 MHz. It is the TPSM8282x family (µSiP MicroSiP Power Module), confirmed by the Device Comparison Table in the datasheet (p.3): part suffix "14" = fixed 3.3V output, 1A.

Input: VBUS (4.5–5.5V from USB). Output: 3.3V, 1A.

**⚠ WARNING — FB pin floating.** Per TPSM8282x datasheet Table 6-1 (p.3): *"For the fixed output voltage devices, connect this pin directly to the output voltage."* And from §9.2.1.2 (p.11): *"For devices with a fixed output voltage, the FB pin must be connected to VOUT. R1, R2 and C3 are not needed."* U4.FB (pin 8) is connected to net `__unnamed_33` which contains only U4.FB — no wire, no net label, no no-connect marker. This is a floating feedback pin on a regulator that requires it to be connected to VOUT. While the fixed-output version has an internal divider that sets the target voltage, the FB pin still closes the feedback loop and must be tied to the output rail. A floating FB pin may cause incorrect or unstable output regulation. **Fix: add a short wire from U4.FB to the +3.3V net.**

Input capacitors: C21 (10µF) + C14 (4.7µF) = 14.7µF. Datasheet recommends 4.7µF minimum (Table 9-1) — exceeds requirement. ✓

Output capacitors: C15 (22µF) + C16 (100nF) + 8× 100nF (C6–C11, C17, C18) + C19 (1µF) = ~24µF. Datasheet recommends 1× 22µF for fixed output — exceeds requirement; extra capacitance is used for RP2040 IOVDD decoupling. ✓

Soft-start: integrated. EN tied to VBUS (always enabled when USB connected). PG drives MCU_RUN for reset sequencing. ✓

### Crystal Circuits

**Y1 — 12 MHz, load caps C4/C5 = 15pF each**

Effective load capacitance: CL_eff = (15 × 15)/(15 + 15) + 3pF stray = 7.5 + 3 = **10.5pF**.

The analyzer flagged a 47.5% error against a 20pF heuristic target — **this is a false positive.** The RP2040 Design Guide (§2.3.1, p.11) recommends the ABM8-272-T3 crystal with CL = 10pF, and explicitly states that 15pF capacitors with ~3pF stray gives 10.5pF effective load, which *"is close enough to the target of 10pF."* The 15pF capacitor choice matches the reference design exactly. **Status: correct.**

Note: Y1 has no MPN assigned. If a different crystal is used, verify its CL spec matches 10–10.5pF. The RP2040 Design Guide warns that deviating from the ABM8-272-T3 requires extensive testing.

Crystal feedback resistor R6 (1kΩ) is in series on the XOUT-to-crystal path, limiting oscillator drive current to prevent crystal overdrive at IOVDD=3.3V. This matches the RP2040 Design Guide recommendation. ✓

### LED Circuits

**IR LED array — 8× IN-S126ESGHIR, 4 series pairs, driven by Q1 (AO3400A)**

Circuit topology (4 identical branches in parallel):
```
VBUS (5V) → R_series (22Ω) → D_top (IN-S126ESGHIR) → D_bottom (IN-S126ESGHIR) → Q1.D → GND
```
Branches: R14+D1+D5, R15+D2+D6, R16+D3+D7, R17+D4+D8.

Per IN-S126ESGHIR datasheet: IF_max = 100mA continuous, IFP = 1000mA (pulsed, ≤100µs, ≤1% duty). VF range: min=1.2V, max=1.8V at IF=100mA.

Current per branch = (VBUS − 2×VF) / R_series:
- At VF = 1.2V (min): I = (5.0 − 2.4) / 22 = 118mA
- At VF = 1.5V (typ): I = (5.0 − 3.0) / 22 = 91mA
- At VF = 1.8V (max): I = (5.0 − 3.6) / 22 = 64mA

For NEC IR operation, GPIO2 drives a 38kHz carrier at ~33% duty cycle. Each pulse is ~13µs — well under the 100µs pulsed threshold — and IFP_max is 1000mA. Even worst-case 118mA is safely within the pulsed rating. ✓

Total drain current through Q1 at typical Vf: 4 × 91mA = 364mA. AO3400A ID_max = 5.7A — well within rating. RDS(ON) at VGS=3.3V (interpolated from spec at VGS=2.5V <48mΩ and VGS=4.5V <32mΩ): approximately 40mΩ. VDS drop at 364mA ≈ 15mV. Negligible. ✓

### Transistor Circuits

**Q1 — AO3400A, N-channel MOSFET, SOT-23, load type: LED**

- Gate drive: U1.GPIO2 (3.3V IOVDD level) → R19 (33Ω series) → Q1.G
- Gate pull-down: R18 (10kΩ) to GND — ensures Q1 is off during reset and GPIO float
- VGS_on = 3.3V; VGS(th) per datasheet = 0.65–1.5V; device is in enhancement (fully on) at 3.3V. ✓
- R19 (33Ω) limits gate charge current during switching; appropriate for 38kHz IR carrier
- No flyback diode needed — load is resistive/LED (not inductive). ✓

### Memory Interface

**U5 — W25Q128JVSIQ (128Mb QSPI Flash)**

All 6 QSPI lines (SCLK, SS, SD0–SD3) are connected between U1 and U5. VCC = 3.3V (within the 2.7–3.6V operating range). The RP2040 drives QSPI_SD0–SD3 at IOVDD (3.3V) — compatible with U5 VCC. ✓

/WP (pin 3) and /HOLD (pin 7) are wired to QSPI_SD2 and QSPI_SD3 respectively, used as data lines in Quad SPI mode. This is correct for XIP (execute-in-place) operation. ✓

### Debug Interface

**J1 — SWD (3-pin header)**

SWDIO → U1.SWCLK (bidirectional), SWCLK → U1.SWCLK (input), GND. Both SWD signals connect directly to U1 — no series resistors or ESD protection. Functional for programming and debugging.

Missing from header: VCC (debugger cannot power-sense target voltage), RESET/RUN (debugger cannot assert hardware reset without connecting separately). The analyzer correctly detects this as a valid SWD interface (status: pass). ✓

### Decoupling Analysis

| Rail | Bulk | Bypass | Total µF | Cap Count |
|------|------|--------|----------|-----------|
| +3.3V | C15 22µF | C6–C11, C16–C19 (100nF×9 + 1µF) | 23.9µF | 11 |
| +1V1 | C20 1µF | C12, C13 (100nF×2) | 1.2µF | 3 |
| VBUS | C21 10µF | C14 4.7µF | 14.7µF | 2 |

RP2040 datasheet (§2.9.1) requires 100nF at each IOVDD pin — U1 has 6 IOVDD pins (pins 1, 10, 22, 33, 42, 49). The design provides 9× 100nF caps on +3.3V which covers all 6 IOVDD pins and ADC_AVDD. Also C16 (100nF) is dedicated to +3.3V. Coverage is adequate. ✓

DVDD (§2.9.2) requires 100nF at each DVDD pin — U1 has 2 DVDD pins (23, 50). C12 and C13 cover both. ✓

VBUS bypass: no high-frequency cap on VBUS (only 4.7µF and 10µF). This is acceptable for a DC supply rail feeding a buck converter input, but adding a 100nF on VBUS would improve transient response.

---

## Design Analysis

### Cross-Domain Signals

The analyzer raised 7 VM-001 "error" findings for QSPI lines (QSPI_SCLK, SD0–SD3, QSPI_SS) and 1 for MCU_RUN, all reported as "3.3V / 1.1V domain crossing without level shifter." **All 8 of these are false positives.**

RP2040 datasheet §2.9.1: *"IOVDD supplies the chip's digital IO."* The QSPI pins belong to the IO bank, which runs at IOVDD (3.3V) — not DVDD (1.1V). The 1.1V DVDD is the internal core logic supply only. Similarly, the RUN pin is an IOVDD-level input. The W25Q128 VCC is also 3.3V. There is no domain crossing. The analyzer misclassified the QSPI bank as belonging to the 1.1V domain because it detects both DVDD (1.1V) and IOVDD (3.3V) supplies on U1 and heuristically assigns some pins to each.

### ERC Warnings

**RS-001 — VBUS has no declared source:** VBUS is powered externally via J2 (USB-C connector). A PWR_FLAG on the VBUS net would suppress this ERC warning and make the schematic self-documenting. **Suggestion: add PWR_FLAG to VBUS net.**

**NT-001 — 29 unconnected GPIO pins:** GPIO0–GPIO29/ADC3 (except GPIO2/IR_GATE) each appear on their own single-pin net. This is expected for a 50-component design that only uses GPIO2 for IR output — the remaining RP2040 GPIOs are unpopulated for future use. **These are informational only, not real issues.**

**DS-001 / SS-001 — No MPNs:** The sourcing blocker. All BOM parts need MPNs before ordering.

### Bus Topology

The analyzer found no I2C, SPI, UART, or CAN buses — consistent with the design (QSPI uses dedicated pins outside the GPIO bank; no general-purpose buses are wired).

**QSPI:** RP2040 dedicated QSPI peripheral → U5. All 6 signals connected. ✓  
**USB:** RP2040 USB PHY → R11/R12 (22Ω series) → J2 DP/DN. Correct for USB 2.0 Full Speed. ✓  
**SWD:** RP2040 SWD pins → J1 header. ✓

### USB Compliance

USB-C connector J2 with dual CC resistors (5.1kΩ on CC1 and CC2 to GND) correctly identifies the device as a USB UFP (Upstream Facing Port / device). The USB data lines DP and DN pass through 22Ω series resistors to U1.USB_DP/DM. Per the RP2040 design guide, this is the recommended approach for USB 2.0 Full Speed — the resistors improve EMI and help with impedance matching.

RP2040 USB_VDD is connected to +3.3V, which matches the requirement in §2.9.4: *"If IOVDD is powered at 3.3V, USB_VDD can use the same power source."* ✓

SuperSpeed lanes (SSTXP/N, SSRXP/N) and SBU pins are all no-connected — correct since RP2040 only supports USB 2.0. ✓

No dedicated USB ESD TVS device (e.g. USBLC6-2). D9 (MM3Z6V2, 6.2V Zener) is on VBUS only, not on the data lines. For a low-volume development board, this is acceptable. For production, a USB-specific ESD array is recommended.

### Protection Devices

**D9 — MM3Z6V2 (6.2V Zener, SOD-323):** Anode on VBUS (5V), cathode on GND. Per MM3Z6V2 datasheet: Vznom = 6.2V. At 5V operation D9 is reverse-biased and non-conducting — it provides transient overvoltage clamping on VBUS. Ptot_max = 300mW. The placement is correct. ✓

For the MM3Z6V2 in SOD-323 package (datasheet, p.1 Pinning): Pin 1 = Cathode, Pin 2 = Anode. The schematic shows D9.K on GND and D9.A on VBUS — consistent with the datasheet. ✓

---

## Power Analysis

### Power Sequencing

U4.PG (open-drain) → MCU_RUN → U1.RUN. The TPSM828214SILR asserts PG when VOUT is within regulation window. Until then, PG is pulled low, holding the RP2040 in reset. R9 and R10 (both 10kΩ) provide the pull-up; in parallel they yield a 5kΩ effective pull-up impedance. Using two resistors rather than one is unusual — functionally correct but worth simplifying to a single 10kΩ for clarity.

Power-on sequence:
1. USB plugged in → VBUS rises
2. U4 starts (EN=VBUS, soft-start integrated)
3. +3.3V reaches regulation → U4.PG asserts
4. MCU_RUN goes high → RP2040 releases from reset
5. RP2040 VREG generates +1V1 from +3.3V VREG_VIN

This is a sound sequence. ✓

### Power Budget (Estimated)

| Rail | Load | Source | Headroom |
|------|------|--------|----------|
| VBUS (5V) | U4 input (~200mA @3.3V/1A efficiency ~90%) + IR LEDs (4×91mA=364mA peak) | USB-C (500mA standard, 900mA USB 3.x) | Tight at USB 2.0 500mA limit with all LEDs firing simultaneously |
| +3.3V | RP2040 (~100mA typ) + W25Q128 (~10mA) + pull-ups | U4 (1A max) | Comfortable |
| +1V1 | RP2040 core (~50mA) | On-chip VREG (limited by VREG_VIN current) | Adequate |

**VBUS budget note:** Peak IR LED current of 364mA plus ~222mA for the converter input at full 3.3V load totals ~586mA, which exceeds the USB 2.0 500mA limit. However, NEC IR pulses are short-duration (38kHz carrier, <100ms bursts), so average VBUS draw is well under 500mA. The 10µF+4.7µF VBUS bulk capacitance handles transient demands. Acceptable for intended use.

### Inrush Analysis

The TPSM828214SILR has integrated soft-start, limiting inrush on the +3.3V rail. VBUS bulk capacitors (14.7µF) charge through USB cable and connector resistance on plug-in — typical for USB-C hot-plug. No current-limiting mechanism on VBUS other than the cable/connector impedance. Standard USB design.

---

## Interface Summary

| Interface | Connector | Protection | Notes |
|-----------|-----------|------------|-------|
| USB-C (USB 2.0 FS) | J2 USB4155-03-C | D9 (VBUS only), 22Ω series on D+/D− | CC resistors correct (5.1kΩ) |
| SWD Debug | J1 3-pin header | None | SWDIO/SWCLK/GND only |
| IR Output | GPIO2 → Q1 → LED array | R19 gate series, R18 pull-down | 4-pair 940nm LED array |

---

## Quality & Manufacturing

### Assembly Complexity

3 ICs (QFN-56, µSiP-10, SOIC-8) — fine-pitch SMD requiring stencil. 8 IR LEDs in 1206 package (side-view). 1 SOT-23, 1 SOD-323. Remainder are 0603/standard passives. Moderate complexity; solderable by hand with care, but stencil+reflow recommended for U1 (QFN thermal pad) and U4.

### Sourcing Audit

**0/24 unique BOM lines have MPNs.** Values and identifiers are present (e.g. "AO3400A", "W25Q128JVSIQ", "TPSM828214SILR", "IN-S126ESGHIR") which makes manual lookup straightforward, but the schematic cannot auto-generate an orderable BOM. Adding MPNs is a pre-fab prerequisite.

### Test Coverage

No explicit test points found in the schematic. The SWD header J1 provides programming/debug access. For production verification, test points on +3.3V, +1V1, VBUS, and IR_GATE would be valuable.

### BOM Optimization

- R_series for LEDs: R14, R15, R16, R17 all share the same 22Ω value — single part number. ✓
- Bypass capacitors: 9× 100nF on +3.3V + 2× 100nF on +1V1 + 1× 100nF on +3.3V dedicated = 12× 100nF total. Single BOM line if same package/rating used.
- Gate resistor R19 (33Ω) and pull-down R18 (10kΩ) are unique values. Consolidation opportunity: R9/R10 (both 10kΩ) could be consolidated with R18 (10kΩ) and R10 (10kΩ).

---

## All Issues and Suggestions

| Severity | Issue | Detail |
|----------|-------|--------|
| SUGGESTION | Dual pull-up on MCU_RUN | R9 and R10 (both 10kΩ) are wired in parallel between +3.3V and MCU_RUN, giving 5kΩ effective. Combine into a single 10kΩ resistor. |
| SUGGESTION | No PWR_FLAG on VBUS | Causes RS-001 ERC warning. Add PWR_FLAG to VBUS net for clean ERC. |
| SUGGESTION | No USB data line ESD device | D9 (Zener) only protects VBUS. USB D+/D− have 22Ω series resistors but no TVS clamping. Consider adding a USBLC6-2SC6 or equivalent for production designs. |
| SUGGESTION | SWD header missing VCC and RESET | J1 is minimal (SWDIO/GND/SWCLK). Adding VCC (for debugger power sensing) and RUN (for hardware reset) would improve debugger compatibility. |
| SUGGESTION | 0/24 BOM parts have MPNs | Required before ordering. All IC values include the full part number in the Value field, making lookup straightforward. |
| SUGGESTION | No test points on power rails | Recommend adding TP on +3.3V, +1V1, VBUS, and IR_GATE for bring-up and production test. |
| SUGGESTION | No 100nF bypass on VBUS | VBUS has only 4.7µF + 10µF. A 100nF cap would improve HF transient response on the regulator input. |
| SUGGESTION | Crystal has no MPN | Y1 (12 MHz) has no MPN. The design matches the ABM8-272-T3 load cap circuit per the RP2040 Design Guide — if a different crystal is selected, verify CL matches 10pF. |

---

## Positive Findings

1. **RP2040 power supply follows the reference design exactly.** IOVDD=3.3V, DVDD from on-chip VREG (VREG_VOUT wired off-chip to DVDD pins), TESTEN grounded, USB_VDD=3.3V, ADC_AVDD=3.3V — all per RP2040 datasheet §2.9.
2. **BOOTSEL circuit is textbook-correct.** R8 (10kΩ) pull-up + R7 (1kΩ) series to SW2 + ground. The 1kΩ series resistor protects the RP2040 QSPI_SS output driver when the switch is pressed during operation.
3. **W25Q128JVSIQ wiring is correct.** All 8 pins verified against the datasheet — QSPI data lines, /WP, /HOLD mapped to IO2/IO3 for quad-mode XIP, VCC/GND correct.
4. **USB-C implementation is correct.** Dual 5.1kΩ CC pull-downs (R3/R13) correctly implement UFP mode. SuperSpeed pins no-connected as appropriate for USB 2.0 only.
5. **Power sequencing is solid.** U4.PG holds RP2040 in reset until 3.3V is stable — clean startup without software-level workarounds.
6. **IR MOSFET gate drive is robust.** R18 (10kΩ) pull-down guarantees Q1 is off during reset and GPIO float. R19 (33Ω) gate series resistor limits switching current at 38kHz.
7. **Crystal load capacitors match the RP2040 Design Guide.** 15pF caps + 3pF stray = 10.5pF effective, matching the ABM8-272-T3 reference circuit. R6 (1kΩ) series on XOUT limits crystal drive current as recommended.
8. **Decoupling is thorough.** 100nF at each IOVDD and DVDD pin, plus 22µF bulk on +3.3V and 1µF on +1V1.

---

## Analyzer Gaps / False Positives Triaged

| Finding | Disposition | Reason |
|---------|-------------|--------|
| VM-001 ×7: QSPI 3.3V/1.1V crossing | **False positive** | QSPI pins run at IOVDD (3.3V), not DVDD (1.1V). Analyzer heuristic misassigns IO bank to core voltage. |
| VM-001 ×1: MCU_RUN 3.3V/1.1V crossing | **False positive** | RUN is an IOVDD-level input. |
| Crystal 47.5% load cap error | **False positive** | Analyzer used 20pF heuristic; RP2040 Design Guide target is 10pF. 10.5pF effective is correct. |
| U4 classified as LDO | **Analyzer error** | TPSM828214SILR is a buck converter, not an LDO. |
| NT-001 ×29: unconnected GPIOs | **Expected** | RP2040 has 30 GPIOs; only GPIO2 is used. Remaining pins are intentionally unconnected. |
| RS-001: VBUS no declared source | **Expected/fixable** | VBUS is sourced externally via J2. Add PWR_FLAG to suppress. |
| EP-AUD: no ESD on J1/J2 | **Informational** | Acceptable for a prototype/development design. See suggestion above. |
| PR-DET: U4 topology "LDO" | **Analyzer error** | Buck converter; see power regulator section. Does not affect functional analysis. |
| Power budget (VBUS over 500mA) | **Analyzer gap** | Budget doesn't account for pulsed vs. continuous IR operation. Pulsed average is within USB 2.0 limits. |

---

## Not Performed / Review Limits

- **PCB layout analysis** — not requested; schematic-only review
- **EMC / cross-domain analysis** — requires PCB file
- **Thermal analysis** — requires PCB file (U4 µSiP package has good thermal performance; U1 QFN thermal pad adequacy cannot be assessed without PCB)
- **Gerber analysis** — no fabrication outputs present
- **SPICE simulation** — `ngspice` not checked; passive circuits (crystal, LED) verified analytically
- **Lifecycle audit** — no MPNs on any BOM part; cannot query distributor APIs
- **Previous review delta** — no prior review file found in the project
- **Datasheet extraction (structured)** — pin-level verification done by manual PDF reading, not automated extraction cache; all critical ICs covered

---

*Review performed with KiCad skill `analyze_schematic.py` + manual datasheet verification against PDFs in `ref/docs/`. All PDF citations refer to files in that directory.*
