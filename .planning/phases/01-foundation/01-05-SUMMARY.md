---
plan: "01-05"
phase: 01-foundation
subsystem: hud-timer-respawn-overlay
status: completed
tags: [phaser, typescript, hud, timer, respawn, overlay, ui]
started: 2026-02-23T00:17:08Z
completed: 2026-02-23T00:18:11Z

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: IBattleScene interface with matchStateMachine field
  - phase: 01-foundation plan 03
    provides: MatchStateMachine.getTimeRemaining() and getPhase(); formatTime() already added to HUD
  - phase: 01-foundation plan 04
    provides: playerRespawnEndTime field on BattleScene and IBattleScene

provides:
  - HUD.ts with complete MM:SS countdown sourced from matchStateMachine.getTimeRemaining()
  - Respawn overlay (RESPAWNING IN / N) that appears when player.isAlive === false
  - Overlay auto-destroys when player respawns (isAlive becomes true)
  - Timer circle widened to radius 32 to accommodate MM:SS text width
  - Timer color resets to white above 10 seconds (else branch added)

affects:
  - All future phases — Phase 1 HUD is now fully feature-complete for the foundation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Respawn overlay created lazily on first dead frame — avoids creating it during normal play"
    - "Container holds bg graphic + label + countdown text — single destroy() cleans all children"
    - "Math.ceil((endTime - Date.now()) / 1000) — per-frame countdown computation without a dedicated timer"

key-files:
  created: []
  modified:
    - src/ui/HUD.ts

key-decisions:
  - "Timer circle radius increased from 25 to 32 — MM:SS text (e.g. '5:00') is wider than single integer '60'"
  - "White color reset added as else branch — without it, timer stays red after counting back up (e.g. Play Again reset)"
  - "Math.floor() applied to timeRemaining before formatTime — avoids '5:00' showing '4:60' edge case at boundary"

# Metrics
duration: 1min
completed: 2026-02-23
---

# Phase 1 Plan 05: HUD Timer and Respawn Overlay Summary

**MM:SS countdown timer widened to fit text, timer color resets to white above 10s, and player respawn overlay with per-frame countdown appears on death and auto-destroys on respawn**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-23T00:17:08Z
- **Completed:** 2026-02-23T00:18:11Z
- **Tasks:** 1 (+ checkpoint:human-verify pending user approval)
- **Files modified:** 1

## Accomplishments

- Timer circle background radius widened from 25 to 32 — `'5:00'` text no longer overflows the circle
- Initial timer text changed from `'60'` to `'5:00'` — correct display on match start before first update tick
- `Math.floor()` added to `timeRemaining` before `formatTime()` call — prevents fractional seconds edge cases
- White color reset added as `else` branch in timer color logic — timer returns to white when time goes above 10s again (e.g., after Play Again)
- `respawnOverlay: Phaser.GameObjects.Container | null` and `respawnCountdownText: Phaser.GameObjects.Text | null` private fields added
- Respawn overlay created lazily on first frame the player is dead — container holds semi-transparent background, `'RESPAWNING IN'` label, and red countdown number
- Countdown text updated every frame via `Math.ceil((scene.playerRespawnEndTime - Date.now()) / 1000)`
- Overlay destroyed via `container.destroy()` when `player.isAlive` becomes true — cleans background, label, and countdown text in one call
- TypeScript compiles with zero errors

## Task Commits

1. **Task 1: Add respawn overlay and finalize HUD timer** - `162ec65` (feat)

## Files Created/Modified

- `src/ui/HUD.ts` — timer circle radius 25→32, initial text '60'→'5:00', white color reset added, `Math.floor()` on timeRemaining, respawn overlay private fields added, respawn overlay logic in `update()` (lazily created, per-frame countdown, auto-destroyed on respawn)

## Deviations from Plan

- **MM:SS timer format already complete from plan 01-03** — `formatTime()` method and `matchStateMachine.getTimeRemaining()` call were already in HUD.ts before this plan. Decision [01-03] in STATE.md documents this: "HUD updated in 01-03 (not deferred to 01-05) — removing matchTimer/matchOver from IBattleScene forced update; MM:SS format added as natural consequence." This plan completed the remaining gaps: circle sizing, initial text value, white color reset, and the respawn overlay.
- **`matchOver` → `matchStateMachine.getPhase()` already migrated** — The plan's Step 4 (replace scene.matchOver with matchStateMachine check) was already done in 01-03. No action needed.

## Artifacts Produced

- `HUD` class in `src/ui/HUD.ts` — complete Phase 1 HUD with MM:SS countdown, respawn overlay, kill feed, HP/mana bars, and match-over overlay

## Verification

- `npx tsc --noEmit` — zero errors (confirmed)
- `grep formatTime src/ui/HUD.ts` — found (line 209)
- `grep getTimeRemaining src/ui/HUD.ts` — found (line 91)
- `grep respawnOverlay src/ui/HUD.ts` — found (lines 22, 161, 163, 190, 192, 193)
- `grep playerRespawnEndTime src/ui/HUD.ts` — found (line 159)
- `grep "RESPAWNING IN" src/ui/HUD.ts` — found (line 171)
- HUD.ts line count: 260 (exceeds min_lines: 100)
- Human verification pending (checkpoint:human-verify gate)

## Self-Check: PASSED

- src/ui/HUD.ts — FOUND (260 lines)
- Commit 162ec65 (feat: add respawn overlay and finalize HUD timer) — verified
