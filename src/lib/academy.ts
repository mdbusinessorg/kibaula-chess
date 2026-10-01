// INP CHESS — Academy: exactamente 8 cursos de xadrez
// Conteúdo no código → funciona 100% offline; progresso sincronizado na base.

export type Lesson = {
  slug: string;
  title: string;
  kind: 'lesson' | 'exercise' | 'quiz';
  content: string;        // texto da lição (markdown simples)
  fen?: string;           // posição do exercício
  solution?: string[];    // jogada(s) correcta(s) em UCI
  xp: number;
};

export type Module = { title: string; lessons: Lesson[] };

export type AcademyCourse = {
  slug: string; title: string; icon: string; subtitle: string;
  description: string; modules: Module[];
};

const L = (slug: string, title: string, content: string, xp = 20): Lesson =>
  ({ slug, title, kind: 'lesson', content, xp });
const E = (slug: string, title: string, fen: string, solution: string[], content: string, xp = 30): Lesson =>
  ({ slug, title, kind: 'exercise', content, fen, solution, xp });

export const ACADEMY: AcademyCourse[] = [
  {
    slug: 'fundamentos', title: 'Fundamentos do Xadrez', icon: '♟️',
    subtitle: 'O ponto de partida',
    description: 'Regras, movimento das peças, xeque, mate e os primeiros conceitos.',
    modules: [
      {
        title: 'O tabuleiro e as peças',
        lessons: [
          L('fun-board', 'O tabuleiro', 'O tabuleiro tem 64 casas (8×8), alternando claras e escuras. A casa inferior direita de cada jogador é sempre clara. As colunas chamam-se a–h e as linhas 1–8.'),
          L('fun-pieces', 'Como as peças movem', 'Peão avança uma casa (duas no primeiro lance) e captura na diagonal. Torre em linhas rectas. Bispo em diagonais. Cavalo em "L" e salta peças. Dama combina torre e bispo. Rei move uma casa em qualquer direcção.'),
          L('fun-value', 'Valor das peças', 'Valores relativos: peão 1, cavalo 3, bispo 3, torre 5, dama 9. O rei não tem valor — a sua captura significa o fim do jogo.'),
        ],
      },
      {
        title: 'Regras essenciais',
        lessons: [
          L('fun-check', 'Xeque e xeque-mate', 'Xeque é quando o rei está atacado. O jogador em xeque TEM de o resolver — mover o rei, capturar o atacante ou bloquear. Se não houver solução, é xeque-mate.'),
          L('fun-special', 'Lances especiais', 'Roque: o rei salta duas casas para a torre (condições: rei e torre sem terem movido, casas livres e sem xeque). En passant: captura de peão que avançou duas casas. Promoção: peão que chega à última fila torna-se numa peça.'),
          E('fun-ex-mate1', 'Exercício: mate em 1', '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', ['a1a8'], 'As brancas jogam e dão mate numa jogada. Encontra-a.'),
        ],
      },
      {
        title: 'Primeiros jogos',
        lessons: [
          L('fun-goal', 'O objectivo do jogo', 'Vence quem der xeque-mate. O jogo empata por afogamento, material insuficiente, repetição tripla, acordo ou regra dos 50 lances.'),
          E('fun-ex-queen', 'Exercício: dama decide', '4k3/8/8/4q3/8/8/4Q3/4K3 w - - 0 1', ['e2e5'], 'A dama preta está pendurada. Captura-a.'),
        ],
      },
    ],
  },
  {
    slug: 'tatica', title: 'Tática', icon: '🎯',
    subtitle: 'Golpes que ganham material',
    description: 'Garfo, cravada, ataque descoberto, desvio e sacrifício — os padrões que decidem partidas.',
    modules: [
      {
        title: 'Motivos tácticos',
        lessons: [
          L('tac-fork', 'O garfo', 'Um garfo é um ataque simultâneo a duas peças com uma só. Cavalos são os mestres do garfo — aprende a vê-los antes que aconteçam.'),
          E('tac-ex-fork', 'Exercício: garfo de cavalo', 'r2qk3/8/8/3N4/8/8/8/4K3 w q - 0 1', ['d5f6'], 'O cavalo branco pode atacar rei e dama ao mesmo tempo.'),
          L('tac-pin', 'A cravada', 'Uma peça cravada não pode mover-se sem expor outra mais valiosa atrás dela. Cravada absoluta: a peça atrás é o rei — mover é ilegal.'),
          E('tac-ex-pin', 'Exercício: captura a cravada', '6k1/8/8/3n4/8/8/B2R4/K7 w - - 0 1', ['d2d5'], 'O cavalo está cravado pelo bispo. Captura-o de graça.'),
        ],
      },
      {
        title: 'Combinações',
        lessons: [
          L('tac-deflection', 'Desvio e sacrifício', 'Desviar um defensor da sua casa decisiva pode custar material — mas ganha a partida. Um sacrifício correcto não é magia: é cálculo.'),
          E('tac-ex-sac', 'Exercício: torre de sacrifício', '5rk1/ppp2ppp/8/8/3R4/8/PPP2PPP/3Q2K1 w - - 0 1', ['d4d8', 'f8d8', 'd1d8'], 'Entrega a torre para abrir a última fila — depois a dama dá mate.'),
          E('tac-ex-deflect', 'Exercício: mate em 3', '5rk1/ppp2ppp/8/8/8/5Q2/PPP2PPP/4R1K1 w - - 0 1', ['e1e8', 'f8e8', 'f3f7', 'g8h8', 'f7e8'], 'A torre força a troca e a dama termina. Três jogadas.'),
        ],
      },
    ],
  },
  {
    slug: 'estrategia', title: 'Estratégia', icon: '🧭',
    subtitle: 'Planos de longo prazo',
    description: 'Avaliar posições, criar planos, melhorar peças e jogar sem táctica imediata.',
    modules: [
      {
        title: 'Avaliar a posição',
        lessons: [
          L('str-elements', 'Os 5 elementos', 'Material, estrutura de peões, actividade das peças, segurança do rei e controlo do espaço. Avalia estes cinco antes de escolher um plano.'),
          L('str-weak', 'Fraquezas', 'Casas fracas são casas que nenhum peão pode defender. Peões isolados, dobrados e atrasados são alvos a longo prazo.'),
        ],
      },
      {
        title: 'Construir um plano',
        lessons: [
          L('str-improve', 'Melhorar a peça pior', 'Sem ideia? Pergunta: "qual é a minha peça menos activa?" e melhora-a. Este hábito decide mais partidas do que brilhantismos.'),
          L('str-prophylaxis', 'Profilaxia', 'Antes de executar o teu plano, pergunta: "o que quer o meu adversário?" Impedir a ideia dele vale tanto como avançar a tua.'),
        ],
      },
    ],
  },
  {
    slug: 'aberturas', title: 'Aberturas', icon: '📖',
    subtitle: 'Começar com vantagem',
    description: 'Princípios de abertura e repertórios simples para brancas e pretas.',
    modules: [
      {
        title: 'Princípios',
        lessons: [
          L('opn-principles', 'As 4 regras de ouro', '1) Controla o centro com peões. 2) Desenvolve cavalos e bispos depressa. 3) Faz o roque cedo. 4) Não repitas peças nem saias com a dama cedo.'),
          L('opn-traps', 'Armadilhas comuns', 'Conhece o Mate do Pastor, o Mate do Louco e a armadilha de Légal — para os aplicar e para não caíres neles.'),
          E('opn-ex-scholar', 'Exercício: castiga o Pastor', 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ['f3f7'], 'Aplica o Mate do Pastor: dama e bispo convergem em f7.'),
        ],
      },
      {
        title: 'Repertório simples',
        lessons: [
          L('opn-white', 'Para brancas: e4', 'Com 1.e4 controlas o centro e abres linhas para dama e bispo. Respostas sólidas a 1...e5: desenvolve Nf3, Bc4, roque.'),
          L('opn-black', 'Para pretas: estruturas sólidas', 'Contra e4, 1...e5 ou Siciliana (1...c5). Contra d4, 1...d5 ou defesa indiana. Escolhe UM repertório e repete-o.'),
        ],
      },
    ],
  },
  {
    slug: 'meio-jogo', title: 'Meio-Jogo', icon: '⚔️',
    subtitle: 'A batalha principal',
    description: 'Coordenação de peças, ataques ao rei e a transição táctica/estratégica.',
    modules: [
      {
        title: 'Atacar o rei',
        lessons: [
          L('mid-attack', 'Quando atacar', 'Ataca quando tens mais peças activas na zona do rei inimigo. Sinais: rei sem roque, defensores afastados, peões avançados.'),
          E('mid-ex-mate2', 'Exercício: mate em 2', '5rk1/pp3ppp/8/3R4/8/8/PPP2PPP/3Q2K1 w - - 0 1', ['d5d8', 'f8d8', 'd1d8'], 'Força a mate na última fila em duas jogadas.'),
        ],
      },
      {
        title: 'Jogo posicional',
        lessons: [
          L('mid-files', 'Colunas abertas', 'As torres pertencem às colunas abertas. Dobrar torres numa coluna ou infiltrar na 7ª fila são planos clássicos de meio-jogo.'),
          L('mid-minors', 'Bispo vs cavalo', 'Cavalo brilha em posições fechadas e casas de apoio. Bispo brilha em posições abertas e jogo nos dois flancos.'),
        ],
      },
    ],
  },
  {
    slug: 'finais', title: 'Finais', icon: '🏁',
    subtitle: 'Converter a vantagem',
    description: 'Finais de peões, torres e mates básicos — onde as partidas se ganham.',
    modules: [
      {
        title: 'Mates básicos',
        lessons: [
          L('end-mates', 'Mate com dama e torre', 'Com dama+rei: empurra o rei para a borda em "escada". Com torre+rei: usa o rei para cortar e a torre para dar xeques que encolhem a caixa.'),
          E('end-ex-mate', 'Exercício: rei e torre', '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', ['a1a8'], 'Mate de rei+torre contra rei solitário.'),
        ],
      },
      {
        title: 'Finais de peões',
        lessons: [
          L('end-square', 'A regra do quadrado', 'Para saber se um rei apanha um peão, desenha um quadrado mental do peão até à última fila. Se o rei entra no quadrado, apanha-o.'),
          E('end-ex-promo', 'Exercício: coroação', '4k3/P7/8/8/8/8/8/4K3 w - - 0 1', ['a7a8q'], 'Promove o peão.'),
        ],
      },
    ],
  },
  {
    slug: 'analise', title: 'Análise de Partidas', icon: '🔍',
    subtitle: 'Aprender com os erros',
    description: 'Método para rever as tuas partidas e encontrar os momentos críticos.',
    modules: [
      {
        title: 'Como analisar',
        lessons: [
          L('ana-method', 'O método em 3 passos', '1) Joga a partida sem engine e marca onde hesitaste. 2) Revê sozinho: onde mudou a avaliação? 3) Só depois confirma com a análise automática do INP Chess.'),
          L('ana-moments', 'Momentos críticos', 'Procura sempre: lances que cedem material, oportunidades de mate falhadas e a transição abertura→meio-jogo.'),
        ],
      },
      {
        title: 'Ferramentas',
        lessons: [
          L('ana-eval', 'Ler a avaliação', 'A avaliação conta em "peões": +1.0 = brancas ganham um peão de vantagem. Saltos grandes na avaliação = momento crítico.'),
          L('ana-habits', 'Rotina de revisão', 'Revisa TODAS as partidas que perdes. Anota uma lição por partida — uma só — e aplica-a na próxima.'),
        ],
      },
    ],
  },
  {
    slug: 'preparacao', title: 'Preparação Competitiva', icon: '🏆',
    subtitle: 'Jogar para ganhar',
    description: 'Gestão de tempo, psicologia, torneios e rotina de treino do competidor INP.',
    modules: [
      {
        title: 'Gestão de tempo',
        lessons: [
          L('pre-clock', 'Jogar com relógio', 'Em blitz, não penses mais de 15s num lance. Em rápidas, guarda 20% do tempo para o final. Aprende a jogar posições simples depressa.'),
          L('pre-tilt', 'Anti-tilt', 'Perdeste por blunder? Pára 5 minutos antes da próxima. Três derrotas seguidas = pausa obrigatória. O elo recupera-se; a rotina não.'),
        ],
      },
      {
        title: 'Rotina INP Chess',
        lessons: [
          L('pre-routine', 'Treino diário de 30 min', '10 min de puzzles, 10 min de partida focada, 10 min de análise. Consistência diária > sessões maratona.'),
          L('pre-tourney', 'Dia de torneio', 'Dorme bem, chega cedo, aquece com 3 puzzles fáceis. Entre rondas, não analises derrotas — descansa e hidrata.'),
        ],
      },
    ],
  },
];

export function getCourse(slug: string): AcademyCourse | undefined {
  return ACADEMY.find((c) => c.slug === slug);
}
export function courseLessons(c: AcademyCourse): Lesson[] {
  return c.modules.flatMap((m) => m.lessons);
}
export function totalLessons(): number {
  return ACADEMY.reduce((n, c) => n + courseLessons(c).length, 0);
}
/** progresso = conjunto de lesson_slug concluídas */
export function courseProgress(c: AcademyCourse, done: Set<string>): number {
  const all = courseLessons(c);
  if (!all.length) return 0;
  return Math.round((all.filter((l) => done.has(l.slug)).length / all.length) * 100);
}
