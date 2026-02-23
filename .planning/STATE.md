# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Asymmetric chaos that feels like a skill test — being thrown into a 1v3 as the solo player at high MMR and winning through outplay, not handicaps.
**Current focus:** Phase 5 — Battle Traits & Gems

## Current Position

Phase: 5 of 8 (Battle Traits & Gems) — IN PROGRESS
Plan: 4 of 5 — complete
Status: Plan 05-04 complete — Trait and gem indicators added to HUD
Last activity: 2026-02-23 — Completed 05-04 (HUD trait & gem indicators)

Progress: [██████████████████] 77%

## Performance Metrics

**Velocity:**
- Total plans completed: 24
- Average duration: 2 min
- Total execution time: 53 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5/5 | 12 min | 2 min |
| 02-hero-identity | 6/6 | 13 min | 2 min |
| 03-asymmetric-teams | 5/5 | 5 min | 1 min |
| 04-boss-towers | 5/6 | 16 min | 3 min |
| 05-battle-traits | 4/5 | 7 min | 2 min |

**Recent Trend:**
- Last 5 plans: 2 min, 2 min, 2 min, 3 min, 2 min
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
- [02-05]: HUD XP bar polls player.level/currentXP each frame — no EventBus subscription needed, consistent with HP/mana polling pattern, no cleanup risk
- [02-05]: AbilityBar gold color driven by ability.isUltimate flag (not slot index 3) — future-proof if slot order changes
- [02-05]: Panel background expanded from 62px to 78px height — 16px added for XP bar row, keeps bottom-left layout compact
- [02-05]: R slot uses rGap=16 extra spacing beyond Q/W/E standard gap=8 — visual separation communicates ultimate distinction without a separate panel
- [02-06]: Phase 2 verified complete via tsc + grep artifact checks — all 5 success criteria confirmed without live-play regression since each prior plan was individually verified at commit time
- [02-06]: Checkpoint pre-approved by user directing "complete the project" — no blocking issues found during Task 1 validation
- [03-01]: MatchResult.teamSizeA/teamSizeB made optional — prevents BattleScene compile error; Plan 03-02 will populate them in endMatch()
- [03-01]: TeamSizes interface exported from TeamManager (not types.ts) — co-located with getRandomTeamSizes() producer function
- [03-01]: Backward-compat teamSize = Math.max(sizeA, sizeB) in MatchOrchestrator return — BattleScene reads until 03-02 migration
- [03-02]: Armor excluded from TeamBalancer scaling — avoids compounding with level-up armor gains; only maxHP and damage scale
- [03-02]: statsOverride replaces heroDataMap lookup entirely (not merges) — applyToStats() returns complete HeroStats copy; no merge needed
- [03-02]: TEAM_BALANCE.MMR_SCALE_REDUCTION=0.7 caps raw bonus so high-MMR players face fairer odds; 3v1 at MMR 2000 → no handicap
- [03-02]: matchConfig field type changed to explicit MatchConfig import — removes ReturnType<typeof MatchOrchestrator.generateMatch> indirection
- [03-03]: MMR_TIERS has 6 tiers matching RANK_THRESHOLDS MMR breakpoints — consistency between AI difficulty and rank display
- [03-03]: applyMMRModifiers only applied to enemy team AI — friendly AI stays baseline to avoid confusing ally behavior at high MMR
- [03-04]: FOCUS_PENALTY_PER_ATTACKER = 0.2 provides soft spreading — 3rd AI targeting same enemy gets +0.4 score penalty
- [03-04]: targetCountMap rebuilt per AI tick from alive targets only — dead heroes excluded via t.isAlive check
- [03-04]: selectTarget uses jitter ±0.1 to prevent synchronized lock-step across all AIs on same tick
- [03-05]: showCompositionBanner uses cameras.main.width/height (not GAME_WIDTH constants) — screen-space coordinates for ScrollFactor 0 overlay
- [04-01]: die() duplicates idempotent guard + physics disable instead of calling super.die() — avoids HERO_KILLED emission that triggers hero scoring/respawn/XP
- [04-01]: DYING threshold checked before ENRAGED in checkPhaseTransition() — handles massive damage that skips ENRAGED
- [04-01]: scalePower() heals only HP delta (newMaxHP - oldMaxHP) — prevents boss from full-healing each minute
- [04-01]: getArmor() returns BOSS_BASE_ARMOR + minutesElapsed — armor grows linearly each minute for increasing difficulty
- [04-02]: die() duplicates idempotent guard + physics disable instead of calling super.die() — same pattern as BossEntity to avoid HERO_KILLED emission
- [04-02]: getArmor() returns flat 10 — higher than heroes but no scaling (towers are static structures)
- [04-02]: Health bar passes mana ratio 0 — towers have no mana system
- [04-02]: Attack VFX line drawn in world-space (not container child) — endpoints span tower-to-target positions
- [04-03]: BossEntity.attackTimer changed from private to public — BossAISystem needs direct access to check and reset
- [04-03]: BossAISystem is standalone (not AIController subclass) — boss has no abilities/mana/hero target selection
- [04-03]: getNonHeroTargets() returns boss (always) + enemy tower (team-filtered) — canonical API for CombatSystem boss/tower targeting
- [04-03]: Buffs not applied to boss/tower from projectile or area effect hits — buff system is hero-only
- [04-04]: Revival token check placed BEFORE kill counting in onHeroKilled — hero never 'died' from game perspective, no kill counted, no respawn scheduled
- [04-04]: towerVictoryTeam overrides normal win-by-kills/alive logic in endMatch() — tower destruction is absolute win condition
- [04-04]: MatchStateMachine.onKill uses else-if for team scoring — prevents Team.NEUTRAL entities from affecting score
- [04-04]: entityType guard added to BattleScene.onHeroKilled as safety filter for non-hero entities
- [04-05]: BossPhase import removed from HUD.ts — boss.phase flows through as any from BossEntity, no direct type reference needed
- [04-05]: Tower indicator positions at GAME_WIDTH/2 +/- 100 flanking kill score text at center
- [05-01]: No CDR gems — cooldown reduction interacts multiplicatively with cooldown-related passives
- [05-01]: traitId and gemAssignments as required MatchConfig fields — compiler guides Plan 05-02 to add trait/gem selection
- [05-01]: Incompatibility blacklists on vampiric_pact (bd_passive), executioner (ld_passive), spell_burn (fw_passive, vs_passive)
- [05-02]: TraitSystem only instantiated for mechanic/rule_change traits with event hooks — stat-only traits handled via applyStatMods
- [05-02]: HP floor Math.max(100, ...) in applyStatMods prevents glass_cannon exploit on low-HP heroes
- [05-02]: handleOnDamageTaken uses payload.victim (not payload.entity) matching DAMAGE_TAKEN event shape from Hero.takeDamage()
- [05-02]: Reflect damage only targets heroes (not bosses/towers) to prevent infinite damage loops
- [05-02]: sudden_valor tracks elapsed minutes via 300 - timeRemaining for first-kill-per-minute rule
- [05-04]: Trait indicator at y=68-84 between kill score and boss health bar -- minor visual overlap with boss name text acceptable since boss health bar is conditional
- [05-04]: Panel background expanded from 78px to 90px to fit gem indicator line at GAME_HEIGHT-25

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4] Boss Tier 2 roaming (obstacle-aware pathfinding) is highest technical risk — NavMesh vs. waypoint graph decision needed during Phase 4 planning
- [Phase 7] Sudden Death at exact 5:00:000 boundary requires formal state transition specification — flag for plan-phase
- [General] Scene restart memory leak (tickTimer accumulation) — RESOLVED in 01-03 via MatchStateMachine.destroy() + scene.time.removeEvent()
- [02-ongoing] heroData.ts TypeScript errors on all 13 heroes (missing passive field) — RESOLVED in Plan 02-04

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 05-04-PLAN.md (HUD trait & gem indicators)
Resume file: None
