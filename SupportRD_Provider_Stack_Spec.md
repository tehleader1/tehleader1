# SupportRD Provider Stack Spec

## Build Order

1. Diary
2. Profile
3. Studio
4. Settings
5. Map Change
6. FAQ Lounge
7. Website Voice

## Provider Stack

### Diary
- Product surface: standalone live diary app
- Core SupportRD APIs:
  - `/api/diary/session/bootstrap`
  - `/api/diary/session/save`
  - `/api/diary/session/feed`
  - `/api/diary/session/public`
  - `/api/diary/comment`
  - `/api/diary/lobby`
- Streaming provider target:
  - `Dacast`
- SupportRD responsibility:
  - owner identity
  - lobby discovery
  - comments
  - guest support/pay
  - diary history

### Profile
- Product surface: standalone verification and hair-credential app
- Core SupportRD APIs:
  - `/api/profile/access-scanner`
  - `/api/profile/analysis/export`
- Enrichment provider target:
  - `Interzoid Get Executive Profile`
- SupportRD responsibility:
  - identity confirmation
  - hair scan history
  - export history
  - account continuity

### Studio
- Product surface: standalone studio app
- Core SupportRD APIs:
  - `/api/studio/session/bootstrap`
  - `/api/studio/board/commit`
  - `/api/studio/trim`
  - `/api/studio/fx/apply`
  - `/api/studio/export`
  - `/api/studio/session/history`
- Media engine target:
  - `FFmpeg`
- SupportRD responsibility:
  - motherboard layout
  - account/session ownership
  - package access
  - live recorder UX

### Settings
- Product surface: standalone settings/control app
- Provider target:
  - `Drupal Configuration API` as configuration-model inspiration
- SupportRD responsibility:
  - account preferences
  - push routes
  - tags
  - last-used map
  - route/state continuity

### Map Change
- Product surface: standalone route/map selector app
- Provider target:
  - `Unity`-style map selector lane
- SupportRD responsibility:
  - remembered map state
  - perks/ad sidecars
  - route transitions

### FAQ Lounge
- Product surface: standalone social/reel/help app
- Provider target:
  - native SupportRD video/reel lane
- SupportRD responsibility:
  - developers feed
  - direct answers
  - relaxed social support feel

### Website Voice
- Product surface:
  - Aria
  - Jake
  - Hands Free
  - Diary voice lane
- AI provider target:
  - `OpenAI`
- SupportRD responsibility:
  - product knowledge
  - account knowledge
  - payments
  - inner circle
  - professional/making money
  - advanced mode

## Boundary Logic

- `local-remote` becomes the launcher shell
- each major area becomes a standalone local app
- the launcher opens standalone pages instead of embedded legacy panels
- each standalone page owns its own frontend behavior
- SupportRD backend owns account, session, persistence, and route continuity
