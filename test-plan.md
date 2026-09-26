# Kibaúla Chess — Test Plan (real Supabase, auth + live chess)

Server: `node node_modules/next/dist/bin/next dev -p 3000` (running, .env.local loaded).
Admin creds: matiasdomingos158@gmail.com / Kibaula@Admin2208.

## T1 — Auth gate
- Fresh browser → any page redirects to /login. Login with admin creds → lands on platform (onboarding if no course assigned).

## T2 — Home (chess.com style)
- Avatar+username, rating row (Blitz/Rápida/Bullet/Geral), green "Play!" button, "Play Computer", mini-boards of previous games, course cards with hover stats (regression from PR #2).

## T3 — /jogar Bot game
- New Game screen: Online/Bot selector; Bot → rating slider 500–3000 + color; "Iniciar partida" opens board.
- Click a piece → legal-move dots; captures show red ring; click-to-move works; drag works; move list with times; no console errors (sounds).
- Try to force a quick mate or resignation path; game ends correctly.

## T4 — Online match
- "Convidar amigo" → creates waiting match, shows copyable /jogar?m=<id> link.
- Open link in second profile/incognito, sign up second test account, join → live board both sides, cards with clocks, ½ Empate / Desistir / Mais buttons.
- Play 2-3 moves alternating sides (two windows) — verify realtime sync.
- "Adversário aleatório": joins open challenge or creates waiting.

## T5 — Ranking
- Podium top-3 with circles.

## T6 — Bottom nav
- Bar (Início/Jogar/Academy/Ranking/Perfil/Mais) on all pages except /login.

## T7 — Regressions
- No console/hydration errors anywhere.
