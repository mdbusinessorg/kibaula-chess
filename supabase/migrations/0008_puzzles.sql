-- INP CHESS — seed do banco de puzzles (gerado de src/lib/puzzles.ts)

insert into puzzles (slug, title, fen, solution_uci, theme, rating) values
  ('m1-scholars', 'Mate do Pastor', 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4', '{f3f7}', 'mate1', 600),
  ('m1-backrank', 'Corredor mortal', '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', '{a1a8}', 'mate1', 500),
  ('m1-corner', 'Rei encurralado', 'k7/8/K7/8/8/8/8/7R w - - 0 1', '{h1h8}', 'mate1', 550),
  ('m1-queen', 'Dama decisiva', '6k1/8/7K/8/8/8/6Q1/8 w - - 0 1', '{g2g7}', 'mate1', 500),
  ('m1-rook', 'Última linha', '7k/8/6K1/8/8/8/8/4R3 w - - 0 1', '{e1e8}', 'mate1', 500),
  ('m1-net', 'Rede de mate', 'r1bqk1nr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', '{h5f7}', 'mate1', 600),
  ('m1-queen-net', 'Dama no canto', 'k7/8/1K6/8/8/8/Q7/8 w - - 0 1', '{a2g8}', 'mate1', 700),
  ('m1-kr', 'Rei e torre', '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', '{a1a8}', 'mate1', 500),
  ('m2-lift', 'Elevador de torres', '5rk1/pp3ppp/8/3R4/8/8/PPP2PPP/3Q2K1 w - - 0 1', '{d5d8,f8d8,d1d8}', 'mate2', 1100),
  ('m2-queen-net', 'Teia da dama', 'k7/8/K7/8/8/8/1Q6/8 w - - 0 1', '{b2g7,a8b8,g7b7}', 'mate2', 1000),
  ('m3-deflect', 'Sacrifício de desvio', '5rk1/ppp2ppp/8/8/8/5Q2/PPP2PPP/4R1K1 w - - 0 1', '{e1e8,f8e8,f3f7,g8h8,f7e8}', 'mate3', 1400),
  ('sac-rook-back', 'Torre de sacrifício', '5rk1/ppp2ppp/8/8/3R4/8/PPP2PPP/3Q2K1 w - - 0 1', '{d4d8,f8d8,d1d8}', 'sacrificio', 1150),
  ('fork-knight', 'Garfo real', 'r2qk3/8/8/3N4/8/8/8/4K3 w q - 0 1', '{d5f6}', 'garfo', 700),
  ('fork-queen', 'Dama garfu', '4k3/8/8/8/1r6/8/3Q4/4K3 w - - 0 1', '{d2d8}', 'garfo', 800),
  ('pin-knight', 'Cavalo cravado', '6k1/8/8/3n4/8/8/B2R4/K7 w - - 0 1', '{d2d5}', 'cravada', 800),
  ('tac-free-bishop', 'Bispo enforcado', '4k3/8/8/4b3/8/8/8/4R1K1 w - - 0 1', '{e1e5}', 'tatica', 600),
  ('tac-free-rook', 'Torre à solta', '4k3/8/4r3/8/8/8/8/4R1K1 w - - 0 1', '{e1e6}', 'tatica', 700),
  ('tac-queen-trade', 'Dama grátis', '4k3/8/8/4q3/8/8/4Q3/4K3 w - - 0 1', '{e2e5}', 'tatica', 550),
  ('tac-bishop', 'Caça ao bispo', '4k3/8/3b4/8/8/B7/8/4K3 w - - 0 1', '{a3d6}', 'tatica', 550),
  ('tac-pawn-takes', 'Peão guerreiro', '4k3/8/8/8/2nr4/3P4/8/4K3 w - - 0 1', '{d3c4}', 'tatica', 500),
  ('end-promote', 'Coroação', '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', '{a7a8q}', 'finais', 500),
  ('end-opposition', 'Peão livre', '4k3/8/8/8/2p5/3P4/8/4K3 w - - 0 1', '{d3c4}', 'finais', 900),
  ('def-take-queen', 'Come a dama!', '6k1/5ppp/8/8/8/8/5q2/R5K1 w - - 0 1', '{g1f2}', 'defesa', 600),
  ('def-greedy', 'Dama gananciosa', '4k3/8/8/8/8/8/3q4/R3K3 w Q - 0 1', '{e1d2}', 'defesa', 650)
on conflict (slug) do nothing;
