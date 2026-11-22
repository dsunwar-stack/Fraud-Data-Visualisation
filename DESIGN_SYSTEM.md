# Fraud Signal design system

The shared foundations, components and rules for Fraud Signal, a fraud observability dashboard. Built on **SLDS 2 (Cosmos theme)** and the **SLDS 2 Agentic Experiences** patterns for AI content.

| Where | What it's for |
|---|---|
| **Storybook** (`npm run storybook`) | Live components with editable controls, docs and a light/dark switch. For designers and developers working in live code. |
| **Design system site** (`npm run dev:ds`, or the shared link) | One page with every foundation and component, code to copy, and do/don't rules. |
| **`src/design-system/index.ts`** | The one place to import shared components from. |
| **`src/styles.css`** (top) | Design tokens: CSS variables mapped to SLDS 2 styling hooks. |
| **This file** | The rules. |

## Run it

```bash
npm install
```

```bash
npm run storybook
```

Storybook opens at http://localhost:6006. To run the design system site instead:

```bash
npm run dev:ds
```

## Principles for observability

1. **Big picture first, then evidence.** Overview → queue → case.
2. **Exact figures, not vague words.** Counts and time windows, never "recent".
3. **Explain every number.** Say what it measures and where it comes from; use an info icon if it needs more than a few words.
4. **Colour has meaning.** Red, orange and teal are risk levels. Purple is only for AI. Blue is for actions and links.
5. **Show related numbers together**, and each piece of information once.
6. **Buttons say what happens.** "Show 3 factors", not "Go".
7. **The person decides, not the AI.** Mark AI content and collect feedback on it.
8. **Use the SLDS 2 component;** set layout only, never restyle its colours or shape.

## Colour tokens

Tokens are CSS variables in `src/styles.css`. Each points at an SLDS 2 styling hook, so light and dark mode come from SLDS 2 itself (`light-dark()`). Never use a hex value in a component.

| Token | Use | SLDS 2 hook |
|---|---|---|
| `--bg` | Page background | `surface-2` |
| `--surface` | Card background | `surface-container-1` |
| `--surface-2` | Subtle fill, table header | `surface-container-2` |
| `--border` | Borders and dividers | `border-1` |
| `--heading` | Headings, metric values | `on-surface-3` |
| `--text` | Body text | `on-surface-2` |
| `--muted` | Labels, captions, help | `on-surface-1` |
| `--primary` | Links, active, selected | `accent-2` |
| `--risk-high` / `-soft` | High risk text / badge fill | `error-1` / `error-container-1` |
| `--risk-medium` / `-soft` | Medium risk text / badge fill | `warning-1` / `warning-container-1` |
| `--risk-low` / `-soft` | Low risk text / badge fill | `success-1` / `success-container-1` |
| `--viz-high` | Chart fill, high risk | `palette-red-60` |
| `--viz-medium` | Chart fill, medium risk | `palette-orange-70` |
| `--viz-low` | Chart fill, low risk | `palette-teal-60` |
| `--viz-brand` | Chart fill, neutral measures; series 1 | `palette-blue-60` |
| `--viz-series-2` | Second series (dashed line or second stack) | `palette-indigo-40` |
| `--viz-status` | Status bars on a case timeline (Case Tracker) | `palette-neutral-70` |
| `--viz-sub` | Sub-step bars on the waterfall (Case Tracker) | `palette-blue-70` |
| `--dept-1` … `--dept-5` | Categories such as departments, in order of first appearance | `palette-blue-50`, `orange-60`, `teal-60`, `pink-50`, `purple-60` |
| `--ai-fill` / `--ai-ink` / `--ai-line` | AI content only | `palette-purple-95` / `-40` / `-80` |

**Do** use `--viz-*` for chart fills and `--risk-*` for text and badges. **Don't** use a risk colour for decoration, or purple for anything that isn't AI.

## Typography

System font stack from SLDS 2. Headings are regular weight; emphasis comes from size and colour.

| Role | Class / spec |
|---|---|
| Page title | `slds-page-header__title` · `font-scale-5` (1.75rem) · 400 · `--heading` |
| Card title | `h2` · `font-scale-3` (1.25rem) · 400 · `--heading` |
| Metric value | `.kpi-value` · `font-scale-5` · 400 · tabular numbers |
| Body | 0.8125rem · 400 · `--text` |
| Label | `.kpi-label` · 0.75rem · `--muted` · sentence case |
| Caption / help | `.sub` · 0.75rem · `--muted` |
| IDs and raw values | `.mono` |
| Numbers in tables | `.num` (tabular numbers), right-aligned |

