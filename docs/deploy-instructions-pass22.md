# SupportRD Pass 22 Deploy Instructions

## Local preview

From the unzipped project root:

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000/static/index.html
```

## What to verify

1. Map Control Dock loads.
2. All 6 maps can be selected.
3. Perk panel updates and activating a perk updates seriousness/rank.
4. Admin Seriousness panel shows LCP / INP / CLS.
5. Shell Status panel changes when opening Studio, Diary viewer, or Fast Pay.
6. Market Reader panel scans and settles after Workday SEO pulse refresh.
7. Deploy Readiness panel shows core rebuild systems.
8. Mobile width does not cause uncontrolled layout shift.

## Deployment note

This package is static-preview ready, but live deployment must verify API-backed features:

- Shopify finance endpoint
- Diary endpoints
- Studio endpoints
- any social/acquisition endpoints

## Heavy assets

Real map image assets are still intentionally deferred. Add them later with optimization/lazy loading to protect LCP.
