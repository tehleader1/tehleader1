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

## Trail Model

- `local-remote` stays the one main trail shell
- `Diary`, `Studio`, `Profile`, `Map Change`, `Settings`, and `FAQ Lounge` behave like embedded app surfaces inside that shell
- each surface can still have its own route/file for rebuilding, but the user experience should feel like one connected operating system instead of confusing page jumps
- each surface should reveal only the controls that belong to that lane
- sticky elements should support the trail, not compete with the active module

### Diary
- Product surface: embedded live diary surface inside the main trail shell
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
  - paid live feed
  - owner identity
  - lobby discovery
  - comments
  - AI hair-problem response filter and input
  - guest support/pay
  - diary history

### Profile
- Product surface: embedded verification and hair-credential surface inside the main trail shell
- Core SupportRD APIs:
  - `/api/profile/access-scanner`
  - `/api/profile/analysis/export`
- Scan provider target:
  - `Banuba`
- Enrichment provider target:
  - `Interzoid Get Executive Profile`
- SupportRD responsibility:
  - live hair analysis
  - profile-picture-centered scan flow
  - identity confirmation
  - certain person-quality confirmations tied to the profile
  - hair scan history
  - export history
  - account continuity

### Studio
- Product surface: embedded studio surface inside the main trail shell
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
  - `.mp3`, `.m4a`, `.mp4` output
  - motherboard layout
  - individual pieces that come together as one session
  - account/session ownership
  - package access
  - live recorder UX

### Settings
- Product surface: embedded settings/control surface inside the main trail shell
- Provider target:
  - `Drupal Configuration API` as configuration-model inspiration
- SupportRD responsibility:
  - diary posting URL routing
  - change password
  - change email
  - change address
  - change phone number
  - push notifications
  - Aria response level
  - account preferences
  - push routes
  - tags
  - last-used map
  - route/state continuity

### Map Change
- Product surface: embedded route/map selector surface inside the main trail shell
- Provider target:
  - `Unity`-style map selector lane
- SupportRD responsibility:
  - general information
  - explicit color/style choice
  - remote picture choice using actual map images
  - special perks for the hair social feed aspect
  - remembered map state
  - perks/ad sidecars
  - route transitions

### FAQ Lounge
- Product surface: embedded social/reel/help surface inside the main trail shell
- Provider target:
  - native SupportRD video/reel lane
- SupportRD responsibility:
  - 10-second TikTok-style hair feed
  - direct FAQs about Studio, Diary, subscription scope, and reveal paths
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
- each major area gets rebuilt as its own local app surface
- those surfaces can load from dedicated local routes during development, but the shell should present them as one connected trail
- each surface owns its own frontend behavior and button set
- SupportRD backend owns account, session, persistence, and route continuity
