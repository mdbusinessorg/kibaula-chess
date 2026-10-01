'use client';

import { usePrefs, setPref, BOARD_THEMES, type BoardThemeId } from '@/lib/prefs';
import { sounds } from '@/lib/sounds';

function Toggle({ label, desc, value, onChange }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between py-2 text-left">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {desc && <div className="text-xs muted">{desc}</div>}
      </div>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-[var(--accent)]' : 'bg-[var(--panel-2)]'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${value ? 'left-[1.35rem]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export default function Definicoes() {
  const p = usePrefs();

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Definições</h1>

      <section className="panel divide-y divide-[var(--border)] px-4 py-2">
        <Toggle label="Som" desc="Jogadas, capturas, xeque e fim de partida"
          value={p.sound} onChange={(v) => { setPref('sound', v); if (v) sounds.move(); }} />
        <Toggle label="Animações" desc="Movimento das peças no tabuleiro"
          value={p.animations} onChange={(v) => setPref('animations', v)} />
      </section>

      <section className="panel p-4">
        <div className="mb-3 text-sm font-semibold">Tabuleiro</div>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((k) => {
            const t = BOARD_THEMES[k];
            return (
              <button key={k} onClick={() => setPref('board', k)}
                className={`rounded-lg border-2 p-2 text-center ${p.board === k ? 'border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                <div className="mx-auto mb-1 grid h-12 w-12 grid-cols-2 overflow-hidden rounded">
                  <span style={{ background: t.light }} /><span style={{ background: t.dark }} />
                  <span style={{ background: t.dark }} /><span style={{ background: t.light }} />
                </div>
                <span className="text-xs font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-4 text-sm">
        <div className="font-semibold">Sobre</div>
        <p className="muted mt-1 text-xs">
          INP CHESS v2.1 — aplicação da comunidade de xadrez do Instituto Nacional de Petróleos.
          Projeto da comunidade, sem carácter oficial. Joga. Aprende. Evolui.
        </p>
      </section>
    </div>
  );
}
