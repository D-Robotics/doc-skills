# English Documentation Style Guide

> **Audience**: Anyone writing English content for the doc site — the docs team (translating/rewriting) and developers filing PRs (lightweight operation).
> **Scope**: Writing conventions specific to **English** docs — headings, voice, capitalization, terminology. Chinese-specific typography (CJK spacing, full-width punctuation) lives in [writing-style-guide.md](writing-style-guide.md); this guide does not repeat it.
> **Enforcement**: **Reporting level — manual review for now, CI reporting after Vale Phase 3 lands.** Same posture as the Chinese guide. See §4.
> **Maintainer**: Documentation architecture team.

| Revised by | Version | Changes | Published |
| --- | --- | --- | --- |
| — | — | Not synced to Feishu, no revision records | — |

---

## 0. What this guide solves

English docs (`i18n/en/`) currently mix several heading and voice styles. A real sample from `rdk_x_doc`:

| File | Current heading | Problem |
|------|----------------|---------|
| `install_os/rdk_x3/01_system_burn.md` | `# 1.2.1.1 Full image flashing` | Manual numbering prefix (`1.2.1.1`) collides with Docusaurus auto-numbering; noun phrase where a how-to wants imperative |
| `install_os/rdk_x3/01_system_burn.md` | `## Using Rufus` | `-ing` phrase where a how-to step wants imperative |
| `download.md` | `### 🖥️ Ubuntu System Resources` | Emoji in heading — breaks screen readers, CAT tools, and consistency |
| `download.md` | `## Specifications, Schematics, and Design Resources Summary` | Title case — inconsistent with the sentence case used elsewhere |
| `bpu_api.md` | `# BPU (Algorithm Inference Module) API` | ✅ Correct — noun phrase for reference |

This guide gives a consistent direction so English docs read like one team wrote them.

---

## 1. Headings by document type

Heading style follows **what the reader is doing** with the page, not the topic. This aligns with the Diátaxis framework and the Google / Microsoft developer-docs style guides.

### 1.1 How-to / Quick start — imperative

Use the **bare imperative** (verb base form). Drop the "How to" prefix — the page *is* the how-to; restating it is redundant.

| ❌ Avoid | ✅ Use |
|---------|--------|
| Flashing system image | Flash the system image |
| Connecting the 4-Mic array | Connect the 4-Mic array |
| How to quantize the ONNX model | Quantize the ONNX model |
| Using Rufus | Flash with Rufus |

> The reader of a how-to wants to *do* something. The imperative puts the action first and scans as a task. `-ing` forms ("Flashing…", "Connecting…") read as descriptions, not instructions.

### 1.2 Explanation / Architecture — noun phrase or -ing for process

Use **noun phrases** for concepts and architecture. `-ing` is allowed **only when the heading describes a process** the reader is learning about, not the reader's action.

| ❌ Avoid | ✅ Use |
|---------|--------|
| Understanding the TROS middleware | TROS middleware overview / TROS middleware architecture |
| Introduction to model compilation | Model compilation process |
| Learning the BPU architecture | BPU architecture |
| Understanding quantization | Quantizing a model *(process — -ing ok)* |

> "Understanding the TROS middleware" describes the *reader's* action, not the topic. The heading should name the topic itself ("TROS middleware overview") so the table of contents reads as a subject index, not a list of homework.

### 1.3 Troubleshooting — problem statement or question

Use a **problem statement** (scannable) or a **question** (FAQ-style). When quoting a literal tool error, preserve its original casing in backticks.

| ❌ Avoid | ✅ Use |
|---------|--------|
| Flashing issues | Flashing fails: device not found |
| Device not detected problem | Why does flashing fail? |
| Solution for boot failure | Board does not boot after flashing |

> A scannable noun phrase with the concrete symptom lets a reader spot their problem in the TOC. Save full questions for FAQ-style pages. If `Device not found` is the tool's literal output, keep that casing inside backticks even under sentence case.

### 1.4 Reference — noun phrase

API references, config option lists, and specs use **noun phrases**. Function/option names are kept verbatim.

| ✅ Use |
|--------|
| BPU (Algorithm Inference Module) API |
| hbm_runtime API |
| Configuration options |
| sp_init_bpu_module *(function — verbatim)* |

---

## 2. Sentence case for headings and titles

Use **sentence case** for headings and page titles: capitalize only the first word and proper nouns. Do **not** use title case.

| ❌ Title case | ✅ Sentence case |
|--------------|-----------------|
| Specifications, Schematics, and Design Resources Summary | Specifications, schematics, and design resources |
| Connect The 4-Mic Array | Connect the 4-mic array |
| Download Resources Summary | Download resources |

