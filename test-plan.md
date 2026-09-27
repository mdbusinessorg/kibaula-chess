# INP CHESS v2.0 — Test Plan (real Supabase, guest + account)

Server: `node node_modules/next/dist/bin/next dev -p 3000` (running). Accounts: guest mode + kibaula.test2@gmail.com / Kibaula@Test2208.

## T1 — Login page (guest + recover forms)
- /login shows "Continuar como visitante (offline)" and "Esqueceste a password" → /recuperar form renders.
- Guest mode → home loads, header shows visitante profile, no redirect to /login. Bottom nav: Início/Jogar/Treinar/Puzzles/Perfil + "Mais" opens Academy/Ranking/Torneios/Análise/Batalha/Temporadas/Comunidade/Honor Board/Insights/Admin.

## T2 — Bot game full loop (guest)
- /jogar → Bot tab: 8 named bots 500–3000. Start vs weakest. Legal-move dots; coach bubble after human move; king red glow when in check (aim Qh5+/Bc4 vs weak bot); promotion bottom-sheet if reachable, else verify sheet code path via forced line; finish via checkmate or resign-free end; XP awarded.
- Adversarial: click an ILLEGAL square — no move; click piece → dots only on legal targets.

## T3 — Puzzles (guest)
- /puzzles → pick Mate em 1 → solve correct move on board → auto reply / solved state, streak counter increments, puzzle rating shown. Wrong move → failed/shake, retry.

## T4 — Academy lesson with exercise (guest)
- /academy → 8 courses → open one → module/lesson with exercise board → solve → "Concluir lição" gives XP toast; lesson marked done.

## T5 — /treinar, /analise, /perfil (guest)
- /treinar hub tiles + continue card; /analise lists games (guest: likely empty state, no crash); /perfil shows nível/XP/streak/4 ratings/conquistas/histórico.

## T6 — Offline indicator
- SyncBadge top: verify it shows. Simulate offline via CDP (`Network.emulateNetworkConditions` offline) → "📡 Modo offline"; restore → "⟳/✓ Sincronizado".

## T7 — Account login (test2)
- Sign out / clear guest → login kibaula.test2@gmail.com → home with real profile; spot-check /admin as admin account if quick (skip if not admin-gated).

## T8 — Sweep remaining routes + console
- /ranking /torneios /batalha /temporadas /comunidade /honor-board /insights /admin render; console clean throughout.
