# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-01-04

### Added
- **Settings**: Audio Output Device selection (Speakers/Headphones)
- **Settings**: Microphone selection UI (with "Coming Soon" placeholder)
- **UI**: Visual feedback during initial speech model loading ("Downloading... This happens once")

### Fixed
- **Persistence**: Fixed affection level and stats resetting on refresh by ensuring `affectionData` is correctly saved to `settings.json`
- **Voice Mode**: Fixed issue where voice mode would fail to start or cause errors; reverted to stable native Web Speech API for reliability
- **Stability**: Resolved syntax error in `useWhisper` hook (though currently unused in favor of native speech)

## [1.0.0] - 2024-12-30

### Added

- **Core Features**
  - 3D VRM avatar with real-time lip-sync and emotion expressions
  - Ollama-powered local AI with streaming responses
  - Kokoro TTS with high-quality voice synthesis
  - Speech recognition for voice input
  - Persistent memory system that learns about the user
  - Affection/relationship system with unlockable content

- **Personality System**
  - 5 personality tiers based on affection level
  - Dynamic prompts that evolve with the relationship
  - Time-of-day aware greetings
  - Emotion detection from responses

- **Customization**
  - Multiple outfit options (Classic, Bikini, Nude)
  - Hairstyle selection
  - Hair color customization
  - Animated stage backgrounds (Default, Beach, Bedroom, Night City)

- **UI/UX**
  - Glassmorphism design with gothic-pink theme
  - Floating menu with quick actions
  - Affection meter display
  - Streaks panel with weekly progress
  - Subtitle/caption overlay
  - First-launch onboarding experience

- **Recording & Capture**
  - Canvas recording with audio capture
  - Clip sharing functionality
  - Thumbnail capture for customization items

- **Settings**
  - AI model selection
  - Voice selection (multiple Kokoro voices)
  - Voice toggle and caption toggle
  - Custom VRM model path support
  - NSFW content toggle (level-gated)
  - Affection reset option

- **Documentation**
  - Landing page website (`/docs`)
  - Comprehensive README.md
  - AGPL-3.0 License

### Technical

- Built with Tauri 2.0 + React + TypeScript
- Three.js with @pixiv/three-vrm for 3D rendering
- Vite for fast development builds
- TailwindCSS for styling
- Full offline capability (no cloud dependencies)

---

## [Unreleased]

### Planned
- More outfit options
- Additional stage backgrounds
- Animation triggers from chat
- Mobile/tablet responsive improvements
- Multi-language support
