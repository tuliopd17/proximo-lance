import type { Tournament } from '../lib/types';
import {
  formatCountdown,
  formatDistance,
  formatPlayers,
  formatPeriod,
  ritmoIcon,
} from '../lib/format';

const RITMO_STYLE: Record<string, { accent: string; chip: string }> = {
  blitz: { accent: 'bg-gold', chip: 'bg-gold-soft/30 text-walnut' },
  rapid: { accent: 'bg-felt-2', chip: 'bg-felt/15 text-felt-deep' },
  classic: { accent: 'bg-walnut-2', chip: 'bg-walnut/12 text-walnut' },
};

function ritmoKey(r: string) {
  const s = r.toLowerCase();
  if (s.includes('blitz')) return 'blitz';
  if (s.includes('rápid') || s.includes('rapid')) return 'rapid';
  return 'classic';
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-walnut-soft">{icon}</span>
      <div className="min-w-0">
        <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70">
          {label}
        </div>
        <div className="truncate font-sans text-sm font-medium text-ink">{value}</div>
      </div>
    </div>
  );
}

export function TournamentCard({ t, index }: { t: Tournament; index: number }) {
  const rk = ritmoKey(t.ritmo);
  const style = RITMO_STYLE[rk];
  const countdown = formatCountdown(t.start);

  return (
    <article
      className="animate-rise group relative flex flex-col overflow-hidden rounded-2xl border border-walnut/12 bg-ivory shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${style.accent}`} aria-hidden />

      <div className="flex flex-col gap-4 p-5 pl-7">
        {/* topo: ritmo + FIDE + contagem */}
        <div className="flex items-center justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-sans text-xs font-semibold ${style.chip}`}
          >
            <span className="text-base leading-none">{ritmoIcon(t.ritmo)}</span>
            {t.ritmo || 'Clássico'}
          </span>
          <div className="flex items-center gap-2">
            {t.isNew && (
              <span className="rounded-full bg-gold px-2.5 py-1 font-sans text-[11px] font-bold tracking-wide text-parchment">
                Novo
              </span>
            )}
            {countdown && (
              <span className="rounded-full bg-felt px-2.5 py-1 font-sans text-[11px] font-semibold text-parchment">
                {countdown}
              </span>
            )}
            <span className="rounded-full border border-gold/40 bg-gold-soft/15 px-2.5 py-1 font-sans text-[11px] font-bold tracking-wide text-gold">
              FIDE
            </span>
          </div>
        </div>

        {/* nome */}
        <h3 className="font-display text-xl leading-snug text-ink">{t.name}</h3>

        {/* local + distância */}
        <div className="flex items-baseline justify-between gap-3 border-b border-walnut/10 pb-3">
          <p className="font-serif text-lg text-walnut">
            {t.city}
            {t.uf ? <span className="text-walnut-soft">, {t.uf}</span> : null}
          </p>
          {t.distanceKm != null && (
            <span className="shrink-0 font-sans text-sm font-semibold text-felt">
              {formatDistance(t.distanceKm)}
            </span>
          )}
        </div>

        {/* grade de informações */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
          <Stat icon={<IconCalendar />} label="Data" value={formatPeriod(t.start, t.end)} />
          <Stat
            icon={<IconClock />}
            label="Ritmo das partidas"
            value={t.timeControl || t.ritmo || '—'}
          />
          <Stat
            icon={<IconGrid />}
            label="Sistema"
            value={t.system ? `${t.system}${t.rounds ? ` · ${t.rounds} rodadas` : ''}` : '—'}
          />
          <Stat icon={<IconUsers />} label="Participantes" value={formatPlayers(t.players)} />
        </div>

        {/* organizador */}
        {t.organizer && (
          <p className="font-sans text-xs text-ink-soft/80">
            Organização: <span className="font-medium text-ink-soft">{t.organizer}</span>
          </p>
        )}

        {/* links */}
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {t.regulamentoUrl && (
            <a
              href={t.regulamentoUrl}
              target="_blank"
              rel="noreferrer"
              className="ring-gold inline-flex items-center gap-1.5 rounded-lg bg-walnut px-3.5 py-2 font-sans text-sm font-semibold text-parchment transition hover:bg-walnut-2"
            >
              Regulamento & detalhes
              <IconArrow />
            </a>
          )}
          {t.fideUrl && (
            <a
              href={t.fideUrl}
              target="_blank"
              rel="noreferrer"
              className="ring-gold inline-flex items-center gap-1.5 rounded-lg border border-walnut/20 px-3.5 py-2 font-sans text-sm font-semibold text-walnut transition hover:bg-board-light/40"
            >
              Página FIDE
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/* ---- ícones (stroke currentColor) ---- */
const S = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const IconCalendar = () => (
  <svg {...S}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
);
const IconClock = () => (
  <svg {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
);
const IconGrid = () => (
  <svg {...S}><rect x="3" y="3" width="18" height="18" rx="1.5" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
);
const IconUsers = () => (
  <svg {...S}><path d="M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19" /><circle cx="10" cy="8" r="3.2" /><path d="M19.5 19v-1.2a3 3 0 0 0-2.3-2.9M15.5 5.2a3 3 0 0 1 0 5.6" /></svg>
);
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
