# SupportRD Integration Spec: Diary + Studio + Aria / Jake

## Purpose

This spec covers the living heart of SupportRD:

- Diary Mode
- Studio
- Aria / Jake
- Hands Free
- moving icons

This is the system that has to feel alive, premium, responsive, and unified.

## Main Goal

All of these lanes should feel like one voice system with one shared memory and one controlled route structure.

## Unified Voice Controller

All voice entry points should route through one main controller.

### Entry Modes

1. Icon Mode
- click moving Aria/Jake icon
- greeting-level support
- fast route awareness

2. Hands Free
- welcome line
- persistent open mic
- continuous listen / transcribe / respond loop

3. Diary Mode
- no small talk
- advanced hair-help start
- voice turns save into diary history

4. Studio Voice Lane
- studio-specific support
- can remain separate from raw media recording if needed
- still belongs to the same overall voice family

### Shared Voice Promise

- one main SupportRD voice family should power:
  - moving Aria / Jake icons
  - Hands Free
  - Diary Mode
  - Studio support voice
- Diary should feel more advanced by default
- moving icons should feel more greeting-led by default
- all four lanes must still feel like one product

## Voice Flow

### Icon Mode

- click moving icon
- intro sound
- greeting
- pause
- mic opens
- user speaks
- system transcribes
- account/history context loads
- Aria or Jake responds
- ending sound

### Hands Free Mode

- welcome line
- mic opens and stays open
- user speaks
- short silence threshold
- transcribe
- context check
- response
- mic remains open

### Diary Mode

- “How can I help with your hair problem today?”
- no extra greeting fluff
- advanced mode by default
- response gets saved into diary session and diary history

## Mode Escalation

### Greeting

- basic welcome and simple hair guidance

### Advanced

- deeper product and usage explanation
- stronger educational tone

### Inner Circle

- family-related memory
- gentle continuity
- relationship-safe and supportive

### Professional / Making Money

- hair-related business and financial guidance
- premium lane energy

## Diary System

Diary must function as both:

- private/personal voice journal
- public live feed channel

### Direct Session Access

- every diary session should be discoverable by:
  - direct URL
  - `^^ tag`
  - name
  - email
  - lobby entry
- direct URL should open inside the Remote view with:
  - feed screen
  - live comments
  - guest support payment
  - big `X` back to the main Remote

### Diary Live Requirements

- live session screen
- comments
- hearts/thumbs/support
- guest support payment
- session ownership
- URL / tag discoverability

### Diary History Requirements

- save voice turns
- save comments
- save support activity
- preserve account continuity

## Diary Lobby Requirements

The lobby is the public discovery layer for live diary sessions.

- recent 7 feeds
- sort by:
  - recent
  - email
  - URL
  - tag
- search by:
  - name
  - email
  - tag
  - URL
- lobby should include:
  - avatar or stock image
  - name
  - tag
  - preview text
  - live activity summary
  - Shopify-related support/traffic summary

### Diary Lobby Sticky Panel

- the lobby must hover within the app as a sticky support panel
- it should feel like a live open feed channel, not a detached directory
- it should include:
  - recent 7 feeds
  - search box
  - smart dropdown suggestions
  - sort/filter controls
  - latest movement activity
  - traffic / support signals

## Studio Requirements

Studio is the creation lane and should remain serious.

### Core Studio Needs

- record
- pause
- stop
- waveform
- video screen
- save session
- export
- motherboard visuals

### Full API Takeover Requirement

- Studio should not feel like leftover old UI with small patches
- Studio must feel like one full API-backed booth:
  - device preflight
  - session bootstrap
  - waveform generation
  - transcript generation
  - board save / restore
  - export
  - premium Jake gating
- if Studio keeps its own mic system, it still must report into the same SupportRD session family

### Premium Jake Gate

- logged out: blocked
- logged in but unpaid: blocked behind premium
- logged in and paid: full booth access

### Voice Relationship To Studio

- Studio support voice belongs to the same SupportRD intelligence family
- but raw media recording can remain its own capture system if needed

## Aria / Jake Movement Engine

The roaming icons are a must-have feature.

### Movement Principles

- route-aware
- scroll-aware
- click-aware
- hotspot-aware
- scanner-aware

### Required Behavior

- cut corners when the user targets an active hotspot
- move directly to needed zones
- avoid blocking important controls
- feel humanoid and intentional
- expose tuning hooks for adjustment

### Movement Capture Requirement

- the actual movement math is a must-feature and cannot be treated as mystery logic
- it must stay captured in adjustable control files / tuning objects
- the scanner should know:
  - active zone
  - intended zone
  - recent click zone
  - route hotspot
  - current motion target
- movement should become more professional by:
  - cutting corners
  - zoning into active controls
  - reacting to multiple clicks intelligently
  - following scroll / route changes faster

## Scanner Relationship

The scanner is the truth system behind the experience.

### Scanner Must Know

- current route
- current panel
- visible controls
- button health
- active assistant
- movement zone
- diary/studio/profile/settings relevance
- whether the route is truly alive

### Why It Matters

Without scanner truth:

- icons feel fake
- buttons feel dead
- routes feel disconnected

### Scanner Expansion Targets

- scanner should explain why Diary is not opening
- scanner should explain why Studio is not opening
- scanner should report voice readiness for Aria/Jake
- scanner should map the active travel boundaries of the assistants
- scanner should serve as the detail-under-access view for serious debugging

## Shared Memory Rules

- same account powers diary + studio + voice identity
- same person should carry:
  - profile
  - purchase memory
  - diary continuity
  - studio continuity
  - assistant continuity

### Revenue / Access Rules

- Diary feed support can be paid by guests or signed-in users
- Jake Premium Studio must stay locked until paid
- advanced / inner-circle / professional treatment should respect purchase state
- checkout return should reconnect directly to account memory and active session state

## Failure Rules

If mic fails:

- show live reason
- keep route context

If studio premium is locked:

- show premium gate clearly

If diary session is not live:

- show non-live state clearly

If a button is dead:

- scanner should report it

## Final Product Goal

Diary + Studio + Aria/Jake should feel like:

- one living intelligence
- one movement language
- one emotional shell
- one premium support experience

This is the part of SupportRD that makes the product feel alive.
