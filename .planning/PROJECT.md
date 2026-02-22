# Rift Clash

## What This Is

A 5-minute asymmetric hero brawler inspired by Dota 2, built as a browser game with Phaser 3 and TypeScript. Players control one hero in fast-paced arena combat with AI-controlled teammates and opponents. Matches feature random team sizes (1v1, 2v3, 1v5, etc.) and random battle modifiers, creating high-variance games that test mechanical skill and decision-making under pressure.

## Core Value

Asymmetric chaos that feels like a skill test — being thrown into a 1v3 as the solo player at high MMR and winning through outplay, not handicaps.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Inferred from existing codebase. -->

- ✓ Hero entity system with HP, mana, stats, buffs, and visual components — existing
- ✓ 3 abilities per hero with cooldowns and mana costs — existing
- ✓ Combat system with projectiles, area effects, dashes, and buffs — existing
- ✓ AI controller with finite state machine (IDLE/CHASE/ATTACK/RETREAT/USE_ABILITY) — existing
- ✓ AI personality profiles for behavior variation — existing
- ✓ Procedural texture generation for heroes — existing
- ✓ Draft scene with hero selection — existing
- ✓ Match flow: Menu → Draft → Battle → Results — existing
- ✓ MMR/ELO ranking system with persistent storage — existing
- ✓ VFX system with particles and camera effects — existing
- ✓ Arena generation with obstacles — existing
- ✓ HUD with timer, kill feed, ability bar — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] 5-minute hard match cap with scoring-based victory condition
- [ ] Asymmetric team sizes (1v1, 2v1, 3v2, 4v1, 5v5, any combo) with random assignment
- [ ] MMR-situational adaptive scaling (high MMR solo gets less help, low MMR gets more)
- [ ] Boss system (Roshan-inspired) — spawns immediately, scales per minute, drops revival token + stat buff
- [ ] Second boss kill grants damage amplification + boss starts roaming
- [ ] Third boss kill triggers Sudden Death mode
- [ ] Core Tower per team — high damage, slow regen, disabled by boss kill
- [ ] Tower destruction = instant win condition
- [ ] 4 neutral buff camps (Damage, Shield, Haste, Cooldown) spawning every 60s
- [ ] Scoring system: kills (1pt), boss kill (3pt), tower damage threshold (2pt), neutral control (1pt)
- [ ] Tie at 5:00 = Sudden Death (no respawns)
- [ ] Pick-from-3 hero draft (3 random heroes, choose 1)
- [ ] Battle Traits — random modifier per match (double stun, lifesteal→shield, spell burn, blink reset on kill, etc.)
- [ ] XP-only progression (no gold) — combat and objectives grant XP for leveling
- [ ] Random Gem system — single random power-up item per match
- [ ] 6-10 heroes with distinct playstyles (3 basic skills + 1 ultimate + 1 passive)
- [ ] Ultimate ability (4th skill) per hero
- [ ] Passive ability per hero
- [ ] Respawn timer max 10 seconds
- [ ] Ranked system with tiers: Bronze, Silver, Gold, Platinum, Apex
- [ ] MMR shifts of ±40 per match for fast climbing

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Online multiplayer — AI-only for v1, multiplayer is a future milestone
- Creep/minion waves — no passive farming, contradicts core philosophy
- Lanes and barracks — pure arena, no lane-pushing mechanics
- Item shop / gold system — replaced by XP + random gem
- High ground mechanics — pure arena defense only
- Surrender votes — 5-minute matches don't need them
- Mobile app — browser-first
- Video/voice communication — no multiplayer means no comms needed

## Context

The game is being evolved from an existing Dota 2-inspired codebase built with Phaser 3 (v3.90.0) and TypeScript. The current codebase has working hero combat, AI controllers, a draft system, procedural textures, VFX, and an MMR system. The existing architecture uses a scene-based game loop with stateful system managers, direct method calls (no event bus), and localStorage for persistence.

Key systems that need significant rework:
- **Match flow:** Currently ends on player death (instant defeat). Needs respawn system + 5-minute timer + scoring.
- **Team composition:** Currently generates teams but without asymmetric sizing or balancing.
- **Map:** Currently an arena with obstacles. Needs boss area, tower positions, neutral camps, vision points.
- **Hero design:** Currently has heroes with 3 abilities. Needs ultimates, passives, and battle traits added.
- **Draft:** Currently shows hero cards. Needs pick-from-3-random mechanic.

## Constraints

- **Tech stack**: Phaser 3 + TypeScript + Vite — evolve existing codebase, no framework migration
- **Platform**: Browser-only, ES2020 target
- **Match duration**: Hard 5-minute cap, non-negotiable design pillar
- **AI-only**: No networking/multiplayer infrastructure in v1
- **No external assets**: Continue using procedural texture generation for all visuals

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Evolve existing codebase | Significant working systems already built (combat, AI, VFX, draft) | — Pending |
| AI-only for v1 | Reduces scope dramatically, lets us focus on core gameplay feel | — Pending |
| Asymmetry as skill test, not balanced mode | At high MMR, 1v3 should be hard but possible through outplay | — Pending |
| MMR-situational scaling | High MMR players get less help in asymmetric matches, low MMR get more | — Pending |
| Pick-from-3 draft | Adds variance without full roster overwhelm | — Pending |
| No gold/items, XP + random gem only | Eliminates farming, keeps focus on combat and objectives | — Pending |

---
*Last updated: 2026-02-22 after initialization*
