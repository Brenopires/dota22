---
status: complete
phase: 06-neutral-camps
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md]
started: 2026-02-23T14:20:00Z
updated: 2026-02-23T14:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Camp Visibility
expected: Four camp mobs visible at N/S/E/W positions with colored circles (red D, grey S, cyan H, purple C) and glow rings
result: pass

### 2. Camp Aggro and Combat
expected: Walk your hero near a camp mob (~150px). The mob moves toward you and attacks, dealing damage. You can auto-attack and use abilities on it; floating damage numbers appear in the camp's color.
result: pass

### 3. Camp Leash and Heal
expected: Pull a camp mob away from its spawn point. Once far enough (~200px from home), it breaks off, walks back to its spawn, and fully heals to max HP.
result: pass

### 4. Kill Camp and Receive Buff
expected: Kill a camp mob. A kill feed notification appears (e.g., "TEAM A → DAMAGE CAMP"). Your entire team receives a buff matching the camp type (damage = +15 flat damage, shield = 200 HP shield, haste = +25% speed, cooldown = -20% CDR).
result: pass

### 5. HUD Buff Icon Display
expected: After receiving a camp buff, a colored pill-shaped icon appears above the stat panel: red "DMG", grey "SHD", cyan "HST", or purple "CDR" with a countdown showing remaining seconds (e.g., "DMG 28s").
result: pass

### 6. Buff Effect and Expiry
expected: The haste buff makes your hero move noticeably faster for 30 seconds. The CDR buff makes ability cooldowns tick down faster. After 30 seconds the buff icon countdown reaches 0 and the icon disappears from the HUD.
result: pass

### 7. Camp Respawn
expected: After clearing a camp, the position is empty for ~60 seconds. Then the camp mob fades back in at its original position with full HP, ready to be fought again.
result: pass

### 8. Match Restart Cleanup
expected: After a match ends, click "Play Again." All 4 camps spawn fresh at their positions — no ghost mobs, no missing camps, no leftover respawn timers from the previous match.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
