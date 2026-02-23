# 03-03 Summary: MMR-Adaptive AI Profiles

## What was done
- Added `MMRTier` interface and `MMR_TIERS` constant (6 tiers: Bronze→Master) to `AIPersonality.ts`
- Added `AIPersonality.applyMMRModifiers()` static method — scales aggressiveness and retreatThreshold by player MMR tier
- Updated `AIController` constructor to accept optional `profileOverride` parameter
- Updated `BattleScene` AI setup loop to apply MMR modifiers to enemy-team AI only (friendly AI stays baseline)

## Files modified
- `src/ai/AIPersonality.ts` — MMRTier interface, MMR_TIERS, applyMMRModifiers()
- `src/ai/AIController.ts` — constructor profileOverride param
- `src/scenes/BattleScene.ts` — enemy-only MMR profile wiring

## Verification
- `npx tsc --noEmit` — zero errors
- MMR_TIERS has 6 entries matching RANK_THRESHOLDS values
- applyMMRModifiers only applied to `hero.team !== this.player.team`

## Commits
- `336a83b` feat(phase-03-03): MMR-adaptive AI difficulty profiles
