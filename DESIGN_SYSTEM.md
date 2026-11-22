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
| `--viz-brand` | Chart fill, neutral measures | `palette-blue-60` |
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
| **Charts** (`AlertVolume`, `ScoreHistogram`, `RiskGauge`, `BarList`, `Sparkline`) | Trends and distributions | Hover values on every chart; a caption for anything unusual. |
| **AgenticCard**, **AgenticIcon**, **FeedbackGroup** | AI-generated content only | AI label, disclaimer and feedback (helpful, not helpful with reasons, copy) on every AI output. |
| **Toast** (`useToast`) | Confirming an action | Short and specific: "Thanks for your feedback." |
| **ScopedNotification** | Advisory status inside a card or panel | Not dismissible. Icon + one or two lines + at most one link. Default = neutral note; Info = context (who decides, filtered view, alert spike); Warning = needs care (degraded source, SLA due within 1h, override); Error = needs action (SLA breached); Success = completed action (decision recorded). Put it at the top of the card it's about. |

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
