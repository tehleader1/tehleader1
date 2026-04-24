# Pass 16 — Visible Map Change + Perks Activation

## Main goal

Move Pass 15 from foundation into visible product behavior.

Pass 15 built the system definitions.
Pass 16 makes the user see and use them.

## Files changed

- `static/rebuild/sr-map-system.js`
- `static/rebuild/sr-perks-engine.js`
- `static/app.v20260320h.js`
- `static/index.html`
- `docs/rebuild-progress-pass16.json`
- `docs/rebuild-progress-dashboard-pass16.md`

## Current map options and perks

### 1. Swimming Hole

Core quality:

- wet-to-softness
- wet hair
- conditioner slip
- rinse timing
- scalp calm
- money movement from wet-care activity

Main perk:

- `swimmingHoleWetCare`
- Wet-to-Wetness Conditioner Route

### 2. Snow Mountain Pass

Core quality:

- cold protection
- dryness control
- tension control
- discipline
- protection history

Main perk:

- `snowDisciplineProtocol`
- Cold Discipline Protocol

### 3. Autumn Trail

Core quality:

- transition
- shedding awareness
- routine adjustment
- balance
- hair/account history

Main perk:

- `autumnTransitionEngine`
- Transition Awareness Engine

### 4. Desert Cliff

Core quality:

- dry survival
- moisture retention
- product discipline
- efficient action
- pressure ranking

Main perk:

- `desertDrySurvival`
- Dry Survival Mode

### 5. Blissful Geysers

Core quality:

- heat
- pressure
- release
- reset
- deep-conditioning cycle

Main perk:

- `geyserPressureRelease`
- Pressure Release Cycle

### 6. Chocolate Factory

Core quality:

- rich layers
- craft
- polish
- export confidence
- final form

Main perk:

- `chocolateFinalForm`
- Final Form Refinement

## New visible UI

Pass 16 adds:

- `#srMapControlDock`
- `#srMapSelector`
- `#srActiveMapHero`
- `#srPerkPanel`
- `#srAccountSeriousnessPanel`

These sit alongside the sticky rank board from Pass 15.

## Exact functions added/changed

### `static/rebuild/sr-map-system.js`

Expanded:

- `MAPS`

Added:

- `renderMapSelector(container)`
- `renderActiveMapHero(container)`

Existing functions now support visible map switching:

- `setActiveMap(mapId, detail)`
- `applyMapTheme(mapId)`

### `static/rebuild/sr-perks-engine.js`

Expanded:

- `PERKS`

Added:

- `renderPerkPanel(container)`
- `renderAccountSeriousnessPanel(container)`

Existing functions now power visible perk activation:

- `activatePerk(perkId, detail)`
- `getPerksState()`

### `static/app.v20260320h.js`

Boot now renders:

- map selector
- active map hero
- perk panel
- account seriousness panel
- rank board

It also refreshes the seriousness/rank UI when a perk activates.

### `static/index.html`

Added:

- visible Map Change dock
- map selector container
- active map hero container
- visible perk panel
- account seriousness panel
- CLS-safe CSS for all of the above

## What became rebuild-owned

- six-map system
- map switching UI
- map theme application
- active map details panel
- visible perk panel
- visible account seriousness panel
- map/perk progress dashboard

## What remains for Pass 17

- admin ratings UI
- account option history UI
- deeper Shopify seriousness analysis connection
- stronger map-specific effects inside each core surface
- real asset selection for map backgrounds
- more detailed admin view of who is taking the program seriously

## CLS / render stability

### Reduced

- map selector has reserved height
- active map hero has reserved height
- perk cards have reserved height
- account seriousness panel has reserved height
- sticky rank board remains contained

### Still visible

- map-specific changes inside every legacy panel still need deeper wiring
- image assets are still metadata/search directions, not actual final app assets
- admin ratings and history UI are not yet complete

## Strategic result

Pass 16 is the bridge from foundation to product behavior.

The system is now:

- visible
- clickable
- themed
- perk-aware
- seriousness-aware

Pass 17 should now focus on:

- admin seriousness controls
- account history/rating UI
- Shopify LCP/INP/CLS seriousness analysis tie-in
