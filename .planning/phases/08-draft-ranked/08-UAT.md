---
status: complete
phase: 08-draft-ranked
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md]
started: 2026-02-23T17:00:00Z
updated: 2026-02-23T17:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Draft presents 3 hero cards
expected: When the draft scene loads, you see 3 hero cards side by side. Each card shows the hero's name, archetype, abilities (Q/W/E + R in gold). Hovering a card highlights it.
result: pass

### 2. Picking a hero starts the match as that hero
expected: Clicking one of the 3 hero cards selects it. The scene fades out and transitions to the battle. Your hero in the match is the one you picked.
result: pass

### 3. 25-second countdown with auto-pick
expected: A countdown timer (25 seconds) is visible during the draft. It counts down each second. If you don't pick before it reaches 0, the first hero card is automatically selected and the match starts.
result: pass

### 4. Trait banner visible during draft
expected: The current match's Battle Trait is displayed in the draft scene (name and description), so you know what trait is active before picking your hero.
result: pass

### 5. MMR changes by exactly +40 on win
expected: After winning a match, the results screen shows your MMR increased by exactly 40 points (e.g., 1000 -> 1040).
result: pass

### 6. Rank tier visible in menu and results
expected: Your current rank tier (one of Bronze, Silver, Gold, Platinum, Apex) is displayed in the main menu and on the results screen. A new player at 1000 MMR sees "Gold".
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
