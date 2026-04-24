# Pass 22 — Deploy Integration + QA Handoff

## Main goal

Turn the rebuilt system into a package that can be previewed and deployment-tested with clear verification information.

This pass does **not** add another product system. It audits and ties together the existing rebuild systems so you can deploy/preview with confidence.

## Files changed

- `static/rebuild/sr-deploy-integration.js`
- `static/rebuild/sr-app-state.js`
- `static/app.v20260320h.js`
- `static/index.html`
- `docs/pass22-deploy-integration-report.md`
- `docs/deploy-instructions-pass22.md`
- `docs/deploy-qa-checklist-pass22.json`
- `docs/rebuild-progress-dashboard-pass22.md`
- `docs/rebuild-progress-pass22.json`

## New module

Added:

- `static/rebuild/sr-deploy-integration.js`

### New functions

- `getDeployIntegrationState()`
- `patchDeployIntegrationState()`
- `auditDeploySystems()`
- `syncDeployVisuals()`
- `renderDeployReadinessPanel()`
- `initDeployIntegration()`

## What became rebuild-owned

The rebuild layer now owns a deploy readiness layer:

- core system audit
- deploy readiness state
- static preview readiness
- live API verification reminders
- deploy readiness panel
- integration resync of visible rebuilt panels

## Visible UI added

Added:

- `#srDeployReadinessPanel`

It shows:

- core rebuild system status
- issues if a rebuild system is missing
- reminder that live API endpoints still need deployment verification

## Runtime changes

`static/app.v20260320h.js` initializes:

- `initDeployIntegration()`
- `renderDeployReadinessPanel()`

It also refreshes deploy readiness around key events:

- shell surface change
- perk activation
- FAQ render
- Profile render

## Deployment information

### Static preview entry

Use:

```text
/static/index.html
```

### Local preview command

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/static/index.html
```

## QA checklist added

Added:

- `docs/deploy-qa-checklist-pass22.json`
- `docs/deploy-instructions-pass22.md`

The QA checklist covers:

- Map Control Dock
- all 6 maps
- perk/rank/seriousness updates
- market reader scan/settle/fallback
- shell status changes
- mobile layout
- console syntax errors
- API endpoint verification

## What is deploy-ready

Ready for static preview:

- rebuilt UI layers
- map/perks system
- shell router
- market reader panel
- admin seriousness panel
- rank board
- deploy readiness panel
- progress dashboards

## What still requires live verification

- Shopify finance endpoint
- Diary API endpoints
- Studio session endpoints
- social/acquisition endpoints where used
- hosted routing/static path behavior

## What remains deferred

- real optimized map image assets
- final hosted deployment verification
- deeper legacy DOM cleanup
- full removal of old rendering paths

## Stability / Shopify lens

### LCP

Protected. Heavy map images are still deferred.

### INP

Deploy audit and visual sync are lightweight.

### CLS

Deploy readiness panel and final polish styles use fixed/reserved minimum heights and layout containment.

## Strategic result

Pass 22 gives you a deployable information package:

- code bundle
- deploy instructions
- QA checklist
- readiness panel
- progress dashboard
- honest list of live verification requirements

The app is now ready for static preview and deployment testing.