**Do** write labels in sentence case and show times in UTC with the zone. **Don't** use uppercase labels or bold headings.

## Components

Import from `src/design-system`. Each has a Storybook story with controls.

| Component | Use it for | Rules |
|---|---|---|
| **Card** (`.slds-card.card` + `.card-h`) | Every block of content | Title, one-line description, optional control on the right. Don't add your own border, radius or shadow. |
| **Page header** (`PageHeader`) | Top of every screen | Same container look as cards: SLDS 2 Cosmos gives containers **no border and no shadow**, only the surface colour and 20px radius. Don't add a border to one container type and not the others. |
| **Metric card** (`.kpi` + `Sparkline`) | The 3–6 numbers that answer "is something wrong?" | Always pass `labels` so the trend line shows values on hover. Say what a change compares against. |
| **InfoTip** (ⓘ) | Specialist terms and numbers whose meaning isn't obvious | Plain meaning first, then an example. Also show a one-line plain label on screen. No links or buttons inside. |
| **Badges** (`.slds-badge`) | Risk level, status, source, AI | Risk badges show the word, not only colour. The AI label only on AI-written content. |
| **Buttons** (`slds-button_*`) | Actions | See *Button hierarchy* below. |
| **Decision outcome** | Choosing Decline, Refer or Accept | Pick the outcome with a **RadioButtonGroup**, with the recommendation on a line below. Record with **one primary (brand) button** whose label says the outcome: "Record decline". |
| **CheckboxButtonGroup** | Filters where several can be on | e.g. risk levels |
| **RadioButtonGroup** | Exactly one choice | e.g. time range, sort order, theme |
| **Toggle** | On/off settings | e.g. "Include decided" |
| **Select** (`.slds-select`) | Long lists | e.g. case type |
| **PageHeader** | Top of every page | Object icon, label, title; list views add a meta line; records add breadcrumb and key fields. |
| **ProgressBar** | Meters (scores, shares) | Colour by risk only when it shows risk. |
| **ScoreCell** | Risk in tables | Word, number and bar together. Bands: low 0–39, medium 40–69, high 70–100. |
| **ActivityTimeline** | What happened on a case | Newest first; titles say what happened, detail says who. |
| **Charts** (`AlertVolume`, `ScoreHistogram`, `RiskGauge`, `BarList`, `Sparkline`, `TrendChart`, `ColumnChart`) | Trends and distributions | Follow [Charts and graphs](#charts-and-graphs): answer first, one axis, hover values, numbers that agree. |
| **AgenticCard**, **AgenticIcon**, **FeedbackGroup** | AI-generated content only | AI label, disclaimer and feedback (helpful, not helpful with reasons, copy) on every AI output. |
| **Toast** (`useToast`) | Confirming an action | Short and specific: "Thanks for your feedback." |
| **ScopedNotification** | Advisory status inside a card or panel | Not dismissible. Icon + one or two lines + at most one link. Default = neutral note; Info = context (who decides, filtered view, alert spike); Warning = needs care (degraded source, SLA due within 1h, override); Error = needs action (SLA breached); Success = completed action (decision recorded). Put it at the top of the card it's about. |

## Charts and graphs

Rules for every chart in Fraud Signal and [Case Tracker](#chart-components). Colours are SLDS 2 palette tokens, checked as described in [Chart colours](#chart-colours).

### Start with the question, then pick the chart

| Question | Use | Not |
|---|---|---|
| Is this number normal? | Metric card with a **Sparkline** | A number on its own |
| How is it changing over time? | **TrendChart** (line, 1–3 series) or **AlertVolume** (stacked columns per hour) | Pie, donut |
| How do categories compare? | **BarList** (horizontal bars) or **ColumnChart** | Pie, donut, 3D |
| What's coming, against capacity? | **ColumnChart** with a capacity line | A gauge |
| How is a score spread? | **ScoreHistogram** with the threshold marked | |
| Where did the time go on one case? | **DeptBars**: one total split by status, department and sub-step, waiting shown | Donut, ring gauges |
| In what order did things happen, and where did it wait? | **Waterfall**: status, step and sub-step on one time axis | Stacked bars that hide order |
| One score against its bands | **RiskGauge** / score bar with band thresholds | A ring gauge with no target |

**Answer first.** Put a one-line answer in words above the chart ("94h 36m of 144h 38m was waiting, most of it before Treasury"). The chart is the evidence, not the message.

### Rules for every chart

1. **One axis per chart.** Two measures with different units are two charts.
2. **A real scale:** even steps in one format (`0h, 24h, 48h`). Never a list of values as ticks; minutes never go past 59.
3. **Numbers must agree.** A total shown in a sentence, a tile, a bar and a legend is the same number. Keep values exact; round only when showing or exporting.
4. **Don't add nested levels together.** Status, step and sub-step are the same time seen three ways: show them as three rows that each reach the same total, never as parts of one donut.
5. **Show waiting.** Time when nobody is working (queues, handovers) gets its own hatched part. It's usually where time can be saved.
6. **Counts and hours, not percentages,** unless the percentage is the measure (it can go in the tooltip).
7. **Label the data, not only the legend.** Put the name (and value if it fits) on bars; show a legend for 2+ series with real values (never `00:00` for a category that has time). Show only categories present.
8. **Colour is never the only cue:** labels, a dashed second line, hatching for waiting, an outline for "now".
9. **Hover or tap shows the exact values** on every chart; hit areas are bigger than the marks.
10. **Mark what matters:** a dashed red line for a target or alert, a dashed grey marker where an incident started, an outline on the current item.
11. **No pies, donuts, 3D or ring gauges without a target.** People compare lengths far better than angles.

### Chart colours

| Job | Colours | Rule |
|---|---|---|
| Risk level | `--viz-high` / `--viz-medium` / `--viz-low` | Only for risk. Red is also for breaches, alerts and targets. |
| One measure | `--viz-brand` | Default for any single series. |
| Two series | `--viz-brand` + `--viz-series-2` (dashed) | Checked for colour-blind separation. |
| Categories (departments, teams) | `--dept-1` … `--dept-5` | **Maximum 5.** Assign in order of first appearance, never cycled. More than 5: group the rest as "Other" or use labels and one colour. |
| Status and waiting | `--viz-status` (grey), hatched pattern | Grey for status, stripes for waiting, so they never compete with categories. |
| AI | Purple (`--ai-*`) | Never in charts. |

- **Why 5, not 8:** eight SLDS palette colours can't be told apart reliably, for colour-blind users or even for everyone (four blues in one chart look the same). Five pass every check.
- **Text on coloured bars:** white on blue-50 and pink-50; near-black on orange-60, teal-60 and purple-60 (4.5:1 contrast).
- **Dark mode:** chart colours come from SLDS `light-dark()` tokens, except the categorical set: SLDS swaps orange, teal and purple for darker steps that lose contrast on a dark surface, so dark mode keeps the light-mode steps.
- **Check new colours** with the palette validator before using them (colour-blind separation, lightness, contrast against the surface), in light and dark mode.

### Chart components

| Component | Where | Notes |
|---|---|---|
| `Sparkline` | Both | In metric cards; pass `labels` so hover shows values. |
| `AlertVolume`, `ScoreHistogram`, `RiskGauge`, `BarList` | Fraud Signal | `src/components/charts.tsx` |
| `TrendChart` | Both | Lines over time; optional area, threshold line and incident marker. |
| `ColumnChart` | Both | Stacked counts per bucket; optional capacity line per column. |
| `Waterfall` | Case Tracker | Status, step and sub-step on one time axis; waiting hatched; current outlined; target line. |
| `DeptBars` | Case Tracker | One total split three ways (status, department, sub-step) with waiting; totals at the end of each row; legend with real times. |

## Risk thresholds

Defined once in `src/data.ts` (`THRESHOLDS`) and shown with the `RiskThresholds` component wherever a score drives a decision. **Placeholder values, to be confirmed by fraud policy.**

| Band | Score | SLA | Recommendation |
|---|---|---|---|
| High | 70–100 | 4h | Decline |
| Medium | 40–69 | 24h | Refer |
| Low | 0–39 | 48h | Accept |

- **Auto-decline:** alerts scoring 85+ are declined automatically. Shown as a red marker on the score bar.
- **Adjusting a score:** if the adjusted score falls in another band, show a warning with that band's recommendation. Adjustments of **30+ points or across two bands** show an error and should go to a second reviewer (Refer).

## Evidence card (Version B)

Bring data from every platform into **one card grouped by the specialist's question**, not by source system: **Money · Behaviour · Account changes · Identity** (SLDS accordion).

- Compare **last 7 days / last 30 days** with the customer's **usual weekly average (3 months)**. Show **absolute numbers and changes, never percentages**.
- Use **plain terms** ("Money in (credits)", "Moved out of savings") with an ⓘ that says what the measure means and what fraud it can indicate.
- Mark out-of-character rows with an **Unusual** badge and a red edge bar; offer an **Unusual only** toggle; show each row's **source** as a tag.
- Open the section that matters for the case type first (Money for mule/payment fraud, Behaviour for account takeover, Identity for onboarding/synthetic identity). **Examine** on a finding jumps to its section.
- New customers: say there's no history to compare; mark rows unusual only where a risk factor applies.
- **One record, no contradictions.** The AI summary, factor details and findings are written from the same figures the Evidence card shows. Every Unusual row is backed by a risk factor; every finding has **See in Evidence: <row>**, which scrolls to and highlights the row.
- Show the **platforms strip** (each source with "N unusual", "checked" or "degraded") so the aggregation is visible.

## Observability (team lead)

- Lead with **what needs action**: an error notification for SLA breaches, a warning for degraded systems, each with a link to the affected cases.
- Every late case shows **why** (a cause badge with an ⓘ saying what to do) and **one obvious action** (Assign / Reassign to the suggested specialist).
- Bulk actions appear only when rows are selected: **Assign** is the brand button; **Assign to suggested** is neutral; **Clear** is a base button.
- Use counts ("30 of 36 agreed"), not percentages. Capacity bars turn amber above 80% and red when over capacity.
- **Show trends, not just now:** a sparkline in each status tile; 24-hour trends with a dashed marker where an incident started; a red dashed alert line for thresholds; a forecast against capacity.
- **Chart colours:** series 1 `--viz-brand` (SLDS blue-60), series 2 `--viz-series-2` (SLDS indigo-40, dashed), checked for colour-blind separation. Red (`--viz-high`) is reserved for breaches and alerts. One axis per chart; a legend for 2+ series; hover tooltips on every chart.
- Components: `TrendChart` (lines over time, optional area, threshold and marker) and `ColumnChart` (stacked counts, optional capacity line) in `src/components/charts.tsx`.

## Button hierarchy

| Level | SLDS variant | Use | Fraud Signal examples |
|---|---|---|---|
| **Primary** | `slds-button_brand` | The one main action in an area. Exactly one per card, panel or dialog. | Record decline / refer / accept, Submit (feedback) |
| **Secondary** | `slds-button_neutral` | Other actions next to the primary, including **Cancel** | Cancel, Edit, Show 3 factors, What do these mean? |
| **Tertiary** | `slds-button` (base) | Low-emphasis, link-like actions | Show everything, Undo, Reset, View case snapshot |
| **Destructive** | `slds-button_destructive` | **Only** for actions that delete or remove something | Not used |
| **Success** | `slds-button_success` | Rarely, to confirm a positive completion | Not used |

- Keep the same primary button whatever option is chosen. Don't colour a button by the option chosen.
- Cancel is secondary (neutral), never red.
- An on/off button (like *Show 3 factors* / *Show all evidence*) is secondary with the SLDS selected state, not primary.

## Choosing a selection control

| Control | Use when | Examples |
|---|---|---|
| **Radio button group** | Exactly one of 2–4 options with short labels, where seeing them all helps comparison | Outcome, time range, sort order, theme |
| **Radio group** (vertical) | Exactly one of 2–6 options with longer labels that should all be visible | Candidate for decision reasons |
| **Select** (dropdown) | 5+ options, long labels, options that change, or limited space | Reason, case type, data source |
| **Checkbox button group** | Several options can be on at once | Risk levels |
| **Toggle** | A single on/off setting | Include decided |

## Writing

- Plain language: "Someone is using a real person's stolen details", not only "Impersonation".
- Exact figures and windows: "2 matches in the last 15 days".
- Say where content came from: "Generated by AI", "Built by a fixed template".
- Name a button after what it changes: "Adjust score", not "Edit", when it only changes the score.
- Errors say what's wrong and how to fix it.
- Empty states say why it's empty and what to do next.

## Adding or changing a component

1. Check SLDS 2 first. If a component exists, use its markup and classes, and set layout only.
2. Use tokens, never raw colours.
3. Export it from `src/design-system/index.ts`.
4. Add a story in `src/stories/` with controls for the props that matter.
5. Add it to this file and to the design system page (`src/views/DesignSystem.tsx`).
