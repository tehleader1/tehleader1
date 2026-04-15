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

## Current Priority Rebuilds

### 1. SupportRD Studio v2

- Decision:
  - do not use `Audacity` as the web app backend
  - use `FFmpeg` as the media engine
  - optionally use `Mux` for hosted live/on-demand video playback
- Why:
  - `FFmpeg` is the serious route for import, transcode, trim, mux, export, filters, and audio/video assembly
  - `Audacity` is not the right web-service backbone for SupportRD Studio
- Studio v2 core UX:
  - record vocal takes
  - import `.mp3`, `.m4a`, `.mp4`
  - hook instrument / soundboard style sources into the same session
  - select a motherboard piece and play that exact piece
  - stop, rewind, forward, pause
  - apply `clean`, `panoramic`, `zoom`, and `sway` style FX
  - export the session
- Studio v2 provider split:
  - `SupportRD`:
    - account/session ownership
    - motherboard model
    - board selection
    - package access
    - UI shell
  - `FFmpeg`:
    - trim
    - transcode
    - join pieces
    - audio/video export
    - filter graph
  - `Mux` optional:
    - hosted video playback
    - live-to-VOD support
    - cleaner video delivery
- Studio v2 required buttons:
  - `Record`
  - `Stop`
  - `Play`
  - `Pause`
  - `Rewind`
  - `Forward`
  - `Import`
  - `Commit Motherboard`
  - `Apply FX`
  - `Export`

### 2. SupportRD Diary Command Center

- Decision:
  - use `Dacast` as the real live stream/channel layer
  - keep SupportRD comments, payments, Aria history, and lobby logic in-house
- Diary command center layout:
  - main screen at top by default:
    - live video first
    - presentation/doc mode allowed
  - under main screen:
    - real comments from Diary Lobby viewers
  - side rail:
    - likes / hearts / paid support / transaction record
  - under side rail:
    - direct Aria history lane
- Presentation mode requirements:
  - font
  - shapes
  - bullet points
  - bold
  - italic
  - `.docx` editing/export path
- Diary provider split:
  - `SupportRD`:
    - owner identity
    - comments
    - transactions
    - paid likes/hearts
    - diary history
    - diary lobby presence
    - Aria history lane
  - `Dacast`:
    - live stream channel
    - playback URL / embed lane
    - live video infrastructure
  - `docx`:
    - document output / editing lane
  - `PptxGenJS` optional:
    - presentation-style export if SupportRD wants a stronger deck mode later
- Important behavior:
  - Aria does not live inside Diary as a floating icon
  - Diary shows the `history of Aria`, not moving-orb Aria itself
  - moving-orb Aria stays in Website Voice mode

### 3. SupportRD FAQ Hair Reel

- Decision:
  - build an owned vertical hair reel first
  - use TikTok embed/display only as an optional later layer
- FAQ Hair Reel core UX:
  - 10-second reel clips
  - vertical feed feel
  - topics:
    - hair video
    - hair problem
    - hair day
  - FAQ answer lane beside or beneath it
- FAQ provider split:
  - `SupportRD`:
    - reel UI
    - FAQ answer engine
    - Developers Feed
  - `TikTok` optional later:
    - authorized creator videos
    - embedded post playback
  - `Mux` optional later:
    - SupportRD-owned short-form video hosting if the reel grows
- Required FAQ buttons:
  - `Play Reel`
  - `Next Reel`
  - `Shuffle`
  - `Ask SupportRD`
  - `Post To Developers Feed`

## Immediate Build Order

1. `Studio v2 shell + FFmpeg-backed export plan`
2. `Diary command center layout + Dacast integration path`
3. `FAQ owned hair reel with 10-second clip behavior`
