// Fraud Signal design system: one import point for every shared component.
// Built on SLDS 2 (Cosmos) and the SLDS 2 Agentic Experiences patterns.
// Live reference with examples: open the app at #design-system. Rules: DESIGN_SYSTEM.md.

// Layout and navigation
export { PageHeader, Breadcrumb, ObjectIcon } from '../components/slds'
export type { ObjectIconName } from '../components/slds'

// Inputs and filters
export { Toggle, RadioButtonGroup, CheckboxButtonGroup } from '../components/slds'
export { FilterBar } from '../components/Filters'

// Feedback and help
export { InfoTip } from '../components/InfoTip'
export { ToastProvider, useToast, ScopedNotification } from '../components/slds'
export type { NotificationVariant } from '../components/slds'

// Data display
export { ProgressBar, ActivityTimeline, Icon } from '../components/slds'
export type { TimelineKind, IconName } from '../components/slds'
export { TrendChart, ColumnChart } from '../components/charts'
export type { TrendSeries, ColumnRow } from '../components/charts'
export { Sparkline, AlertVolume, ScoreHistogram, RiskGauge, BarList, ScoreCell, bandVar, bandText } from '../components/charts'
export type { HourPoint } from '../components/charts'

// AI (agentic) patterns: use only on AI-generated content
export { AgenticCard, AgenticIcon, FeedbackGroup } from '../components/slds'

// Domain
export { RiskThresholds } from '../components/RiskThresholds'
