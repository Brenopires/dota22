# Milestones: Rift Clash

## v1.0 MVP

**Shipped:** 2026-02-23
**Phases:** 1-8 (41 plans, ~9,900 LOC TypeScript)
**Timeline:** 3 days (2026-02-21 to 2026-02-23)

**Delivered:** A complete asymmetric hero brawler with 13 heroes, 5-minute matches, boss economy, team randomization, battle modifiers, neutral camps, scoring with Sudden Death, and ranked draft play.

**Key accomplishments:**
1. EventBus + MatchStateMachine foundation enabling respawn, 5-minute timer, and clean state transitions
2. 13 heroes with ultimates, passives, XP leveling, and distinct combat roles
3. Asymmetric team generation with MMR-adaptive scaling and AI target distribution
4. Multi-phase boss AI with 3-tier kill rewards, tower destruction win condition, and revival tokens
5. 8 Battle Traits + 8 Gems with incompatibility blacklists and no exploitable combinations
6. Four neutral buff camps with 60s respawn, team buffs, and scoring integration
7. Four-source scoring system with Sudden Death at 5:00 tie or boss Tier 3 kill
8. Pick-from-3 draft UI with 25s countdown, 5-tier rank system (Bronze-Apex), flat +/-40 MMR

**Archive:** `.planning/milestones/v1.0-ROADMAP.md`, `.planning/milestones/v1.0-REQUIREMENTS.md`
