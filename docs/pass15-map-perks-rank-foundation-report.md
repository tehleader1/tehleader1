# Pass 15 — Map Change + Perks + Account Seriousness Foundation

## Main goal

Start elevating Map Change into a real system instead of a theme switch.

This pass adds:

- progress dashboard formats beyond screenshots
- Map Change foundation
- Swimming Hole map details
- Perks Engine foundation
- Account seriousness / Professional / Making Money rank foundation
- sticky Aria Contact Rank board

## Files changed

- `docs/rebuild-progress-dashboard.md`
- `docs/rebuild-progress-pass15.json`
- `static/rebuild/sr-map-system.js`
- `static/rebuild/sr-perks-engine.js`
- `static/rebuild/sr-rank-system.js`
- `static/rebuild/sr-app-state.js`
- `static/app.v20260320h.js`
- `static/index.html`

## Progress view added

Two non-screenshot progress formats were added:

- Markdown dashboard: `docs/rebuild-progress-dashboard.md`
- JSON summary: `docs/rebuild-progress-pass15.json`

These summarize rebuild ownership by surface:

- Profile
- FAQ Lounge
- Diary
- Studio
- Payments
- Map Change
- Perks
- Rank System

## New Map System

Added:

- `static/rebuild/sr-map-system.js`

### New functions

- `getMapState()`
- `patchMapState()`
- `applyMapTheme()`
- `setActiveMap()`
- `getActiveMapDetails()`
- `renderMapStatusPanel()`
- `initMapSystem()`

## Maps defined

### Swimming Hole

This is the concrete wet-hair map requested.

Purpose:

- wet hair care
- conditioner-type product logic
- rinse timing
- slip/detangling guidance
- water/wetness state
- post-water recovery

Swimming Hole qualities:

- `waterLevel`: how wet the hair is before conditioner logic starts
- `slipLevel`: how much conditioner/slip support is needed
- `rinseTiming`: how long conditioner should keep moving before rinse
- `scalpCalm`: how gentle the map language should be
- `moneyMovement`: whether wet-care activity creates tips, product intent, or Shopify movement

Visual identity:

- cool blue/teal
- reflective water
- tropical swimming hole
- wet-to-softness quality

Stock image search directions were saved as map metadata, not hardcoded fake assets:

- clear tropical swimming hole Dominican Republic water
- wet curly hair conditioner rinse shower natural light
- blue green lagoon rocks tropical water

### Other map foundations

Also defined:

- Professional
- Making Money
- Studio Night

These are foundation maps for the rank/perks system.

## New Perks Engine

Added:

- `static/rebuild/sr-perks-engine.js`

### New functions

- `getPerksState()`
- `patchPerksState()`
- `activatePerk()`
- `rateAccountOption()`
- `getSurfacePerks()`
- `initPerksEngine()`

## Perks defined

### Swimming Hole Perk

`swimmingHoleWetCare`

Does:

- shows wet-care prompts in FAQ/Diary
- records conditioner/slip logic in account history
- supports conditioner-type product guidance when hair is wet

### Diary Perk

`diaryTipsMoney`

Does:

- tracks repeated Diary tip/support activity
- raises Making Money score when live posts receive support movement
- marks Diary as a serious money-movement lane

### Studio Perk

`studioExportCheck`

Does:

- tracks adlib confirmation
- tracks beat-to-vocal alignment
- tracks correct file export
- tracks remembered FX effect
- raises Profile credibility and money readiness

### Profile Perk

`profileToDiaryHairHistory`

Does:

- creates the concept for a Profile button that routes to Diary hair-analysis history
- raises Professional score when the user checks history seriously

### FAQ Lounge Perk

`faqMapStoryInteractive`

Does:

- supports the story of how the map came to be
- connects FAQ Lounge to interactive social/SEO proof

## New Rank System

Added:

- `static/rebuild/sr-rank-system.js`

### New functions

- `getRankState()`
- `patchRankState()`
- `updateRankBoard()`
- `renderRankBoard()`
- `initRankSystem()`

## Sticky Rank Board

A new sticky board was added to the main page:

- `#srRankBoard`

It shows:

- #1 Professional contact
- #1 Making Money contact
- Professional score
- Money movement score
- Aria interaction
- seriousness
- protection level

## Account seriousness foundation

The account now tracks:

- Professional score
- Making Money score
- Aria interaction score
- seriousness score
- ratings by account option
- option history
- protection level

## Protection Guarantee concept

Added as a system concept, not a fake financial promise:

> Protection Guarantee tracks serious money-account usage, history, and admin ratings. It is not a financial promise.

Protection levels:

- basic
- active
- verified

## Runtime hooks added

`static/app.v20260320h.js` now initializes:

- `initMapSystem()`
- `initPerksEngine()`
- `initRankSystem()`

First-pass event hooks:

- Aria history can activate account seriousness movement
- FAQ comment events can activate FAQ map/story perk
- Studio save/export events can activate Studio export perk

## What became rebuild-owned

- map definitions
- active map state
- map visual tokens
- perk definitions
- perk activation history
- seriousness scores
- protection level state
- sticky rank board rendering
- rebuild progress dashboard files

## What remains legacy-owned

- actual Map Change UI buttons
- full visual background image selection
- real stock asset ingestion
- final map-specific surface layouts
- admin ratings UI
- account option history UI
- full Shopify analytics integration
- real money/account verification rules

## CLS / Shopify performance lens

### LCP

No heavy image assets were added. Stock image directions are metadata for now.

### INP

Perk/rank updates are local state changes and lightweight events.

### CLS

The sticky rank board reserves fixed space and uses layout containment. Map panels and rank cards have min-height rules.

## Strategic result

Pass 15 starts the next product layer:

- Map Change becomes a real system
- Perks become behavior modifiers
- Swimming Hole becomes the first detailed map example
- account seriousness becomes trackable
- Professional / Making Money ranking begins
