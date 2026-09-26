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
