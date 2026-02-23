# 03-05 Summary: Team Composition Banner + MATCH_COMPOSITION_SET Event

## What was done
- Added `MATCH_COMPOSITION_SET` event to EventBus Events object
- Added `showCompositionBanner()` private method to BattleScene — displays "X vs Y" centered on screen, depth 300, ScrollFactor 0
- Banner auto-dismisses after 3 seconds with 600ms fade tween
- Emits `MATCH_COMPOSITION_SET` event with `{ teamSizeA, teamSizeB, scalingMultiplier }` at end of `create()`

## Files modified
- `src/systems/EventBus.ts` — MATCH_COMPOSITION_SET event
- `src/scenes/BattleScene.ts` — showCompositionBanner(), emit call

## Verification
- `npx tsc --noEmit` — zero errors
- Banner definition and call both present in BattleScene
- Event defined in EventBus and emitted in BattleScene

## Commits
- `e0a9c2b` feat(phase-03-05): team composition banner and MATCH_COMPOSITION_SET event
