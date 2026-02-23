# Requirements: Rift Clash

**Defined:** 2026-02-22
**Core Value:** Asymmetric chaos that feels like a skill test — being thrown into a 1v3 as the solo player at high MMR and winning through outplay, not handicaps.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Match Flow

- [x] **FLOW-01**: Match has a 5-minute hard cap with visible countdown timer
- [x] **FLOW-02**: Heroes respawn after death with max 10-second respawn timer
- [ ] **FLOW-03**: Match ends with score calculation: hero kill (1pt), boss kill (3pt), tower damage threshold (2pt), neutral control majority (1pt)
- [x] **FLOW-04a**: Match progresses through states: PRE_MATCH → ACTIVE → ENDED with forward-only transitions
- [ ] **FLOW-04b**: Match state machine supports SUDDEN_DEATH state between ACTIVE and ENDED
- [ ] **FLOW-05**: Tie at 5:00 triggers Sudden Death mode (no respawns, last team standing wins)
- [ ] **FLOW-06**: Match can end early via tower destruction (instant win) or boss tier 3 kill (triggers Sudden Death)

### Heroes

- [x] **HERO-01**: 6-10 playable heroes with distinct playstyles covering different combat roles
- [x] **HERO-02**: Each hero has 3 basic abilities (Q/W/E) + 1 ultimate (R) + 1 passive
- [x] **HERO-03**: Heroes gain XP from combat kills and objective interactions (no gold system)
- [x] **HERO-04**: Heroes level up during match with stat scaling (HP, damage, ability power)
- [ ] **HERO-05**: Each match assigns a random Battle Trait modifier to each hero (e.g., double stun duration, lifesteal→shield, spell burn, blink reset on kill)
- [ ] **HERO-06**: Each hero receives a random Gem power-up at match start providing a stat or ability modifier

### Asymmetric Teams

- [x] **ASYM-01**: System randomly assigns team sizes each match (1v1, 2v1, 3v2, 4v1, 5v5, any combination)
- [x] **ASYM-02**: Solo/smaller team receives MMR-situational adaptive scaling (high MMR = less help, low MMR = more help)
- [x] **ASYM-03**: AI teammates distribute targets to prevent focus-fire killing solo players in under 5 seconds

### Boss System

- [x] **BOSS-01**: Central boss spawns immediately at match start and scales in power every minute
- [x] **BOSS-02**: First boss kill grants team-wide stat buff + 1 revival token (mini Aegis)
- [ ] **BOSS-03**: Second boss kill grants permanent damage amplification and boss begins roaming the map
- [ ] **BOSS-04**: Third boss kill triggers Sudden Death mode
- [x] **BOSS-05**: Boss has multi-phase AI with escalating attack patterns as it grows stronger

### Tower System

- [x] **TOWR-01**: Each team has one Core Tower that deals high damage to nearby enemies
- [x] **TOWR-02**: Tower regenerates HP slowly when not under attack
- [x] **TOWR-03**: Tower is temporarily disabled when boss is killed
- [x] **TOWR-04**: Destroying the enemy Core Tower results in instant match victory

### Neutral Camps

- [ ] **CAMP-01**: 4 neutral buff camps on the map: Damage, Shield, Haste, Cooldown
- [ ] **CAMP-02**: Neutral camps respawn every 60 seconds after being cleared
- [ ] **CAMP-03**: Killing a neutral camp grants a 30-second buff to the killing hero's team

### Draft

- [ ] **DRFT-01**: Player is presented 3 random heroes and picks 1 before each match

### Ranked

- [ ] **RANK-01**: Player progresses through rank tiers: Bronze, Silver, Gold, Platinum, Apex
- [ ] **RANK-02**: MMR shifts ±40 per match for fast climbing

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multiplayer

- **MULT-01**: Online real-time multiplayer with matchmaking
- **MULT-02**: Lobby system for custom team compositions

### Content

- **CONT-01**: Additional heroes beyond initial 6-10 roster
- **CONT-02**: Map variants with different layouts and zone configurations
- **CONT-03**: Seasonal Battle Trait rotations

### Social

- **SOCL-01**: Spectator mode for watching live matches
- **SOCL-02**: Replay system for reviewing past matches
- **SOCL-03**: Tournament/bracket mode

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Creep/minion waves | Contradicts "no passive farming" core philosophy |
| Lanes and barracks | Pure arena design — no lane-pushing mechanics |
| Item shop / gold system | Replaced by XP-only + random gem system |
| High ground mechanics | Pure arena defense, no terrain advantage |
| Surrender votes | 5-minute matches don't need them |
| Mobile app | Browser-first, mobile is a future platform |
| Voice/text chat | No multiplayer in v1, no comms needed |
| Creep last-hitting | Gold-free design eliminates farming entirely |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLOW-01 | Phase 1 | Done |
| FLOW-02 | Phase 1 | Done |
| FLOW-03 | Phase 7 | Pending |
| FLOW-04a | Phase 1 | Done |
| FLOW-04b | Phase 7 | Pending |
| FLOW-05 | Phase 7 | Pending |
| FLOW-06 | Phase 7 | Pending |
| HERO-01 | Phase 2 | Done |
| HERO-02 | Phase 2 | Done |
| HERO-03 | Phase 2 | Done |
| HERO-04 | Phase 2 | Done |
| HERO-05 | Phase 5 | Pending |
| HERO-06 | Phase 5 | Pending |
| ASYM-01 | Phase 3 | Done |
| ASYM-02 | Phase 3 | Done |
| ASYM-03 | Phase 3 | Done |
| BOSS-01 | Phase 4 | Done |
| BOSS-02 | Phase 4 | Done |
| BOSS-03 | Phase 7 | Pending |
| BOSS-04 | Phase 7 | Pending |
| BOSS-05 | Phase 4 | Done |
| TOWR-01 | Phase 4 | Done |
| TOWR-02 | Phase 4 | Done |
| TOWR-03 | Phase 4 | Done |
| TOWR-04 | Phase 4 | Done |
| CAMP-01 | Phase 6 | Pending |
| CAMP-02 | Phase 6 | Pending |
| CAMP-03 | Phase 6 | Pending |
| DRFT-01 | Phase 8 | Pending |
| RANK-01 | Phase 8 | Pending |
| RANK-02 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 — traceability filled after roadmap creation*
