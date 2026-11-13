# Fraud Signal

A fraud observability dashboard concept. It shows what is happening across fraud alerts, then lets an analyst open a single case and see the evidence behind an AI-generated risk summary.

**Live demo:** https://dsunwar-stack.github.io/Fraud-Data-Visualisation/

All data is synthetic and generated in the browser from a fixed seed. No real customers, cases or institutions appear in this project.

## Views

| View | What it shows |
| --- | --- |
| **Overview** | Alert volume per hour by risk band (48h), risk score distribution with the auto-decline line, top risk factors, cases by type, data source health (hits, precision, p95 latency), and high-risk cases closest to their SLA. |
| **Case queue** | Every case in a sortable, filterable table, with a risk score marker (band pill, number and bar) in each row. |
| **Case investigation** | Risk gauge, AI fraud summary, score breakdown, findings, source evidence, decision panel, investigation note and timeline. |

## Design principles

These come from user research on an earlier LLM fraud summary concept:

1. **Exact figures, not vague terms.** Each factor gives a count and a time window ("2 indirect matches in the last 15 days"), never "recent" or "longstanding".
2. **Explain the score.** The *How the score is built* bar shows the baseline plus the points each factor adds, against the band thresholds (low 0–39, medium 40–69, high 70–100).
3. **Evidence in one place.** Source evidence tabs show the raw signals from each data source, so analysts don't need to switch between systems.
4. **Analyst control.** *Edit* (rather than "Manual adjustment") lets the analyst exclude a factor and see the adjusted score.
5. **Notes built in.** The investigation note is pre-filled from a template using the case's findings.
6. **Colour carries meaning.** Decline is red, refer is amber and accept is green, and risk markers appear inside tables.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages. In the repo, set **Settings → Pages → Source** to **GitHub Actions** once.

## Stack

React 19, TypeScript and Vite. Charts are hand-built SVG, so there is no charting dependency. Light and dark themes follow the system setting, and you can switch them in the sidebar.

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
