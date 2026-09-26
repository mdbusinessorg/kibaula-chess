// Fallback local (ambiente sem Supabase): catálogo institucional real,
// sem jogadores — as estatísticas ficam a zero até haver dados reais.
export const FALLBACK_COURSES = [
  { slug: 'perfuracao-producao', name: 'Técnico de Perfuração e Produção', abbr: 'PP', icon: '⛽' },
  { slug: 'geologia-petroleos', name: 'Técnico de Geologia de Petróleos', abbr: 'GP', icon: '🪨' },
  { slug: 'minas', name: 'Técnico de Minas', abbr: 'MIN', icon: '⛏️' },
  { slug: 'laboratorio-quimica', name: 'Técnico de Laboratório de Química', abbr: 'LQ', icon: '🧪' },
  { slug: 'refinacao-gas', name: 'Técnico de Refinação e Gás', abbr: 'RG', icon: '🔬' },
  { slug: 'electromecanica', name: 'Técnico de Electromecânica', abbr: 'EM', icon: '⚙️' },
  { slug: 'instrumentacao', name: 'Técnico de Instrumentação', abbr: 'INST', icon: '🎛️' },
  { slug: 'manutencao-industrial', name: 'Técnico de Manutenção Industrial', abbr: 'MI', icon: '🔧' },
];

export const FALLBACK_PROFISSIONAL = [
  'Electricidade Industrial','Mecânica de Manutenção','Instrumentação Industrial',
  'Operador de Produção','Operador de Refinaria','Electro Hidráulica e Electro-pneumática',
  'Refrigeração e Climatização','Análises Laboratoriais — Química do Petróleo',
  'Serralheiro de Estruturas','Caldeireiro de Estruturas','Caldeireiro de Tubos — Tubista',
  'Soldador','Serralheiro Mecânico','Técnico de Mecatrónica','Programador de Máquinas CNC',
  'Técnico de Segurança e Higiene no Trabalho','Well Control','Operações','Qualidade',
  'Informática','Gestão, Logística e Aprovisionamento','Soft Skills','Ambiente',
  'Inglês Técnico','Inglês para Indústria de Petróleo e Gás','Energias Renováveis',
];

export const ACADEMY_CATEGORIES = [
  { name: 'Xadrez para Engenharia', desc: 'Padrões, cálculo e rigor técnico aplicados ao tabuleiro.' },
  { name: 'Pensamento Estratégico', desc: 'Planos de longo prazo, avaliação de posições e prioridades.' },
  { name: 'Resolução de Problemas', desc: 'Puzzles tácticos e métodos de análise posicional.' },
  { name: 'Tomada de Decisão', desc: 'Decidir sob pressão de tempo e incerteza.' },
  { name: 'Concentração', desc: 'Foco sustentado, gestão de energia e rotinas de jogo.' },
];
