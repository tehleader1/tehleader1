# Pass 17 — Admin Seriousness + Ratings + Shopify Lens

## Main goal

Continue the normal pass flow by building the admin/account seriousness layer instead of doing a mega-pass.

This pass focuses on:

- who is taking the program serious
- admin ratings
- account option history
- Shopify LCP / INP / CLS seriousness lens
- keeping CLS as the weak-area pressure point

## Files changed

- `static/rebuild/sr-admin-seriousness.js`
- `static/rebuild/sr-app-state.js`
- `static/app.v20260320h.js`
- `static/index.html`
- `docs/rebuild-progress-pass17.json`
- `docs/rebuild-progress-dashboard-pass17.md`

## New Admin Seriousness module

Added:

- `static/rebuild/sr-admin-seriousness.js`

### New functions

- `getAdminSeriousnessState()`
- `patchAdminSeriousnessState()`
- `rateSeriousness()`
- `recordAccountOptionChange()`
- `updateShopifyLens()`
- `deriveShopifyLensFromRebuild()`
- `renderAdminSeriousnessPanel()`
- `initAdminSeriousness()`

## What became rebuild-owned

- admin ratings state
- account option history
- Shopify LCP / INP / CLS seriousness lens
- admin seriousness score
- visible admin seriousness panel
- visible rating controls
- visible option history list

## Visible UI added

Added:

- `#srAdminSeriousnessPanel`

It shows:

- admin seriousness score
- top Shopify concern
- surface rating controls
- LCP / INP / CLS lens cards
- latest admin ratings
- account option history

## Runtime hooks added

The runtime now initializes:

- `initAdminSeriousness()`
- `renderAdminSeriousnessPanel()`

It also records history / updates Shopify lens when:

- a perk activates
- FAQ comment is posted
- Studio session is saved

## Shopify analysis tie-in

### LCP

Tracked as a performance lens card.

Current logic:

- protected by not loading heavy map image assets yet
- score/status can be updated by admin/system

### INP

Tracked through lightweight interaction signals:

- FAQ comment post
- Studio save
- perk activation

### CLS

Marked as the current weak area.

CLS notes explain that layout stability improves when:

- rank board is reserved
- map/perk/admin panels are reserved
- stacked late UI is reduced
- surface-specific render layers stay slot-based

## What remains legacy-owned / future work

Still remaining:

- real Shopify performance data source
- deeper map effects inside every surface
- admin identity management
- detailed account option pages
- full serious-user leaderboard across multiple users
- final pass-level QA

## Strategic result

Pass 17 gives the admin a real visible control layer for the serious-user concept.

The app now tracks:

- Professional seriousness
- Making Money seriousness
- account option history
- admin ratings
- Shopify LCP / INP / CLS lens

Next highest-leverage move:

Pass 18 should push deeper map-specific effects into Diary, Profile, FAQ, Studio, Payments, and Remote panels.
