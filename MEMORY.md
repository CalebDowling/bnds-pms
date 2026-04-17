# Memory

_Last updated: April 17, 2026_

## Memory
<!-- Things the user has asked to remember. Persistent — only remove or change if the user asks. -->

### DRX Sync — DISABLED (as of 2026-04-17)
- DRX auto-sync cron was removed from `vercel.json` on 2026-04-17 per user request. No more automatic 5-minute syncs. (added 2026-04-17)
- A runtime kill-switch env var `DRX_SYNC_DISABLED=true` (optional) was added to `/api/drx-sync`, `/api/drx-sync/queue-sync`, and `/api/drx-sync/queue-counts`. When set, all three endpoints return 503 `{ disabled: true }` instead of hitting DRX. (added 2026-04-17)
- Dashboard queue counts automatically fall back to local DB counts when DRX is unreachable/disabled — no user-facing breakage. (added 2026-04-17)
- **To re-enable DRX sync:** (1) restore the `crons` block in `vercel.json`: `"crons": [{ "path": "/api/drx-sync?entity=all", "schedule": "*/5 * * * *" }]`, (2) remove the `DRX_SYNC_DISABLED` env var from Vercel project settings if it was set, (3) redeploy. (added 2026-04-17)

### Project Overview
- BNDS PMS is a custom Pharmacy Management System being built for Boudreaux's New Drug Store to replace DRX. Stack: Next.js 16.1.6 (App Router), Tailwind CSS v4, React 19, TypeScript, Prisma ORM, PostgreSQL (Supabase), Vercel hosting. (added 2026-04-16)
- Caleb Dowling is the IT Director and primary user. (added 2026-04-16)
- Production domains: pms.bndsrx.com, bndsrxportal.com, portal.bndsrxportal.com, bnds-pms.vercel.app (added 2026-04-16)
- Vercel team: team_ccDYKnX9gjdkww2ta0Mcmae6, project: prj_EhtTxu4gScV9SzSdErqTl6tz7tNB (added 2026-04-16)

### Session Work Log (April 16, 2026)

**Phone System on Dashboard:**
- Replaced the old Quick Dial number pad (PhoneDialer component) with a live call management widget (DashboardPhoneWidget) in Column 2 of DashboardCommandCenter.tsx. (added 2026-04-16)
- User didn't like the first layout — we mocked up 3 options (Tabbed, Split Panel, Compact Status Bar). User wanted "more options visible." (added 2026-04-16)
- Built the Split Panel layout: stats strip (Active/Hold/Today/Missed), two-column split (active calls left, hold queue right), department status strip, footer with Call Center + History links. (added 2026-04-16)
- User asked to remove emojis and use professional SVG icons — updated all icons to Lucide SVG line icons. (added 2026-04-16)
- Commits: `ed445a8` (initial widget), `bfdf69b` (split panel + icons). (added 2026-04-16)

**Sage Green Palette Rebrand:**
- User provided a 4-color palette: #cbddd1 (light sage), #719776 (medium sage), #415c43 (dark forest), #0f260b (near-black green). (added 2026-04-16)
- Updated globals.css: --color-primary: #415c43, --page-bg: #cbddd1, --card-bg: #e2ede6, --text-primary: #0f260b, --text-secondary: #415c43, --text-muted: #5d7a64. (added 2026-04-16)
- Built a static HTML mockup (public/palette-preview.html) for the user to preview before committing. User approved. (added 2026-04-16)
- Commit: `4f5a7dc` (sage palette rebrand). (added 2026-04-16)

