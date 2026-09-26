# Kibaúla Chess — Test Plan (fallback mode, no Supabase)

App: Next.js 16 dev server at http://localhost:3000 (already running, `node node_modules/next/dist/bin/next dev -p 3000`). All tests via browser UI with recording.

## T1 — Landing page
- Open `/`. Assert: hero "Kibaúla Chess" visible; heading "8 ÁREAS. UMA COMUNIDADE."; exactly 8 course cards in grid; footer text contains "Projeto conceptual" and "não é uma aplicação oficial do INP".
- Hover one card: stats row appears ("0 jogadores · 0 partidas", "Rating médio: —", "#N no Ranking Kibaúla").

## T2 — Onboarding
- Open `/onboarding`. Assert: course selector/cards show 8 INP courses with icon + abbreviation; form fields (nome, username, email, curso) present.
- Fill form and submit. Assert: fails visibly with clear error — UI shows error message (API returns 503 "Base de dados não configurada (Supabase)."), no crash.

## T3 — Ranking
- Open `/ranking`. Assert: course filter present; sections "Jogadores", "Ranking dos Cursos" (with 8 courses listed at 0), "Ranking por Turma" (empty) render without errors.
- Click a course filter. Assert: page updates, still no errors.

## T4 — Batalha
- Open `/batalha`. Assert: two course selects with "VS"; both panels show bars at 0.
- Set both selects to the same course. Assert: comparison disappears, message "Escolhe dois cursos diferentes." shows.

## T5 — Static-ish pages
- `/temporadas`: renders, empty state, no error.
- `/torneios`: renders, empty state.
- `/academy`: 5 categories listed.
- `/honor-board`: renders, empty state.
- `/insights`: counters at 0.
- `/comunidade`: 8 courses listed.

## T6 — Admin
- Open `/admin`. Assert: forms present. Trigger one action (e.g. submit season/form). Assert: error shown "Supabase não configurado" or similar; page does not crash.

## T7 — 404
- `/perfil/qualquer` → proper 404 page.

## T8 — Console errors
- Throughout navigation, check browser console: no red errors (hydration/500s).
