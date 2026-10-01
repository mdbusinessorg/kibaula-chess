// INP CHESS — banco de puzzles (local = 100% offline; espelhado na tabela `puzzles`)
// solution_uci: sequência alternada [jogada do solver, resposta do adversário, …]

export type Puzzle = {
  slug: string;
  title: string;
  fen: string;
  solution: string[];
  theme: PuzzleTheme;
  rating: number;
};

export type PuzzleTheme =
  | 'mate1' | 'mate2' | 'mate3' | 'tatica' | 'garfo' | 'cravada'
  | 'descoberto' | 'sacrificio' | 'finais' | 'defesa';

export const PUZZLE_THEMES: { key: PuzzleTheme | 'todos'; label: string; icon: string }[] = [
  { key: 'todos',      label: 'Todos',             icon: '🧩' },
  { key: 'mate1',      label: 'Mate em 1',         icon: '⚡' },
  { key: 'mate2',      label: 'Mate em 2',         icon: '⚔️' },
  { key: 'mate3',      label: 'Mate em 3',         icon: '👑' },
  { key: 'tatica',     label: 'Tática',            icon: '🎯' },
  { key: 'garfo',      label: 'Garfo',             icon: '🍴' },
  { key: 'cravada',    label: 'Cravada',           icon: '📌' },
  { key: 'sacrificio', label: 'Sacrifício',        icon: '🔥' },
  { key: 'finais',     label: 'Finais',            icon: '🏁' },
  { key: 'defesa',     label: 'Defesa',            icon: '🛡️' },
];

export const PUZZLES: Puzzle[] = [
  // ---------- mate em 1 ----------
  { slug: 'm1-scholars', title: 'Mate do Pastor', theme: 'mate1', rating: 600,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['f3f7'] },
  { slug: 'm1-backrank', title: 'Corredor mortal', theme: 'mate1', rating: 500,
    fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
    solution: ['a1a8'] },
  { slug: 'm1-corner', title: 'Rei encurralado', theme: 'mate1', rating: 550,
    fen: 'k7/8/K7/8/8/8/8/7R w - - 0 1',
    solution: ['h1h8'] },
  { slug: 'm1-queen', title: 'Dama decisiva', theme: 'mate1', rating: 500,
    fen: '6k1/8/7K/8/8/8/6Q1/8 w - - 0 1',
    solution: ['g2g7'] },
  { slug: 'm1-rook', title: 'Última linha', theme: 'mate1', rating: 500,
    fen: '7k/8/6K1/8/8/8/8/4R3 w - - 0 1',
    solution: ['e1e8'] },
  { slug: 'm1-net', title: 'Rede de mate', theme: 'mate1', rating: 600,
    fen: 'r1bqk1nr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solution: ['h5f7'] },
  { slug: 'm1-queen-net', title: 'Dama no canto', theme: 'mate1', rating: 700,
    fen: 'k7/8/1K6/8/8/8/Q7/8 w - - 0 1',
    solution: ['a2g8'] },
  { slug: 'm1-kr', title: 'Rei e torre', theme: 'mate1', rating: 500,
    fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1',
    solution: ['a1a8'] },

  // ---------- mate em 2 ----------
  { slug: 'm2-lift', title: 'Elevador de torres', theme: 'mate2', rating: 1100,
    fen: '5rk1/pp3ppp/8/3R4/8/8/PPP2PPP/3Q2K1 w - - 0 1',
    solution: ['d5d8', 'f8d8', 'd1d8'] },
  { slug: 'm2-queen-net', title: 'Teia da dama', theme: 'mate2', rating: 1000,
    fen: 'k7/8/K7/8/8/8/1Q6/8 w - - 0 1',
    solution: ['b2g7', 'a8b8', 'g7b7'] },

  // ---------- mate em 3 ----------
  { slug: 'm3-deflect', title: 'Sacrifício de desvio', theme: 'mate3', rating: 1400,
    fen: '5rk1/ppp2ppp/8/8/8/5Q2/PPP2PPP/4R1K1 w - - 0 1',
    solution: ['e1e8', 'f8e8', 'f3f7', 'g8h8', 'f7e8'] },

  // ---------- sacrifício ----------
  { slug: 'sac-rook-back', title: 'Torre de sacrifício', theme: 'sacrificio', rating: 1150,
    fen: '5rk1/ppp2ppp/8/8/3R4/8/PPP2PPP/3Q2K1 w - - 0 1',
    solution: ['d4d8', 'f8d8', 'd1d8'] },

  // ---------- garfo ----------
  { slug: 'fork-knight', title: 'Garfo real', theme: 'garfo', rating: 700,
    fen: 'r2qk3/8/8/3N4/8/8/8/4K3 w q - 0 1',
    solution: ['d5f6'] },
  { slug: 'fork-queen', title: 'Dama garfu', theme: 'garfo', rating: 800,
    fen: '4k3/8/8/8/1r6/8/3Q4/4K3 w - - 0 1',
    solution: ['d2d8'] },

  // ---------- cravada ----------
  { slug: 'pin-knight', title: 'Cavalo cravado', theme: 'cravada', rating: 800,
    fen: '6k1/8/8/3n4/8/8/B2R4/K7 w - - 0 1',
    solution: ['d2d5'] },

  // ---------- tática ----------
  { slug: 'tac-free-bishop', title: 'Bispo enforcado', theme: 'tatica', rating: 600,
    fen: '4k3/8/8/4b3/8/8/8/4R1K1 w - - 0 1',
    solution: ['e1e5'] },
  { slug: 'tac-free-rook', title: 'Torre à solta', theme: 'tatica', rating: 700,
    fen: '4k3/8/4r3/8/8/8/8/4R1K1 w - - 0 1',
    solution: ['e1e6'] },
  { slug: 'tac-queen-trade', title: 'Dama grátis', theme: 'tatica', rating: 550,
    fen: '4k3/8/8/4q3/8/8/4Q3/4K3 w - - 0 1',
    solution: ['e2e5'] },
  { slug: 'tac-bishop', title: 'Caça ao bispo', theme: 'tatica', rating: 550,
    fen: '4k3/8/3b4/8/8/B7/8/4K3 w - - 0 1',
    solution: ['a3d6'] },
  { slug: 'tac-pawn-takes', title: 'Peão guerreiro', theme: 'tatica', rating: 500,
    fen: '4k3/8/8/8/2nr4/3P4/8/4K3 w - - 0 1',
    solution: ['d3c4'] },

  // ---------- finais ----------
  { slug: 'end-promote', title: 'Coroação', theme: 'finais', rating: 500,
    fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
    solution: ['a7a8q'] },
  { slug: 'end-opposition', title: 'Peão livre', theme: 'finais', rating: 900,
    fen: '4k3/8/8/8/2p5/3P4/8/4K3 w - - 0 1',
    solution: ['d3c4'] },

  // ---------- defesa ----------
  { slug: 'def-take-queen', title: 'Come a dama!', theme: 'defesa', rating: 600,
    fen: '6k1/5ppp/8/8/8/8/5q2/R5K1 w - - 0 1',
    solution: ['g1f2'] },
  { slug: 'def-greedy', title: 'Dama gananciosa', theme: 'defesa', rating: 650,
    fen: '4k3/8/8/8/8/8/3q4/R3K3 w Q - 0 1',
    solution: ['e1d2'] },
];

export function puzzlesByTheme(theme: PuzzleTheme | 'todos'): Puzzle[] {
  return theme === 'todos' ? PUZZLES : PUZZLES.filter((p) => p.theme === theme);
}
