# PLAN — Endgame Overlay (Win/Lose + Revanche/Sair)

## Role
**Frontend/Game UX Engineer (client-focused).** Owns match-end presentation and player actions; aligns with existing server rematch/disconnect messages.

## Goal
When a match reaches the final state, show a clear **overlay** on top of the game area with **“Você venceu” / “Você perdeu”** (player perspective) and buttons for **Revanche** and **Sair**. Preserve correct behavior for rematch negotiation and spectator handling.

## Scope
- Primary: `client/src/components/GameScreen.tsx`, `client/src/App.tsx` (only if wiring/props needed)
- Styling: `client/src/index.css` and/or component classes (coordinate with neon theme if present; keep readable)
- Reference: `client/src/hooks/useGameSocket.ts`, `shared/src/types.ts` (`MATCH_FINISHED`, `REMATCH_*`, `GAME_STATE.status/winner`)
- Out of scope: server rule changes, protocol changes, physics

## Current Behavior (reference)
- `GameScreen` renders a finished-state **inline section** below the canvas when `gameState.status === "FINISHED"` and role is not spectator, with rematch/leave controls and status text “Vitória/Derrota”.
- `statusText()` already computes win/lose for players.

## Requirements
1. **Overlay**: for `FINISHED` matches, display a modal/overlay layer **above the canvas/game board area** (not just below content), with focusable controls and backdrop that doesn’t break layout.
2. **Player messaging**: show prominent **“Você venceu”** when `gameState.winner === role`, else **“Você perdeu”** for player roles. Keep score/context visible if helpful.
3. **Buttons**: include **Revanche** (request rematch / accept flow as applicable) and **Sair**. Map to existing handlers: `onRematch`, `onRespondRematch`, `onLeave`. Respect current states: awaiting opponent, accept/decline prompts, declined—ensure UX remains coherent (may consolidate into overlay states).
4. **Spectators**: do not show “Você venceu/perdeu”; show a neutral finished overlay/message if desired, or keep spectator-appropriate behavior—must not mislabel spectators as winners/losers.
5. **Disconnect precedence**: if `opponentDisconnected` is set, existing disconnect UX must remain understandable (overlay or dedicated state) without conflicting with finished overlay.
6. **Accessibility**: overlay traps/manages focus reasonably (at minimum `aria-*`, focus on primary action when opened), buttons keyboard-operable, contrast sufficient.

## Implementation Steps
1. Restructure `GameScreen` layout so the canvas container can host an absolutely positioned overlay.
2. Implement overlay component/section for finished state with win/lose copy and action buttons reflecting rematch negotiation states.
3. Handle edge cases: `gameState` null guards, role transitions, declined rematch + leave path.
4. Style overlay to match project direction (neon/sharp if Task 1 lands; otherwise clean/high-contrast).
5. Manual QA: win, lose, rematch requested/accepted/declined, disconnect during/after flow, spectator.

## Acceptance Criteria
- Finished matches show an overlay over the game area with correct win/lose text for each player and working **Revanche**/**Sair** actions.
- No regression in rematch negotiation, leave, or disconnect flows.
- `pnpm --filter @arena/client typecheck`/build passes.

## Risks / Notes
- Coordinate copy with existing PT-BR strings (“Pedir revanche”, “Sair”); keep consistent.
- If UI redesign (Task 1) runs in parallel, agree on shared class names/tokens to avoid merge pain.

## Implementation summary (completed)
- `GameScreen.tsx`: canvas wrapped in `relative` container; finished/disconnect states rendered as absolute dialog overlays above the game area.
- Player overlay: **Você venceu/Você perdeu** (local perspective), final score, **Revanche**/**Sair** mapped to `onRematch`/`onRespondRematch`/`onLeave`, rematch negotiation states preserved.
- Disconnect overlay takes precedence for players/spectator handling remains appropriate; spectators see neutral finished overlay.
- Focus moves to primary action; keyboard/focus ring and `aria-live` status messaging added.
- No server/shared protocol changes.
