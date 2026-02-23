---
status: testing
phase: 07-scoring-sudden-death
source: [07-01-SUMMARY.md, 07-02-SUMMARY.md, 07-03-SUMMARY.md, 07-04-SUMMARY.md]
started: 2026-02-23T16:00:00Z
updated: 2026-02-23T16:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Live scoreboard replaces kill count
expected: |
  The HUD top-center now shows a total team score (e.g., "0 - 0") instead of just kill counts. Below it, a compact breakdown line reads something like "K:0 B:0 T:0 C:0 | K:0 B:0 T:0 C:0" showing kills, boss kills, tower thresholds, and camp clears per team.
awaiting: user response

## Tests

### 1. Live scoreboard replaces kill count
expected: The HUD top-center shows total team score (e.g., "0 - 0") instead of just kill counts. Below it, a compact breakdown line shows K/B/T/C per team.
result: [pending]

### 2. Kill scoring visible in scoreboard
expected: When a hero kills an enemy hero, the team's total score increases by 1 point and the K (kills) counter in the breakdown increments.
result: [pending]

### 3. Boss kill scoring (3pt) and boss respawn
expected: Killing the boss adds 3 points to your team's total score. The B (boss) counter in the breakdown increments. After approximately 30 seconds, the boss reappears at the center with full HP.
result: [pending]

### 4. Tower damage threshold scoring (2pt) with gold visual cue
expected: When the enemy tower drops below ~50% HP, 2 points are added to your team's score. A gold accent and "[!2pt]" label appears on that tower's indicator in the HUD. The T counter in the breakdown increments. This only triggers once per tower.
result: [pending]

### 5. Boss Tier 2 rewards — damage amp and roaming
expected: On the second boss kill, the killing team receives a permanent damage buff (+25 damage). After the boss respawns, it roams around the arena (moving between different positions) instead of staying in the center. It still attacks heroes that get near it.
result: [pending]

### 6. Sudden Death on tied score at 5:00
expected: If the match reaches 5:00 with both teams having equal total scores, the screen flashes red, a persistent red border appears around the screen, "SUDDEN DEATH" text is displayed, and "NO RESPAWNS" warning appears below it. The timer stops.
result: [pending]

### 7. Sudden Death — no respawns, ELIMINATED overlay
expected: During Sudden Death, if your hero dies, you see an "ELIMINATED" overlay with "No respawns in Sudden Death" text instead of the normal respawn countdown. Your hero stays dead — no respawn timer appears.
result: [pending]

### 8. Sudden Death — team wipe ends match
expected: During Sudden Death, when all heroes on one team are dead at the same time, the match immediately ends and the results screen appears. The surviving team wins.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
