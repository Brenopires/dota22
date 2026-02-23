---
phase: 04-boss-towers
plan: 04
subsystem: gameplay
tags: [boss-rewards, revival-token, tower-destruction, win-condition, event-bus, phaser]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "BaseEntity class, EventBus singleton, MatchStateMachine, respawn system"
  - phase: 04-boss-towers
    provides: "BossEntity with BOSS_KILLED event, TowerEntity with TOWER_DESTROYED event and disable(), XPSystem.awardObjectiveXP"
provides:
  - "Boss kill rewards: team-wide +20 damage buff for 60s, single-use revival token, 100 XP to killer, 15s enemy tower disable"
  - "Revival token system: prevents next death on killing team, hero revives at 30% HP, checked BEFORE kill counting"
  - "Tower destruction win condition: immediate match end via MatchStateMachine.endByTowerDestruction()"
  - "MatchStateMachine entityType filter: only hero kills count for score"
affects: [04-05, 04-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Revival token checked BEFORE kill counting in onHeroKilled to prevent double-alive bug"
    - "Tower destruction victory overrides normal win-by-kills/alive logic via towerVictoryTeam field"
    - "entityType guard on onHeroKilled and MatchStateMachine.onKill as belt-and-suspenders safety"
    - "Boss kill banner uses screen-space overlay with team-colored border and buff info text"

key-files:
  created: []
  modified:
    - "src/scenes/BattleScene.ts"
    - "src/systems/MatchStateMachine.ts"

key-decisions:
  - "Revival token check placed BEFORE kill counting -- hero never 'died' from game perspective, no kill counted, no respawn scheduled"
  - "towerVictoryTeam field overrides normal win logic in endMatch() -- tower destruction is absolute win condition"
  - "MatchStateMachine.onKill uses else-if for team scoring -- prevents Team.NEUTRAL entities from affecting score"
  - "entityType guard added to BattleScene.onHeroKilled as safety filter for non-hero entities"

patterns-established:
  - "Boss reward distribution pattern: find killer by killerId -> resolve team -> distribute rewards to all allies"
  - "Revival token pattern: single-use team-scoped token, consumed on first death, restores hero inline before any death processing"
  - "Tower destruction win path: TOWER_DESTROYED event -> BattleScene.onTowerDestroyed -> set towerVictoryTeam -> MatchStateMachine.endByTowerDestruction -> transition(ENDED) -> endMatch() reads override"

# Metrics
duration: 5min
completed: 2026-02-23
---

# Phase 4 Plan 4: Boss Kill Rewards & Tower Destruction Win Condition Summary

**Boss kill grants team-wide damage buff + single-use revival token + XP + tower disable; tower destruction immediately ends match via MatchStateMachine with victory override in endMatch()**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-23T05:29:36Z
- **Completed:** 2026-02-23T05:34:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Boss kill rewards fully wired: +20 damage buff for 60s to all alive allies, revival token (single-use), 100 XP to killer, 15s enemy tower disable, kill feed entry, and "BOSS SLAIN!" banner
- Revival token prevents next death on the killing team -- hero revives at 30% HP with VFX feedback, checked BEFORE kill counting to prevent the double-alive bug
- Tower destruction immediately ends the match via endByTowerDestruction(), with towerVictoryTeam overriding normal win logic
- MatchStateMachine.onKill filtered by entityType to only count hero kills for score

## Task Commits

Each task was committed atomically:

1. **Task 1: Add boss kill rewards and revival token to BattleScene** - `92551bb` (feat)
2. **Task 2: Add tower destruction win condition and entity-type scoring** - `d40bca4` (feat)

## Files Created/Modified
- `src/scenes/BattleScene.ts` - onBossKilled (rewards), onTowerDestroyed (win condition), revival token in onHeroKilled, showBossKillBanner, towerVictoryTeam override in endMatch, cleanup in shutdown
- `src/systems/MatchStateMachine.ts` - endByTowerDestruction method, entityType filter on onKill, else-if for neutral team safety

## Decisions Made
- Revival token check placed BEFORE kill counting in onHeroKilled -- if the hero is revived, they never died from the game's perspective (no kill counted, no respawn scheduled)
- towerVictoryTeam field set by onTowerDestroyed and checked in endMatch() as first condition -- tower destruction is an absolute win condition that overrides normal win-by-kills/alive
- MatchStateMachine.onKill uses `else if (victim.team === Team.B)` instead of bare `else` -- prevents Team.NEUTRAL entities from inadvertently affecting team scores
- entityType guard (`if (victim.entityType !== 'hero') return;`) added at top of BattleScene.onHeroKilled as safety check

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Boss kill rewards fully operational: team buff, revival token, XP, tower disable
- Tower destruction win condition triggers immediate match end
- MatchStateMachine correctly filters scoring for hero-only kills
- Ready for 04-05 (HUD updates for boss/tower status) and 04-06 (phase verification)

## Self-Check: PASSED

- [x] src/scenes/BattleScene.ts exists
- [x] src/systems/MatchStateMachine.ts exists
- [x] 04-04-SUMMARY.md exists
- [x] Commit 92551bb found
- [x] Commit d40bca4 found

---
*Phase: 04-boss-towers*
*Completed: 2026-02-23*
