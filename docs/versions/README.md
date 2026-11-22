# Design history and feedback log

> **Read it as a story:** [Fraud Signal Design Story](https://claude.ai/artifact/GdusjY27biDLL4jqm9JxaY) walks through every round with screenshots. A copy of that page is kept in [`docs/story/story.html`](../story/story.html); open it from a local clone to view it offline.

**How we keep this up to date:** every new round of feedback gets (1) a section here and in the story page, (2) screenshots in this folder named `round-N-…png`, and (3) a `round-N` branch with that round's code.

Every round of design feedback, what changed because of it, and why. Each round has screenshots and a saved copy of the code on its own branch, so you can open or run any earlier version.

All data is synthetic. Feedback is from the product designer reviewing the dashboard, lightly edited for spelling.

| Round | Feedback in short | What changed | Code |
|---|---|---|---|
| [1](#round-1-first-version) | Build a fraud data visualisation from the concept slides | Overview, case queue and case investigation | [`round-1`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-1) |
| [2](#round-2-wireframe-features-filters-and-toggles) | Is the wireframe included? Add filters and toggles | Risk Hub, At a glance, full profile, Examine and Mitigate, filters and toggles | [`round-2`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-2) |
| [3](#round-3-charts-show-their-values) | The small charts show no values when clicked | Hover or tap any card's trend line or histogram bar for values | [`round-3`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-3) |
| [4](#round-4-explain-the-fraud-types) | People won't know what the fraud types mean | Plain meanings, info icons and an explanations panel | [`round-4`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-4) |
| [5](#round-5-one-risk-hub-list-and-clear-buttons) | Bars and circles repeat each other; what does "Go" mean? | One row per fraud type, "Show 3 factors" button | [`round-5`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-5) |
| [6](#round-6-explain-the-findings-columns) | What do Substantiation, Mitigation and Unaligned mean? | Plain labels and info icons on each column | [`round-6`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-6) |
| [7](#round-7-who-decides-and-where-the-reason-goes) | Does the LLM decide? Where do I write my reason? | "You decide" statement, required reason, saved decision record | [`round-7`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-7) |
| [8](#round-8-the-case-snapshot-is-not-a-note) | Is the investigation note written by AI? | Read-only case snapshot, one optional notes field | [`round-8`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-8) |
| [9](#round-9-slds-2-design-system) | Use the SLDS 2 design system (Agentic Experiences) | SLDS 2 components and styling hooks; agentic cards and human feedback on AI content | [`round-9`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-9) |
| [10](#round-10-slds-2-component-rules) | Follow SLDS 2 component rules for everything | Cosmos theme, page headers, vertical navigation, button groups, SLDS cards, progress bars, activity timeline, SLDS typography | [`round-10`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-10) |
| [11](#round-11-navigation-active-state) | Why is there a half circle beside the active menu item? | Let SLDS 2 draw the vertical navigation's active state | [`round-11`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-11) |
| [12](#round-12-top-risk-factors-explained) | What do Cases and Points mean in Top risk factors? | Both measures on every row, "Most common / Biggest impact" sort, info icon | [`round-12`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-12) |
| [13](#round-13-design-system-and-storybook) | A design system in GitHub that designers and developers can use in live code, with separate documentation | Storybook, a separate design system site, DESIGN_SYSTEM.md, one import point | [`round-13`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/round-13) |

To run any round locally:

```bash
git checkout round-4
```

```bash
npm install && npm run dev
```

---

## Round 1: first version

> **Feedback:** "Create a fraud data visualisation based on the slides: observability, clean UI, modern."

**What we built**
- **Overview:** summary cards, alert volume by hour, risk score distribution, top risk factors, cases by type, data source health, and cases needing attention.
- **Case queue:** a sortable table with a risk marker on each row.
- **Case investigation:** risk gauge, AI fraud summary with exact figures, score breakdown, findings, source evidence, colour-coded Decline / Refer / Accept, and a pre-filled note.

**Principles applied:** exact figures instead of vague words; explain the score; evidence in one place; colour has meaning.

![Round 1 overview](round-1-overview.png)
![Round 1 case](round-1-case.png)

---

## Round 2: wireframe features, filters and toggles

> **Feedback:** "Is this [the early wireframe slide] included?" … "Can you have filters and toggles too?"

**What changed**
- Added the missing wireframe pieces: **Risk Hub** (a score for each fraud type), **At a glance**, a **full customer profile** (date of birth, address history and electoral roll, income, credit score and more), **Examine / Mitigate** on findings, and **"This is correct"** feedback on the AI summary.
- **Shared filters** on the Overview and Case queue: risk band, case type, data source, include decided. Clicking a case type or data source on the Overview filters by it.
- **Toggles:** time range (12h / 24h / 48h), auto-declined line, rank factors by cases or points, urgent cases only, signals column, compact rows, hide empty fraud types, flagged signals only.

![Round 2 overview](round-2-overview.png)
![Round 2 case](round-2-case.png)

---

## Round 3: charts show their values

> **Feedback:** "There's no info in the graphs, such as alerts, high-risk alerts and auto-declined, when I click on the graph, whereas Alert volume has it."

**What changed**
- Every summary card's trend line now shows the value for each hour on hover or tap.
- The **Open cases** and **SLA due < 1h** lines were decorative. They are now worked out from the actual cases, so the last point matches the number on the card.
- The **risk score distribution** shows the count, share and auto-decline status for each score range.

**Principle:** charts should be readable on their own and consistent with each other.

![Round 3 card hover](round-3-card-hover.png)
![Round 3 histogram hover](round-3-histogram-hover.png)

---

## Round 4: explain the fraud types

> **Feedback:** "I think people would not know what impersonation, false identity and false application mean in the Risk Hub." … "Can we have an info icon with help text on what they mean?"

**What changed**
- A **one-line plain meaning** on each fraud type, e.g. Impersonation: "Someone is using a real person's stolen details".
- An **ⓘ icon** with the full meaning and an example. It opens on hover, keyboard focus or tap, and stays on screen on phones.
- A **"What do these mean?"** panel listing the signals behind each type for this case.
- Fixed which fraud type each factor belongs to (e.g. a ported phone number is account misuse), and a type with no factors now scores 0.

**Principles:** plain language, not jargon; help where it's needed; numbers must agree with each other.

| Before | After |
|---|---|
| ![Before](round-4-risk-hub-before.png) | ![After](round-4-risk-hub.png) |

![Round 4 info popup](round-4-risk-hub-help.png)
![Round 4 explanations panel](round-4-risk-hub-explained.png)

---

## Round 5: one Risk Hub list and clear buttons

> **Feedback:** "In Risk Hub we have two, one with the bar and one with the circles. Isn't it the same information? And what does Go mean to the users?"

**What changed**
- Bars and rings merged into **one row per fraud type**: name with ⓘ, plain meaning, score bar, and a risk label (High, Medium, Low, None).
- **"Go" became "Show 3 factors"** (it narrows the summary and findings to that type), and **"Show all evidence"** to undo it.
- Types with no evidence say **"No evidence found"** instead of showing a button.
- "None" is grey, because green means low risk.

**Principles:** show each piece of information once; buttons say exactly what happens.

![Round 5 Risk Hub](round-5-risk-hub.png)
![Round 5 case](round-5-case.png)

---

## Round 6: explain the Findings columns

> **Feedback:** "In the Findings section, what do Substantiation, Mitigation and Unaligned mean?"

**What changed**
- A plain label under each column: **Supports fraud**, **Lowers the risk**, **Doesn't point either way**.
- An **ⓘ icon** on each with the full meaning and an example.
- The section description explains what **Examine** and **Mitigate** do.

The original terms were kept because fraud specialists use them; the plain labels make them clear to everyone else.

![Round 6 findings help](round-6-findings-help.png)

---

## Round 7: who decides, and where the reason goes

> **Feedback:** "Is the decision taken by the LLM?" … "If I decline, refer or accept, where will I leave my note on what basis I took the decision?" … "Where did this note come from, and who did this?"

**What changed**
- A clear statement in the Decision panel: **"You make the final decision. The AI summarises the evidence. The recommendation comes from the risk score, not from the AI."**
- A **required reason code** for each outcome (e.g. Decline: confirmed impersonation; Refer: a data source was unavailable or degraded; Accept: identity verified).
- A **required "Why did you make this decision?"** field in the specialist's own words.
- Choosing a different outcome from the recommendation shows a warning and is saved as an **override**.
- After recording, the panel keeps the **outcome, who, when, reason, explanation and note** visible, and the timeline records the reason.
- The pre-filled investigation note is labelled as **filled in automatically from case data, not written by anyone**.

**Principles:** the specialist decides, not the AI; every decision has a recorded reason; say where content comes from.

| Filling in a decision | After recording |
|---|---|
| ![Decision form](round-7-decision-form.png) | ![Decision recorded](round-7-decision-recorded.png) |

---

## Round 8: the case snapshot is not a note

> **Feedback:** "I saw that we still have an investigation note under it. Is this done by AI?"

**The answer:** no. It was filled in by a fixed template from the case data. Only the At a glance line inside it came from the AI summary. But the panel had three text boxes, and the pre-filled one looked like someone's written opinion.

**What changed**
- The pre-filled text is now a **read-only Case snapshot**, labelled "Built by a fixed template from the case data, not by AI and not by a person". The one AI-written line is marked with an **AI** badge.
- The snapshot is **attached to the decision automatically**, so reviewers see what the specialist saw. Nobody needs to edit it.
- The specialist writes in only two places: **Why did you make this decision?** (required) and a new, empty **Additional notes** box (optional).
- After recording, the decision shows Reason, Why, Notes, and a link to view the snapshot.

**Principles:** say where content comes from, and mark anything written by AI; one clear place to write; don't ask people to edit what the system already knows.

| Filling in a decision | After recording |
|---|---|
| ![Decision form](round-8-decision-form.png) | ![Decision recorded](round-8-decision-recorded.png) |

---

## Round 9: SLDS 2 design system

> **Feedback:** "Please make sure you use the SLDS 2 design system" (SLDS 2 Pattern – Agentic Experiences library in Figma).

**What changed**
- **SLDS 2 foundation:** the official `@salesforce-ux/design-system-2` stylesheet (Lightning Blue). Every colour, font, radius and shadow now comes from SLDS 2 global styling hooks, and the system font replaces Inter.
- **SLDS 2 components:** buttons (neutral, brand, destructive, success), select menus, text areas, checkbox toggles, the path for case progress, default tabs for source evidence, tables, badges and toast messages.
- **Agentic patterns, only on AI content**, following the library's "use with restraint" principle:
  - **Agentic card** for the AI fraud summary and At a glance: sparkle icon tile, aurora gradient border, a glow that follows the cursor, and an aurora shadow on hover.
  - **At a glance** uses the Purple-95 fill and sparkle for an agentic outcome.
  - An **AI summary** label and a disclaimer: "Generated by AI from 4 data sources. Check important details in Source evidence before you decide."
  - **Human feedback** button group (👍 helpful, 👎 not helpful, copy). 👎 opens "Why wasn't it helpful?" with Inaccurate, Incomplete, Biased toxic or harmful, Inappropriate tone or style, Other, and "Tell us more". A "Thanks for your feedback" toast confirms it. This replaces "This is correct / Something's wrong".
- **Dark mode:** SLDS 2 Lightning Blue is light only, so dark mode is built from SLDS 2's own neutral and palette colours and re-points the SLDS hooks so components follow.

**Principles:** use the organisation's design system; mark AI content consistently and sparingly; a standard way to give feedback on every AI response.

![Round 9 overview](round-9-overview.png)

| AI summary with feedback | Dark mode |
|---|---|
| ![AI summary with feedback popover](round-9-ai-summary-feedback.png) | ![Case in dark mode](round-9-case-dark.png) |

---

## Round 10: SLDS 2 component rules

> **Feedback:** "There is the web component library for SLDS 2. Can you make sure we have used the design system rules, from typography, text, tables, buttons, filters, colours, cards, timeline to everything?" (Components for Web | Lightning Design System 2)

**Finding:** the Figma library is drawn in SLDS 2's **Cosmos** theme (the Enhanced Lightning UI), but round 9 used the older **Lightning Blue** theme. That explained most of the differences: square buttons, bold headings, a different blue, and no built-in dark mode.

**What changed, by area**

| Area | Before (round 9) | Now (SLDS 2 rule) |
|---|---|---|
| Theme | Lightning Blue | **Cosmos**: brand blue #066afe, navy heading text, 1.25rem container radius |
| Dark mode | Hand-built from palette ramps | **Built into SLDS 2 Cosmos** (light-dark hooks); no custom colours |
| Typography | Bold headings, uppercase labels, Inter-like sizes | **Regular-weight headings** in heading colour on the SLDS type scale; **sentence-case labels** in the form-label style |
| Page header | Plain page title | **SLDS page header**: object icon, object label and title; list view meta line ("112 of 148 items · Sorted by…"); **record header** with breadcrumb and a row of key fields |
| Navigation | Custom links | **SLDS vertical navigation** with sections |
| Buttons | Square | **Pill buttons** (neutral, brand, destructive, success) |
| Filters | Custom chips and segmented controls | **Checkbox button group** for risk levels (multiple choice); **radio button groups** for time range, Cases/Points, Findings source and theme (single choice) |
| Cards | Custom border, radius and shadow | **slds-card** for every card; titles regular weight |
| Tables | Custom | **SLDS data table** with link-blue case IDs, as in the list view |
| Bars and meters | Custom tracks | **SLDS progress bar** |
| Badges | Custom pills | **slds-badge** with semantic containers |
| Timeline | Custom list | **Activity timeline**: coloured icon circles, connecting line, link-blue titles, time on the right |
| Customer profile | Two-column list | **Stacked read-only fields**, as in the record page "About" card |
| Chart colours | Semantic text colours | **SLDS 2 data palette** (red-60, orange-70, teal-60, blue-60); text keeps semantic colours for contrast |

**Still custom, because SLDS 2 has no component for them:** the charts (drawn with SLDS colours), the Risk Hub rows and the agentic glow.

![Round 10 overview](round-10-overview.png)
![Round 10 record header](round-10-record-header.png)

| Case page | Queue in dark mode |
|---|---|
| ![Round 10 case](round-10-case.png) | ![Round 10 queue dark](round-10-queue-dark.png) |

---

## Round 11: navigation active state

> **Feedback:** "Why do we have this half circle on the side? Can you align with SLDS 2?"

**Cause:** SLDS 2 marks the active navigation item with a full-width tint and a **straight 4px accent bar** on the left edge. Our own pill-shaped background and rounded corners sat on top of it and bent the bar into a half circle.

**What changed**
- Removed the custom radius, background and colours from the navigation. SLDS 2 now draws the active, hover and section-title styles itself.
- The navigation runs edge to edge in the sidebar, as in SLDS, so the bar sits on the sidebar's edge.

**Principle:** when the design system has a component, don't restyle it; set layout only.

| Before | After |
|---|---|
| ![Navigation before](round-11-nav-before.png) | ![Navigation after](round-11-nav-after.png) |

---

## Round 12: Top risk factors explained

> **Feedback:** "On the Top risk factors, what do Cases and Points mean?"

**The answer:** *Cases* is how many cases a factor appears in (how common it is). *Points* is the average number of points it adds to a case's 0–100 risk score when it appears (how serious it is). The screen only showed one of these at a time, under one-word labels.

**What changed**
- Every row shows **both numbers**, e.g. "85 cases · +15 pts". The one being sorted by is in bold.
- The switch is now **"Sort by: Most common | Biggest impact"**.
- An **ⓘ** next to the title explains both measures, and that a factor can be common but minor, or rare but serious.
- Factor names sit on their own line above the bar, so they're never cut off.

**Principles:** say what a number measures; show related numbers together; buttons say what they do.

| Sorted by most common | Info popup |
|---|---|
| ![Top risk factors](round-12-top-risk-factors.png) | ![Top risk factors help](round-12-top-risk-factors-help.png) |

---

## Round 13: design system and Storybook

> **Feedback:** "Is it possible to create a design system file in GitHub on typography, colour, card and info icon, whatever is relevant for observability, so developers and designers can work in live code?" … "Also have documentation like the story, a storybook for the design system, which is separate?"

**What we built**
- **Storybook** (`npm run storybook`): Introduction, Foundations (colour, typography, spacing and shape), Components (card, metric card, info icon, badges, button, filters, page header, progress bar, risk score cell, activity timeline), Charts and AI patterns. Each story has **editable controls**, a docs tab, and a **light/dark switch** in the toolbar. Telemetry is turned off.
- **A separate design system site** (`npm run dev:ds`, and its own shareable link): every foundation and component rendered live, **copyable code**, and **do / don't rules**. Colour swatches read their values from the running page, so they're always current in both themes.
- **`DESIGN_SYSTEM.md`**: principles, token tables mapped to SLDS 2 hooks, typography, a component table with rules, writing guidance, and how to add a component.
- **`src/design-system/index.ts`**: one import point for every shared component.
- The GitHub Pages deploy now also publishes Storybook at `/storybook/` and the design system site at `/design-system.html`.
- Fixed while building the chart stories: the alert chart's y-axis could show decimal labels on small data; it now always uses whole numbers.

| Design system site | Storybook |
|---|---|
| ![Design system site](round-13-design-system-site.png) | ![Storybook info icon story](round-13-storybook.png) |

![Storybook colour tokens in dark mode](round-13-storybook-colour-dark.png)

---

### Earlier branch names

Before this log, three versions were saved as `version-1`, `version-2` and `version-3`. They are the same code as `round-3`, `round-4` and `round-5`.
