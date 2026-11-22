# Fraud Signal

A fraud observability dashboard concept. It shows what is happening across fraud alerts, then lets an analyst open a single case and see the evidence behind an AI-generated risk summary.

**Live demo:** https://dsunwar-stack.github.io/Fraud-Data-Visualisation/

All data is synthetic and generated in the browser from a fixed seed. No real customers, cases or institutions appear in this project.

## Views

| View | What it shows |
| --- | --- |
| **Overview** | Alert volume per hour by risk band, risk score distribution with the auto-decline line, top risk factors, cases by type, data source health, and high-risk cases closest to their SLA. |
| **Case queue** | Every case in a searchable, sortable table, with a risk score marker (band pill, number and bar) in each row. |
| **Case investigation** | At a glance summary, Risk Hub (score per fraud type), AI fraud summary with score breakdown, findings with Examine and Mitigate, source evidence, decision panel, investigation note, full customer profile and timeline. |

### Filters and toggles

- **Shared filters** (Overview and Case queue, kept when you switch between them): risk band, case type, data source, and include decided cases. Click a case type or data source on the Overview to filter by it.
- **Overview:** time range (12h, 24h or 48h), auto-declined line on the alert chart, and rank risk factors by number of cases or by average points.
- **Case queue:** search, sort, due within 1 hour or breached, show or hide the signals column, and compact rows.
- **Case investigation:** **Show factors** on a fraud type narrows the summary and findings to it, findings can be filtered by source, and there are toggles to hide fraud types with no signals and show flagged signals only.

## Versions

See the [design history and feedback log](docs/versions/README.md) for every round of feedback, what changed, screenshots, and a branch with the code for each round.

## Design principles

These come from user research on an earlier LLM fraud summary concept:

1. **Exact figures, not vague terms.** Each factor gives a count and a time window ("2 indirect matches in the last 15 days"), never "recent" or "longstanding".
2. **Explain the score.** The *How the score is built* bar shows the baseline plus the points each factor adds, against the band thresholds (low 0–39, medium 40–69, high 70–100).
3. **Evidence in one place.** Source evidence tabs show the raw signals from each data source, so analysts don't need to switch between systems.
4. **Analyst control.** *Edit* (rather than "Manual adjustment") lets the analyst exclude a factor and see the adjusted score. *Mitigate* moves a finding to the Mitigation column, and *This is correct* records feedback on the AI summary.
5. **Every decision has a recorded reason.** Recording an outcome needs a reason code and a written explanation. Overriding the recommendation is flagged, and the decision, reason and investigation note stay visible on the case and in its timeline.
7. **The specialist decides, not the AI.** The AI summarises the evidence. The recommendation comes from the risk score, and the specialist makes the final call.
6. **Colour carries meaning.** Decline is red, refer is amber and accept is green, and risk markers appear inside tables.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. In the repo, set **Settings → Pages → Source** to **GitHub Actions** once.

## Stack

React 19, TypeScript and Vite, styled with **SLDS 2** (`@salesforce-ux/design-system-2`, Cosmos theme, the Enhanced Lightning UI): every colour, font, radius and shadow comes from SLDS 2 global styling hooks, and buttons, select menus, text areas, toggles, the path, tabs, tables, badges and toasts use SLDS 2 components. AI content follows the SLDS 2 **Agentic Experiences** patterns (agentic card, AI label, human feedback). Charts are hand-built SVG using the SLDS 2 data palette. Light and dark mode both come from SLDS 2 Cosmos itself.

## Project layout

```
src/
  data.ts              synthetic case, alert and source generator
  components/charts.tsx sparkline, stacked bars, histogram, gauge, bar list
  views/Overview.tsx
  views/Queue.tsx
  views/CaseView.tsx
  styles.css           design tokens and component styles
```
