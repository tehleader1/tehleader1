# Pass 18 — Deeper Map-Specific Surface Effects

## Main goal

Make Map Change affect the actual core surfaces more clearly.

Pass 15 created the map/perk foundation.
Pass 16 made maps and perks visible.
Pass 17 added admin seriousness and Shopify lens.
Pass 18 pushes map behavior deeper into surfaces.

## Files changed

- `static/rebuild/sr-map-surface-effects.js`
- `static/rebuild/sr-app-state.js`
- `static/app.v20260320h.js`
- `static/index.html`
- `docs/rebuild-progress-pass18.json`
- `docs/rebuild-progress-dashboard-pass18.md`

## New module

Added:

- `static/rebuild/sr-map-surface-effects.js`

### New functions

- `getMapSurfaceState()`
- `patchMapSurfaceState()`
- `getActiveSurfaceEffects()`
- `applyMapSurfaceEffects()`
- `renderSurfaceEffectDock()`
- `initMapSurfaceEffects()`

## What became rebuild-owned

The rebuild layer now owns map-specific surface behavior definitions for:

- Diary
- Studio
- Profile
- FAQ Lounge
- Payments

For every active map, each surface receives:

- label
- behavior description
- action prompt

## Maps covered

Surface effects were defined for:

- Swimming Hole
- Snow Mountain Pass
- Autumn Trail
- Desert Cliff
- Blissful Geysers
- Chocolate Factory

## Visible UI added

Added:

- `#srSurfaceEffectDock`

This dock shows how the current map affects each major surface.

Each surface card includes:

- surface name
- map-specific label
- map-specific behavior explanation
- action button

The action button activates the current map's matching perk and records account history.

## Runtime changes

`static/app.v20260320h.js` now initializes:

- `initMapSurfaceEffects()`
- `renderSurfaceEffectDock()`

It also refreshes surface effects when perk activation events fire.

## CLS / stability

### Reduced risk

- Surface dock has reserved height.
- Surface cards have minimum height.
- Effects update through targeted render instead of replacing unrelated page sections.
- No map image assets were added yet, avoiding LCP risk.

### Still remaining

- Surface effects are visible in the dock, but not yet deeply embedded inside every original legacy panel.
- Real stock image assets still need selection/optimization.
- Unified shell routing still has some overlay/sticky competition.

## Shopify lens

### LCP

Protected: no heavy stock images were added yet.

### INP

Surface action buttons are local state actions and lightweight.

### CLS

Main improvement: surface effect dock is fixed/reserved and does not cause late layout growth.

## Strategic result

Map Change now affects the product surfaces in a visible, structured way.

It is no longer just:

- background/theme
- perk definitions

It now explains and activates map-specific behavior for each major surface.