> Sentence case is the developer-docs norm (Google, Microsoft, GitHub). It reads quieter and avoids the "which words get capitalized" argument. **Proper nouns follow [glossary.json](glossary.json)** — so it is `Flash the system image using XBurn`, not `using xburn` (XBurn is the standard casing per the glossary; `xburn`/`Xburn` are listed errors).

### 2.1 No manual numbering in headings

Do **not** hand-write numbering prefixes (`1.2.1.1`, `1.7`) in H1. Docusaurus generates sidebar numbering automatically; a manual prefix collides with it and drifts when pages move.

| ❌ Avoid | ✅ Use |
|---------|--------|
| `# 1.2.1.1 Full image flashing` | `# Flash the full system image` |
| `# 1.7 Download Resources Summary` | `# Download resources` |
| `# 1.2.1.4 FAQ` | `# Flashing FAQ` *(or rephrase as a noun phrase)* |

### 2.2 No emoji in headings

Do not put emoji in headings or page titles. They break screen readers, complicate CAT translation, and render inconsistently across the TOC.

| ❌ Avoid | ✅ Use |
|---------|--------|
| `### 🖥️ Ubuntu System Resources` | `### Ubuntu system resources` |
| `### ⚙️ Buildroot System Resources` | `### Buildroot system resources` |

> If a visual cue is genuinely needed, use an admonition (`:::info`) or an icon component — not a raw emoji in the heading text.

### 2.3 Sentence case for all UI text — not just headings

Sentence case applies to **every piece of UI text you write into the docs**, not only headings and page titles. This includes button labels, menu items, tab labels, dialog box titles, card and section titles, sidebar and navigation dropdown labels, tooltips, body text, and image `alt`.

Do **not** use title case for UI controls. The industry standard (Microsoft Writing Style Guide) is sentence case across the board — buttons, checkboxes, menus, dialog boxes, tabs, toggles, panes, and palettes all use sentence case, with title case reserved for proper nouns (product and brand names) only.

| UI element | ❌ Title case | ✅ Sentence case |
|-----------|--------------|------------------|
| Button | Start Flash / Download PDF / Open Log | Start flash / Download PDF / Open log |
| Dialog / popup title | Flash Configuration Settings | Flash configuration settings |
| Navigation / Tab / menu | Hardware Guides · Flash Tools · PCN Notices | Hardware guides · Flash tools · PCN notices |
| Card / page title | Product Change & EOL Notices | Product change & EOL notices |
| Sidebar / nav dropdown | Firmware Release Notes | Firmware release notes |
| Body text / tooltip / `alt` | This Tool Supports Flashing eMMC and SPI NOR Images. | This tool supports flashing eMMC and SPI NOR images. |
| `alt` (serial screenshot) | MobaXterm Serial Screenshot of U-Boot Countdown | MobaXterm serial screenshot of U-Boot countdown |

**Two exceptions:**

1. **Proper nouns keep their standard casing** — governed by [glossary.json](glossary.json), not by title case. So it is `using XBurn`, `flashing eMMC`, `via NVMe`, `RDK S100` — never `using Xburn`, `flashing Emmc`, `via Nvme`, or `RDK S100` getting title-cased into `Rdk S100`. Title case never overrides the glossary.
2. **Match the UI when quoting a literal label** — if you reproduce an exact button/option label as it appears on screen and it happens to be title case (or all caps), preserve that casing (typically inside backticks). This is "match the UI" — it does not license you to title-case UI text you are *writing*, only to quote faithfully what already exists.

> **Why sentence case, not title case, for controls?** Two reasons. First, it is the developer-docs norm (Microsoft, Google, GitHub all use sentence case for UI labels); title case for buttons reads as marketing copy, not an interface. Second, title case collides with the glossary: a rule that says "capitalize every word" would force `NVMe`→`Nvme`, `eMMC`→`Emmc`, `RDK S100`→`Rdk S100` — all wrong. One casing rule (sentence case + glossary for proper nouns) is simpler and has no such collisions. This is consistent with §2 above and defers to the glossary exactly as §2 already does.
>
> **Relationship to Chinese UI-writing rules**: the Chinese guide's [操作类文档写法](writing-style-guide.md) §5.2 says UI control names are **bold** and the values chosen in them are `inline code`; it does not set an English-letter casing rule for the control labels themselves. When a Chinese operation doc names an English-labeled control, apply this sentence-case rule to that English label too. Option *values* (like `USB`, `eMMC`, `NVMe`) always follow the glossary casing — see [ui-defect-backlog.md](ui-defect-backlog.md) for the workflow when the live UI shows them wrong.

