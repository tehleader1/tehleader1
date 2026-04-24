# Pass 21 — Market Reader / Laser Refinement

## Main goal

Refine the market app reader/laser behavior without inventing a fake separate app.

The actual runtime contains the Workday SEO / market pulse surface, so this pass wraps that real system with a rebuild-owned reader/laser layer.

## Files changed

- `static/rebuild/sr-market-reader.js`
- `static/rebuild/sr-app-state.js`
- `static/app.v20260320h.js`
- `static/index.html`
- `docs/rebuild-progress-pass21.json`
- `docs/rebuild-progress-dashboard-pass21.md`

## New module

Added:

- `static/rebuild/sr-market-reader.js`

### New functions

- `getMarketReaderState()`
- `patchMarketReaderState()`
- `startMarketLaser()`
- `settleMarketLaser()`
- `failMarketLaser()`
- `parsePulseText()`
- `renderMarketReaderPanel()`
- `initMarketReader()`

## What became rebuild-owned

The rebuild layer now owns:

- market reader state
- laser scan phase
- laser settled phase
- fallback phase
- reader confidence
- reader risk state
- parsed Shopify/SEO/market lines
- visible Market Reader panel
- reader timing metadata

## Runtime integration

`setupWorkdaySeoEngine()` now uses the rebuild reader:

### On refresh start

Calls:

```js
startMarketLaser(...)
```

This marks the market reader as:

- scanning
- active laser sweep
- shell reading

### On successful pulse

Calls:

```js
parsePulseText(...)
settleMarketLaser(...)
```

This stores:

- pulse lines
- finance status
- SEO summary
- confidence score
- risk state

### On failure

Calls:

```js
failMarketLaser(...)
```

This keeps the market reader clear instead of leaving the UI confused.

## Visible UI added

Added:

- `#srMarketReaderPanel`

It displays:

- reader status
- laser phase
- confidence
- risk
- finance status
- latest parsed market pulse lines

## Stability improvements

### Timing

The reader now has explicit phases:

- idle
- scanning
- settled
- fallback

### Shell clarity

The reader has a visible panel showing whether it is scanning, settled, or in fallback.

### Reader logic

Pulse text is parsed into structured reader state instead of staying only as raw text.

### Fallback

If the market pulse fails, the reader shows fallback clarity instead of silently failing.

## Shopify lens

### LCP

No heavy market assets were added.

### INP

Market scan is still async and lightweight; reader state updates after the pulse.

### CLS

The reader panel has reserved height and layout containment.

## What remains legacy-owned

Still legacy-owned:

- Workday SEO plan data
- market pulse fetch timing
- Shopify finance endpoint transport
- Alpha Vantage/public market feed placeholder
- exact final market visual styling

## Strategic result

The market/laser system is now structured:

- scan starts clearly
- reader settles clearly
- fallback is explicit
- confidence/risk is visible
- pulse data becomes state

This gives the market system a serious reader foundation without breaking the existing Workday SEO engine.
