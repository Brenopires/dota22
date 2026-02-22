# External Integrations

**Analysis Date:** 2026-02-22

## APIs & External Services

None. This is a fully self-contained browser game with no external API calls, no network requests, and no third-party services.

## Data Storage

**Browser LocalStorage:**
- Key: `dota22_player_data`
- Client: Native `localStorage` API (no ORM or library)
- Implementation: `src/utils/StorageManager.ts`
- Schema: `PlayerData` interface defined in `src/types.ts`
- Stores: MMR, wins, losses, draws, games played, last 20 match results
- Error handling: silent try/catch (storage failures are ignored)

**Databases:**
- None (no server-side database)

**File Storage:**
- No external file storage
- All game assets (textures, sprites) are procedurally generated at runtime via `src/systems/TextureGenerator.ts` using Phaser's `Graphics` API — no image files loaded from disk

**Caching:**
- No service workers or cache APIs used

## Authentication & Identity

**Auth Provider:** None
- No user accounts, login, or authentication
- Player identity is local-only, stored in browser `localStorage`

## Monitoring & Observability

**Error Tracking:** None

**Analytics:** None

**Logs:**
- No structured logging
- No external log services
- Silent error swallowing in `src/utils/StorageManager.ts` (try/catch with no log)

## CI/CD & Deployment

**Hosting:** Not configured (no deployment config files detected)
- Build output (`dist/`) is suitable for any static host (Netlify, Vercel, GitHub Pages, etc.)
- `vite.config.ts` sets `base: './'` enabling relative-path static deployment

**CI Pipeline:** None (no `.github/`, no CI config files)

## Environment Configuration

**Required env vars:** None
- No `.env` files present
- No `import.meta.env` usage detected in source
- No runtime configuration beyond TypeScript compile-time constants in `src/constants.ts`

**Secrets location:** N/A — no secrets required

## Webhooks & Callbacks

**Incoming:** None

**Outgoing:** None

## Summary

This project has zero external integrations. All game state is ephemeral (in-memory during a session) or persisted locally via `localStorage`. There is no backend, no network layer, and no dependency on any external service. The only "integration" is the browser's own `localStorage` API used by `src/utils/StorageManager.ts`.

---

*Integration audit: 2026-02-22*