---

## 3. Voice and tone

Four conventions that most improve scannability and consistency.

| Convention | Rule | Example |
|-----------|------|---------|
| Active voice | Prefer active over passive; passive only when the actor is irrelevant | "XBurn flashes the board" not "The board is flashed by XBurn" |
| Second person | Address the reader as "you"; avoid "we"/"the user" | "You can now reboot" not "The user can now reboot" / "We can now reboot" |
| Simple present | Use present tense for describing behavior | "The tool detects the device" not "The tool will detect the device" |
| One idea per sentence | Split long sentences; avoid run-ons | — |

| ❌ Avoid | ✅ Use |
|---------|--------|
| The image will be flashed by XBurn. | XBurn flashes the image. |
| Users can connect the board via Type-C. | Connect the board via Type-C. |
| After the device has been detected, the flashing will begin. | Once XBurn detects the device, flashing begins. |

> Active voice + "you" + present tense keeps instructions direct and short — the same posture as the Chinese UI-writing rules in [writing-style-guide.md](writing-style-guide.md) §5 (cut filler, lead with the action).

---

## 4. Enforcement and relationship to other guides

### 4.1 Reporting level, manual review for now

These rules **do not enter CI yet**. markdownlint and custom-checks do not check heading voice, capitalization, or emoji (they catch format/availability only — see [ci-pipeline.md](ci-pipeline.md) §4.2).

| Who | How |
|-----|-----|
| Docs team (rewriting/translating) | Apply this guide when producing English content; this is the quality backstop |
| Developers (lightweight PRs) | **Not required** — lightweight mode means the docs team does not rewrite dev prose (see [writing-baseline-rd.md](writing-baseline-rd.md) §3); English-style rules are not in the dev baseline |
| Docs team review | Periodic sweeps of `i18n/en/` against this guide |

> Heading voice and capitalization are things developers won't remember and CI won't catch — putting them in the dev baseline would create "required but unenforced" dead rules (same reasoning as the Chinese guide). The docs team converges them during rewrite/sweep.

### 4.2 After Vale Phase 3

Per [ci-pipeline.md](ci-pipeline.md) §2.2, the Vale style layer is Phase 3 (lowest priority). This guide's rules are inputs for Vale:
- **Phase 3 launch**: Vale flags title-case headings, "How to" prefixes, emoji in headings — CI **reports** (non-blocking).
- **After rules mature and false positives shrink**: promote from report to block.

### 4.3 Relationship to other guides

| Guide | What it covers | Relationship to this one |
|-------|---------------|--------------------------|
| [writing-style-guide.md](writing-style-guide.md) | Chinese typography (CJK spacing, full-width punctuation, 操作类文档写法) | Sibling — Chinese-specific; this guide is English-specific; neither repeats the other |
| [glossary.json](glossary.json) | Terminology — what things are **called** and their casing (`英文名称` field) | This guide defers to the glossary for proper-noun casing (XBurn, RDK S100, NVMe); do not invent casing here |
| [writing-baseline-rd.md](writing-baseline-rd.md) | Dev-required subset (factual accuracy, completeness) | English-style rules are **not** in the dev baseline — devs follow the baseline, docs team follows this guide |
| [ci-pipeline.md](ci-pipeline.md) | What CI checks and blocks | §4.2 here says which English rules enter CI and when |

---

## 5. Starter scope

This guide is a **minimum set**, covering the rules with the biggest scannability payoff:

1. Headings by type — imperative / noun-or-(-ing for process) / problem-or-question / noun phrase (§1)
2. Sentence case for headings, titles, and **all UI text** — buttons, menus, tabs, dialog titles, card titles, sidebar, body, `alt` (§2, §2.3)
3. Voice: active, second person, present tense, one idea per sentence (§3)

**Not yet covered** (add when Vale Phase 3 lands, on demand):

- Oxford comma policy
- Punctuation in and around code (periods inside/outside backticks)
- Number formatting (80 TOPS, 6-core, version strings)
- Link text conventions ("see X" vs bare URLs)
- List parallelism (every item starts the same part of speech)
- Admonition usage in English docs

> Same reasoning as the Chinese guide: at reporting level, more rules mean higher review cost with diminishing returns. Land the highest-impact rules first; expand as the enforcement mechanism (Vale) matures — rules and tooling grow together, avoiding "rules written, nobody enforces."
