-- Seed: INP, tipos de ensino, cursos (Ensino Médio + Formação Profissional), ano lectivo
insert into institutions (name, slug) values ('Instituto Nacional de Petróleos', 'inp');

insert into education_types (institution_id, name, slug)
select id, 'Ensino Médio', 'ensino-medio' from institutions where slug = 'inp';

insert into education_types (institution_id, name, slug)
select id, 'Formação Profissional', 'formacao-profissional' from institutions where slug = 'inp';

insert into courses (education_type_id, name, slug, abbreviation, icon, sort_order)
select et.id, v.name, v.slug, v.abbr, v.icon, v.ord
from education_types et
join (values
  ('Técnico de Perfuração e Produção','perfuracao-producao','PP','⛽',1),
  ('Técnico de Geologia de Petróleos','geologia-petroleos','GP','🪨',2),
  ('Técnico de Minas','minas','MIN','⛏️',3),
  ('Técnico de Laboratório de Química','laboratorio-quimica','LQ','🧪',4),
  ('Técnico de Refinação e Gás','refinacao-gas','RG','🔬',5),
  ('Técnico de Electromecânica','electromecanica','EM','⚙️',6),
  ('Técnico de Instrumentação','instrumentacao','INST','🎛️',7),
  ('Técnico de Manutenção Industrial','manutencao-industrial','MI','🔧',8)
) as v(name, slug, abbr, icon, ord) on true
where et.slug = 'ensino-medio';

insert into courses (education_type_id, name, slug, abbreviation, icon, sort_order)
select et.id, v.name, v.slug, upper(substring(regexp_replace(v.name, '[^A-Za-zÀ-ÿ ]', '', 'g') from 1 for 3)), '📘', v.ord
from education_types et
join (values
  ('Electricidade Industrial','electricidade-industrial',1),
  ('Mecânica de Manutenção','mecanica-manutencao',2),
  ('Instrumentação Industrial','instrumentacao-industrial',3),
  ('Operador de Produção','operador-producao',4),
  ('Operador de Refinaria','operador-refinaria',5),
  ('Electro Hidráulica e Electro-pneumática','electro-hidraulica-electro-pneumatica',6),
  ('Refrigeração e Climatização','refrigeracao-climatizacao',7),
  ('Análises Laboratoriais — Química do Petróleo','analises-laboratoriais-quimica-petroleo',8),
  ('Serralheiro de Estruturas','serralheiro-estruturas',9),
  ('Caldeireiro de Estruturas','caldeireiro-estruturas',10),
  ('Caldeireiro de Tubos — Tubista','caldeireiro-tubos-tubista',11),
  ('Soldador','soldador',12),
  ('Serralheiro Mecânico','serralheiro-mecanico',13),
  ('Técnico de Mecatrónica','tecnico-mecatronica',14),
  ('Programador de Máquinas CNC','programador-maquinas-cnc',15),
  ('Técnico de Segurança e Higiene no Trabalho','tecnico-seguranca-higiene-trabalho',16),
  ('Well Control','well-control',17),
  ('Operações','operacoes',18),
  ('Qualidade','qualidade',19),
  ('Informática','informatica',20),
  ('Gestão, Logística e Aprovisionamento','gestao-logistica-aprovisionamento',21),
  ('Soft Skills','soft-skills',22),
  ('Ambiente','ambiente',23),
  ('Inglês Técnico','ingles-tecnico',24),
  ('Inglês para Indústria de Petróleo e Gás','ingles-industria-petroleo-gas',25),
  ('Energias Renováveis','energias-renovaveis',26)
) as v(name, slug, ord) on true
where et.slug = 'formacao-profissional';

insert into academic_years (institution_id, label)
select id, '2026' from institutions where slug = 'inp';

insert into ranking_config (id, method) values (1, 'avg_rating');