**Typography Cleanup:**
- Switched Inter loading from Google Fonts @import to next/font (self-hosted, no FOUT). Added JetBrains Mono for monospace (Rx numbers, NDCs, timers). (added 2026-04-16)
- Added font smoothing (-webkit-font-smoothing: antialiased), text-rendering: optimizeLegibility, Inter stylistic sets (cv11, ss01, ss03, cv02, tnum). (added 2026-04-16)
- Established heading scale in globals.css: h1 (24/800), h2 (18/700), h3 (15/700), h4 (13/600), plus .page-title, .page-subtitle, .section-label utility classes. (added 2026-04-16)
- Fixed body element: was hardcoded with cream gradient (#E8DFD0) and slate text (#111827) — now uses var(--page-bg) and var(--text-primary) so the sage palette actually applies. (added 2026-04-16)
- Fixed analytics/page.tsx (worst offender — all inline styles), settings/page.tsx, queue/page.tsx. (added 2026-04-16)
- Removed stray src/middleware.ts that conflicted with src/proxy.ts (Next.js 16 only allows proxy.ts). (added 2026-04-16)
- Commit: `a8f21d1` (typography cleanup). (added 2026-04-16)

**Landing Page UI/Layout Refresh:**
- User wanted every landing page (except Dashboard) to have a unified, modern layout. We did a full refresh. (added 2026-04-16)
- Built 3 new shared layout components:
  - `PageShell` (src/components/layout/PageShell.tsx) — outer wrapper with title/subtitle/actions/stats/toolbar slots, 24px padding, max-width 7xl
  - `FilterBar` (src/components/layout/FilterBar.tsx) — unified toolbar with search/filters/right slots
  - `StatsRow` (src/components/layout/StatsRow.tsx) — KPI strip with label/value/icon/accent/delta per stat, responsive grid
  (added 2026-04-16)
- Rolled out in 5 commits across 21+ pages:
  - Phase 1: Foundation components (`d20a138`)
  - Phase 2: Queue, Patients, Prescriptions, Inventory, POS (`144580f`)
  - Phase 3: Analytics, Phone, Intake, Refills (`ec8a2fc`)
  - Phase 4: Pickup, Shipping, Compounding, Waiting Bin, Billing, Reports, Users, Settings (`5bec1aa`)
  - Phase 5: Batch Records, Inventory Reorder, Insurance, Patient Messaging (`7b07432`)
  (added 2026-04-16)
- Dashboard was intentionally excluded per user's request (recently redesigned with phone widget, workflow queue, stock alerts). (added 2026-04-16)
- All pages now share: same header pattern (.page-title), same filter bar (card-styled with pills), same stat cards (StatsRow), same table treatment (--card-bg/--border/--green-50 header row), consistent sage palette. (added 2026-04-16)

**Documentation Generated:**
- Created `docs/BNDS_PMS_Complete_Workflow_Guide.docx` — 9-section operations manual covering: Rx intake/fill process, compounding/drug manufacturing, hardware integration, reports/analytics, billing/account management, workflow queue (all 16 stages), compounding details, shipping, and patient messaging. No DRX references. Includes Staff Role and System Action callout boxes. (added 2026-04-16)

### Known Issues / Technical Debt
- Local npm run build fails on Windows due to OneDrive path with apostrophe in "Boudreaux's" causing Unicode path corruption. Vercel builds on Linux work fine — Vercel is the source of truth for builds. (added 2026-04-16)
- ~30 files still have hardcoded old palette colors (#40721D, #E8DFD0, #F5F0E8, etc.) in component-level styles — the CSS variables handle most of it, but a full sweep of hardcoded hex values would complete the rebrand. (added 2026-04-16)
- analytics/page.tsx still has extensive inline `style={{}}` in Section content bodies (revenue breakdown, claims, productivity, compounding charts). Header/wrapper was fixed, but inner content still uses inline styles. (added 2026-04-16)
- phone/page.tsx has a dead `StatsCards` component definition (no longer called after switching to StatsRow) — can be removed. (added 2026-04-16)
- src/app/globals.css has a `* { font-feature-settings: 'tnum'; }` rule AND the html rule also sets tnum — slight redundancy. (added 2026-04-16)
- next.config.mjs still has `typescript: { ignoreBuildErrors: true }` — ideally should be removed once TypeScript errors are fixed. (added 2026-04-16)

### User Preferences (This Project)
- User prefers to see live mockups/previews before committing visual changes (used static HTML served via Python for palette and phone widget previews). (added 2026-04-16)
- User dislikes emojis in the UI — wants professional SVG icons (Lucide) throughout. (added 2026-04-16)
- User wants the Dashboard untouched from the current 3-column layout (Workflow Queue / Quick Access + Phone / Activity + Stock Alerts). (added 2026-04-16)
- User wants all documents to exclude DRX references — PMS workflows should be standalone. (added 2026-04-16)
