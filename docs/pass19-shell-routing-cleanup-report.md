# Pass 19 — Unified Shell / Routing Cleanup

## Main goal

Clean up surface routing and shell handoff before embedding more map/perk effects into legacy panels.

Pass 18 made Map Change affect real surfaces through a Surface Effects dock.
Pass 19 gives those surfaces a cleaner routing/shell model.

## Files changed

- `static/rebuild/sr-shell-router.js`
- `static/rebuild/sr-app-state.js`
- `static/app.v20260320h.js`
- `static/index.html`
- `docs/rebuild-progress-pass19.json`
- `docs/rebuild-progress-dashboard-pass19.md`

## New shell router module

Added:

- `static/rebuild/sr-shell-router.js`

### New functions

- `getShellState()`
- `patchShellState()`
- `reserveShellLayout()`
- `applyOverlayRules()`
- `setShellSurface()`
- `inferSurfaceFromDocument()`
- `syncShellFromRuntime()`
- `renderShellStatusPanel()`
- `initShellRouter()`

## What became rebuild-owned

The rebuild layer now owns a first-pass shell/routing model:

- active surface
- previous surface
- route history
- overlay allowance rules
- shell layout reservations
- shell status panel

## Overlay rules added

Rules now exist for:

- studio
- diary
- payments
- profile
- faq
- map
- idle

These rules define which overlays/docks should stay active or quiet during each surface.

## Visible UI added

Added:

- `#srShellStatusPanel`

It displays:

- current surface
- previous surface
- allowed/quiet overlay status

## Runtime changes

`static/app.v20260320h.js` now calls shell router hooks around:

- Studio open/close
- Remote Fast Pay open/close
- Diary viewer open/close
- FAQ render events
- Profile render events
- perk activation sync

## What stability risks were reduced

### Reduced

- active surface state is now explicit
- Studio / Diary / Payments can mark themselves as active surfaces
- overlay docks can be quieted during routes where they compete
- shell containers reserve minimum layout space
- route history makes handoff debugging easier

### Still remaining

- full route ownership is not completely extracted from `app.v20260320h.js`
- original legacy panel choreography still exists
- map effects are not yet embedded deeply in every old panel
- mobile dock stacking still needs final QA
- Market laser/reader refinement has not started yet

## CLS / Shopify lens

### LCP

No heavy assets added.

### INP

Shell state changes are lightweight local state operations.

### CLS

Main improvement: shells and docks now have reserved layout and clear overlay rules, reducing stacked/competing UI risk.

## Strategic result

Pass 19 makes the app safer for the next layer of map/perk embedding.

The app now has:

- rebuilt surfaces
- map/perk systems
- admin seriousness
- shell surface coordination

Next strongest move:

- deeper map embedding inside legacy panels
- then market laser/reader refinement
