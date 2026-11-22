# Version comparison

Screenshots of the same case (**FR-104237**, account takeover, score 90) in both versions, so you can compare them directly. All data is synthetic.

| | Version 1 | Version 2 |
|---|---|---|
| Git tag | [`v1`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/v1) | [`v2`](https://github.com/dsunwar-stack/Fraud-Data-Visualisation/tree/v2) |
| Focus | Filters, toggles, Risk Hub and the wireframe features | Plain-English help for fraud types, based on UX principles |

## Risk Hub

**Version 1:** fraud types appear as labels only. Anyone who doesn't know the terms has to guess what "Impersonation" or "False identity" mean.

![Version 1 Risk Hub](v1-risk-hub.png)

**Version 2:** every fraud type has a one-line meaning and an ⓘ icon.

![Version 2 Risk Hub](v2-risk-hub.png)

Hovering over the ⓘ (or tapping it on a phone) shows the full meaning and an example:

![Version 2 help text](v2-risk-hub-help.png)

**What do these mean?** opens all four explanations, plus the signals in this case that count toward each type:

![Version 2 explanations panel](v2-risk-hub-explained.png)

## Full case view

| Version 1 | Version 2 |
|---|---|
| ![Version 1 case](v1-case.png) | ![Version 2 case](v2-case.png) |

## Overview

This view is the same in both versions.

![Overview](overview.png)

## What changed in version 2, and which UX principle it follows

| Change | UX principle |
|---|---|
| A one-line plain meaning on every fraud type card | Use plain language, not jargon |
| An ⓘ icon with the full meaning and an example, by hover, keyboard or tap | Help is available where it's needed and works on any device |
| **What do these mean?** panel listing the signals behind each type for this case | Explain every score |
| Risk Hub description changed to "How strongly the evidence points to each type of fraud, from 0 to 100" | Exact figures and explained scales |
| Factors moved to the correct fraud type (e.g. a ported phone number is account misuse) | Accurate information builds trust |
| A fraud type with no factors now scores 0, not 6 or 10 | Numbers must agree with each other |
