# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Asymmetric chaos that feels like a skill test — being thrown into a 1v3 as the solo player at high MMR and winning through outplay, not handicaps.
**Current focus:** Phase 2 — Hero Identity

## Current Position

Phase: 2 of 8 (Hero Identity) — In Progress
Plan: 4 of 5 — 02-04 done
Status: Active — 02-04 complete, ready for 02-05 (HUD XP bar)
Last activity: 2026-02-23 — Completed 02-04 (passive system); 13 hero passives in heroData.ts, Hero.subscribePassive/applyPassiveEffect/showPassiveVFX/destroy lifecycle, EventBus cleanup

Progress: [█████░░░░░] 35%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 2 min
- Total execution time: 17 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5/5 | 12 min | 2 min |
| 02-hero-identity | 4/5 | 8 min | 2 min |

**Recent Trend:**
- Last 5 plans: 2 min, 1 min, 1 min, 2 min, 2 min
- Trend: fast

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Respawn system is Phase 1 keystone — "death = match over" must be replaced before any other feature is meaningful
- [Roadmap]: Boss Tier 2 roaming deferred to Phase 7 (after Tier 1 economy validated in Phase 4)
- [Roadmap]: AI target distribution ships in Phase 3 with asymmetric teams — unplayable without it
- [Roadmap]: TraitSystem reuses combat event hooks built in Phase 2 — Phase 5 depends on Phase 2 completing hooks
- [01-01]: Use Phaser.Events.EventEmitter (not bare EventEmitter3) — already bundled in Phaser 3.90.0, no new dependency
- [01-01]: Module-level EventBus singleton over game.events — survives scene restarts cleanly
- [01-01]: Scene typing pattern: IBattleScene & Phaser.Scene intersection instead of any, applied to HUD first
- [01-02]: Floating damage/heal visuals stay on Hero via override (not BaseEntity) — Hero-specific behavior, not shared logic
- [01-02]: Physics body setup stays in Hero constructor — HERO_RADIUS is Hero-specific; future entity types configure their own bodies
- [01-02]: getArmor() defaults to 0 in BaseEntity — Hero overrides with stats.armor; clean extension point for bosses/towers
- [01-02]: die() is idempotent via isAlive guard — prevents double HERO_KILLED emission on AoE hits
- [01-03]: endMatch() uses local endingMatch boolean guard — MatchStateMachine transition() prevents double-ENDED, endingMatch prevents double delayedCall
- [01-03]: onHeroKill converted to private EventBus handler taking { victim, killerId } — consistent with EventBus decoupling pattern
- [01-03]: HUD updated in 01-03 (not deferred to 01-05) — removing matchTimer/matchOver from IBattleScene forced update; MM:SS format added as natural consequence
- [01-03]: MATCH_DURATION = 300, RESPAWN_DURATION = 5000 in constants.ts — single source of truth for Phase 1 timing values
- [01-04]: onHeroKilled renamed from onHeroKill — completes naming alignment with EventBus payload convention established in plan 01-02
- [01-04]: Physics body setCircle(HERO_RADIUS, -HERO_RADIUS, -HERO_RADIUS) must be called on respawn (not just setEnable) — die() zeroes radius via setCircle(0); without restoring it projectiles pass through respawned hero
- [01-04]: playerRespawnEndTime uses Date.now() timestamp approach — simpler than a dedicated Phaser timer event; plan 01-05 HUD computes remaining seconds per frame
- [01-05]: Timer circle radius increased from 25 to 32 — MM:SS text (e.g. '5:00') is wider than single integer '60'
- [01-05]: White color reset added as else branch — without it, timer stays red after counting back up (e.g. Play Again reset)
- [01-05]: Math.floor() applied to timeRemaining before formatTime — avoids edge case at second boundary
- [02-01]: HeroStats.passive is required (not optional) so TypeScript flags all 13 heroData.ts entries — compiler guides Plan 02-04 executor
- [02-01]: HERO_HIT emitted unconditionally after auto-attack connects; DAMAGE_TAKEN gated on finalDamage > 0 — zero-damage hits must not trigger passives
- [02-02]: abilityOrder in executeUseAbility updated to [3, 2, 0, 1] — R ultimate is highest AI priority when available
- [02-02]: shouldUseUltimate() checked before abilityPriority random gate — ensures ultimates fire at 30% independent of personality profile
- [02-03]: XP_THRESHOLDS stores cumulative XP (not delta per level) — levelUp loop uses currentXP >= THRESHOLDS[level], handles multi-level jumps from objective XP cleanly
- [02-03]: baseMaxHP/baseDamage snapshotted at Hero construction — levelUp() scales from these values to prevent exponential runaway on multiple level-ups
- [02-03]: passiveCooldownTimer added alongside XP fields — Plan 02-04 can use it immediately without a second Hero.ts edit
- [02-04]: buffOnKill/healOnKill fields reused across trigger types in applyPassiveEffect() — routing by passive.trigger means same field can mean different things per trigger category
- [02-04]: destroy() stores passiveHandlerRef (arrow wrapper) and uses it for EventBus.off — exact reference match required for Phaser EventEmitter cleanup
- [02-04]: passiveCooldown: 0 for phantom_knight is falsy — guard `passive.passiveCooldown && timer > 0` correctly skips the gate, making every hit trigger without cooldown

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4] Boss Tier 2 roaming (obstacle-aware pathfinding) is highest technical risk — NavMesh vs. waypoint graph decision needed during Phase 4 planning
- [Phase 7] Sudden Death at exact 5:00:000 boundary requires formal state transition specification — flag for plan-phase
- [General] Scene restart memory leak (tickTimer accumulation) — RESOLVED in 01-03 via MatchStateMachine.destroy() + scene.time.removeEvent()
- [02-ongoing] heroData.ts TypeScript errors on all 13 heroes (missing passive field) — RESOLVED in Plan 02-04

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 02-04-PLAN.md — passive system, 13 hero passives in heroData.ts, Hero.subscribePassive/applyPassiveEffect/showPassiveVFX/destroy lifecycle, EventBus cleanup
Resume file: None
