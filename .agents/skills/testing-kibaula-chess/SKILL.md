---
name: testing-kibaula-chess
description: How to set up and test the Kibaúla Chess app (Next.js + Supabase) on this Windows box — broken npm shims, test account creation, two-player live-game testing
---

# Testing Kibaúla Chess

## Running the app
- Do NOT use `npm run dev` / `npx` — the npm/npx shims are broken in MSYS bash (`npm: No such file or directory` even though `npm -v` prints a version). Run:
  `cd /c/Users/Administrator/repos/kibaula-chess && node node_modules/next/dist/bin/next dev -p 3000`
- Node lives at `/c/hostedtoolcache/node/20.19.0/x64/`.
- `.env.local` in the repo root holds real Supabase creds. Without them the app runs in fallback mode (static catalog, 503 on writes). With them, auth + realtime live games work.

## Test accounts
- Admin: `matiasdomingos158@gmail.com` / `Kibaula@Admin2208` (INP-verified).
- To create extra users (e.g. a second player for online matches), the browser signup requires email confirmation unless the project disables it. Reliable path: Supabase Admin REST API directly with fetch — plain `createClient` crashes under Node 20 (`realtime-js` needs native WebSocket / Node 22). Working pattern:

```sh
node -e "
const fs=require('fs');
const env=fs.readFileSync('.env.local','utf8');
const url=env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key=env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
fetch(url+'/auth/v1/admin/users',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({email:'X@gmail.com',password:'PASS',email_confirm:true,user_metadata:{full_name:'N',username:'u'}})}).then(r=>r.json()).then(console.log);
"
```
- New users must complete onboarding (pick a course) before they can play; the course grid is very long — scroll far down to find "Concluir registo".

## Two-player live-game testing
- Player A: /jogar → Online → "Convidar amigo" → copy `/jogar?m=<id>` link.
- Player B: open the link in an incognito window (Ctrl+Shift+N); unauthenticated users redirect to /login and LOSE the `?m=` param — after login, paste the link again.
- New users land on /onboarding first.
- Use Alt+Tab to flip between the two windows; realtime moves sync via Supabase subscriptions.
- Board coordinates: at the default 1024x768 scaled screenshot the board is ~270–565px; rank 1 is the bottom row (~y500-560), not the pawn row (~y455-500). Clicking y≈505 selects rank-1 pieces, not pawns — pawns are at ~y455.

## Known quirks
- react-chessboard move dots render as radial-gradient `backgroundImage` on square divs with `data-square` attributes — verifiable via `document.querySelector('[data-square="e4"]').style.backgroundImage` if pixel confirmation is ambiguous.
- The "Desafios abertos" lobby may contain stale seeded challenges — "Adversário aleatório" will join one if present.

## v2.0 (INP CHESS rebrand) specifics
- Guest mode: /login → "Continuar como visitante (offline)" creates `inpchess:guest` in localStorage (`visitante_XXXXX`). AuthGate lets guests everywhere; header shows "Entrar" instead of "Sair".
- SyncBadge top-center: `📡 Modo offline` / `⟳ Sincronizando…` / `✓ Sincronizado`. To toggle without real network loss, run in the page console: `Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}); window.dispatchEvent(new Event('offline'))` (and `true`+`online` to restore) — the badge reacts to the events.
- PuzzleBoard and academy ExerciseBoard are DRAG-ONLY (`onPieceDrop`, no click-to-move). In bot games (`/jogar`) click-to-move also works. Use `zoom` first to get exact square centers — puzzle boards are smaller (~34px/sq) than the bot board (~37px/sq); grabbing near a square edge picks the wrong piece.
- Puzzle/exercise solutions are UCI strings; promotion moves have a 5th char (`a7a8q`). PuzzleBoard auto-appends `want[4]`; ExerciseBoard now has an equivalent promo fallback (fixed in v2.1 — "Exercício: coroação" is solvable again).
- `/batalha` selects were fixed in v2.1 (`selA`/`selB` resolve `''`→courses[0]/[1]): the default comparison renders immediately and a single-select change updates it.
- Guest lesson XP fixed in v2.1: `complete()` now does `g.xp += lesson.xp` and /perfil renders guest lessons + xp.
- Bot promotion bottom-sheet (PromotionSheet) only opens inside `/jogar` bot/live/local games when a pawn reaches the last rank. Deterministic path via LOCAL mode (you control both sides): 1.a4 h5 2.a5 h4 3.a6 h3 4.axb7 hxg2 5.bxa8 → sheet opens; pick ♕/♖/♗/♘ (under-promotion works, SAN shows e.g. `bxa8=N`). Verified in v2.1.

## v2.1 specifics
- Static export: app builds to `out/` (`node node_modules/next/dist/bin/next build`). Serve it with the repo-local `serve-out.js` (`node serve-out.js`, port 3000) — a tiny static server with index.html + `.html` fallbacks; watch for EISDIR on directory paths without index.html (patched in v2.1 test round).
- Preferences live in localStorage `inpchess:prefs` `{sound, animations, board:'inp'|'madeira'|'noite'}`; /definicoes toggles write it and `usePrefs()` + `boardOpts(p)` feed react-chessboard (incl. `showAnimations`) in both /jogar and /puzzles.
- In-progress game saves to `inpchess:game` (FEN only, `src/lib/saved-game.ts`). /jogar shows "Partida em curso · Continuar ▶/✕", home shows "Continuar partida"; 🏳 Desistir clears it. Wart: resume restores the position but the move log restarts at 1 and earlier moves are unreviewable.
- BotGame move list is navigable: click a move → board previews that ply ("A rever o lance N"), ⏮◀▶⏭ steppers; click the board to return to live. ↩ Refazer undoes TWO plies (you+bot); stale coach bubble can linger after undo.
- Board coordinates at 1024×768 with any theme: files a–h ≈ x286,323,360,397,434,471,508,545; ranks 8→1 ≈ y183,221,258,294,330,366,402,438 (rank-1 back rank ≈y438, pawn row ≈y402).
