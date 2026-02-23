# Rift Clash

## What This Is

A 5-minute asymmetric hero brawler built as a browser game with Phaser 3 and TypeScript. Players pick from 3 random heroes, then battle in arena combat with AI-controlled teammates and opponents. Matches feature random team sizes (1v1 to 5v5), random battle trait modifiers, a central boss with tiered kill rewards, destructible towers, neutral buff camps, and a full scoring system with Sudden Death tiebreaker. Ranked progression uses flat +/-40 MMR through Bronze, Silver, Gold, Platinum, and Apex tiers.

## Core Value

Asymmetric chaos that feels like a skill test — being thrown into a 1v3 as the solo player at high MMR and winning through outplay, not handicaps.

## Current State

**Version:** v1.0 MVP (shipped 2026-02-23)
**Codebase:** ~9,900 LOC TypeScript, Phaser 3.90.0 + Vite
**Heroes:** 13 with Q/W/E/R + passive
**Battle Traits:** 8 (stat, mechanic, rule-change categories)
**Gems:** 8 random power-ups
**Neutral Camps:** 4 types (Damage, Shield, Haste, Cooldown)

All 31 v1 requirements shipped. No critical tech debt.

## Requirements

### Validated

- ✓ Hero entity system with HP, mana, stats, buffs, and visual components — existing
- ✓ 3 abilities per hero with cooldowns and mana costs — existing
- ✓ Combat system with projectiles, area effects, dashes, and buffs — existing
- ✓ AI controller with finite state machine (IDLE/CHASE/ATTACK/RETREAT/USE_ABILITY) — existing
- ✓ AI personality profiles for behavior variation — existing
- ✓ Procedural texture generation for heroes — existing
- ✓ Match flow: Menu -> Draft -> Battle -> Results — existing
- ✓ VFX system with particles and camera effects — existing
- ✓ Arena generation with obstacles — existing
- ✓ HUD with timer, kill feed, ability bar — existing
- ✓ 5-minute hard match cap with scoring-based victory condition — v1.0
- ✓ Heroes respawn after death with max 10-second timer — v1.0
- ✓ Forward-only state machine: PRE_MATCH -> ACTIVE -> SUDDEN_DEATH -> ENDED — v1.0
- ✓ Asymmetric team sizes with random assignment — v1.0
- ✓ MMR-situational adaptive scaling — v1.0
- ✓ AI target distribution preventing focus-fire — v1.0
- ✓ 13 heroes with Q/W/E/R + passive, XP leveling — v1.0
- ✓ Boss system: 3 tiers, revival token, damage amp, roaming, Sudden Death trigger — v1.0
- ✓ Tower system: damage, regen, boss-disable, destruction win — v1.0
- ✓ 4 neutral buff camps with 60s respawn and team buffs — v1.0
- ✓ 8 Battle Traits + 8 Gems with incompatibility blacklists — v1.0
- ✓ Four-source scoring: kills (1pt), boss (3pt), tower threshold (2pt), camps (1pt) — v1.0
- ✓ Sudden Death at 5:00 tie or boss Tier 3 — v1.0
- ✓ Pick-from-3 draft with 25s countdown — v1.0
- ✓ 5-tier ranked system (Bronze/Silver/Gold/Platinum/Apex) with +/-40 MMR — v1.0

### Active

(None — define in next milestone via `/gsd:new-milestone`)

### Out of Scope

- Online multiplayer — AI-only for v1, multiplayer is a future milestone
- Creep/minion waves — no passive farming, contradicts core philosophy
- Lanes and barracks — pure arena, no lane-pushing mechanics
- Item shop / gold system — replaced by XP + random gem
- High ground mechanics — pure arena defense only
- Surrender votes — 5-minute matches don't need them
- Mobile app — browser-first
- Video/voice communication — no multiplayer means no comms needed

## Constraints

- **Tech stack**: Phaser 3 + TypeScript + Vite — evolve existing codebase, no framework migration
- **Platform**: Browser-only, ES2020 target
- **Match duration**: Hard 5-minute cap, non-negotiable design pillar
- **AI-only**: No networking/multiplayer infrastructure in v1
- **No external assets**: Continue using procedural texture generation for all visuals

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Evolve existing codebase | Significant working systems already built (combat, AI, VFX, draft) | ✓ Good — 9,900 LOC on solid foundation |
| AI-only for v1 | Reduces scope dramatically, lets us focus on core gameplay feel | ✓ Good — shipped in 3 days |
| Asymmetry as skill test, not balanced mode | At high MMR, 1v3 should be hard but possible through outplay | ✓ Good — MMR scaling validated |
| MMR-situational scaling | High MMR players get less help in asymmetric matches | ✓ Good — TEAM_BALANCE.MMR_SCALE_REDUCTION=0.7 |
| Pick-from-3 draft | Adds variance without full roster overwhelm | ✓ Good — 25s timer, auto-pick |
| No gold/items, XP + random gem only | Eliminates farming, keeps focus on combat and objectives | ✓ Good — no economy exploits |
| EventBus singleton (Phaser EventEmitter) | Already bundled, survives scene restarts | ✓ Good — zero new deps |
| Forward-only state machine | Prevents invalid transitions, simplifies reasoning | ✓ Good — no race conditions at 5:00 |
| Waypoint roaming (not NavMesh) for boss | Simpler, Phaser Arcade handles collision sliding | ✓ Good — 8 waypoints sufficient |
| Flat +/-40 MMR (not ELO) | Fast climbing for 5-minute matches | ✓ Good — simple, predictable |

---
*Last updated: 2026-02-23 after v1.0 milestone*
