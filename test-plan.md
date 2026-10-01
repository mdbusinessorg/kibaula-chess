# INP CHESS v2.1 — Test Plan (static out/ on :3000)

Serving `out/` via `node serve-out.js` → http://localhost:3000 (service worker + prod build). Accounts: guest + kibaula.test2@gmail.com / matiasdomingos158@gmail.com.

## T1 — Theme + /definicoes
- New bordeaux/dourado look: legible on home, /jogar, /puzzles, /academy, /perfil (key screenshots).
- /definicoes in Mais menu: toggle Som off → play a move → no audio errors; toggle Animações; board theme picker INP/Madeira/Noite visibly changes board in /jogar AND /puzzles. Restore defaults at end.

## T2 — Fluxo F resume
- Bot game, 2-3 moves → navigate away → /jogar shows "Partida em curso · Continuar ▶" (bot name + move count); home shows "Continuar partida"; Continuar → same FEN/position; Desistir → card + home card gone (save cleared).

## T3 — Local mode
- Local tile → alternate moves both sides on one board; captured glyphs under Pretas/Brancas cards; NO coach bubble.

## T4 — Navigable move list
- Click a past move → board shows that position ("A rever o lance N"); ⏮◀▶⏭ step; touch board → back to live; subsequent move works.

## T5 — Undo + Desistir (bot)
- ↩ Refazer undoes player+bot moves (log shrinks by 2); 🏳 Desistir → "desistência" status, game over, save cleared.

## T6 — PromotionSheet (deterministic via Local)
- Local game: clear a-file/h-file for both sides, march a pawn to last rank → bottom-sheet opens → pick piece → promoted piece on board.

## T7 — Regression: last round's 3 bug fixes (commit 0ff52a6)
- Academy "Exercício: coroação" a7→a8 now solves (was unsolvable).
- /batalha: change ONE select only → comparison renders.
- Guest /perfil: Lições ≥1 and XP>0 after a lesson.

## T8 — Quick regression + console
- Bot game coach bubble works; puzzles solve; academy XP; análise; ranking; console clean.
