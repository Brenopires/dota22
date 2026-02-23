# 03-04 Summary: AI Target Distribution

## What was done
- Added `FOCUS_PENALTY_PER_ATTACKER = 0.2` to `constants.ts`
- Rewrote `AIController.selectTarget()` with scoring system: base score (HP ratio / distance / neutral) + focus penalty per overlap + random jitter (±0.1)
- Added `currentTarget` getter to AIController for BattleScene to read
- Updated `AIController.update()` to accept optional `targetCountMap` parameter
- Added `targetCountMap` field to BattleScene, rebuilt per AI tick from alive targets only
- Rewired BattleScene AI update loop to pass targetCountMap to each `ai.update()`

## Files modified
- `src/constants.ts` — FOCUS_PENALTY_PER_ATTACKER
- `src/ai/AIController.ts` — selectTarget scoring, currentTarget getter, update() param
- `src/scenes/BattleScene.ts` — targetCountMap field + per-tick rebuild

## Verification
- `npx tsc --noEmit` — zero errors
- Focus penalty only activates when 2+ targets exist (single target = all focus, correct)
- Dead heroes excluded from targetCountMap via `t.isAlive` check

## Commits
- `cc58fc9` feat(phase-03-04): AI target distribution with focus penalty
