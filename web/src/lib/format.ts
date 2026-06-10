const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function parse(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "16 a 18 mai 2026" ou "7 jun 2026" */
export function formatPeriod(start: string | null, end: string | null): string {
  const s = parse(start);
  const e = parse(end);
  if (!s) return 'Data a confirmar';
  const sameDay = !e || s.getTime() === e.getTime();
  if (sameDay) return `${s.getDate()} ${MESES[s.getMonth()]} ${s.getFullYear()}`;
  const sameMonth = s.getMonth() === e!.getMonth() && s.getFullYear() === e!.getFullYear();
  if (sameMonth) {
    return `${s.getDate()} a ${e!.getDate()} ${MESES[e!.getMonth()]} ${e!.getFullYear()}`;
  }
  return `${s.getDate()} ${MESES[s.getMonth()]} a ${e!.getDate()} ${MESES[e!.getMonth()]} ${e!.getFullYear()}`;
}

export function daysUntil(start: string | null): number | null {
  const s = parse(start);
  if (!s) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((s.getTime() - today.getTime()) / 86_400_000);
}

export function formatCountdown(start: string | null): string | null {
  const d = daysUntil(start);
  if (d == null) return null;
  if (d < 0) return 'Em andamento';
  if (d === 0) return 'Hoje';
  if (d === 1) return 'Amanhã';
  if (d <= 7) return `Em ${d} dias`;
  return null;
}

export function formatFee(fee: { value: number; estimated: boolean } | null): string {
  if (!fee) return 'Não informado';
  if (fee.value === 0) return 'Gratuito';
  const v = fee.value.toLocaleString('pt-BR');
  return fee.estimated ? `~ R$ ${v}` : `R$ ${v}`;
}

export function formatDistance(km: number | null): string {
  if (km == null) return '';
  if (km === 0) return 'Na sua cidade';
  return `${km.toLocaleString('pt-BR')} km`;
}

/** Ícone unicode por ritmo */
export function ritmoIcon(ritmo: string): string {
  const r = ritmo.toLowerCase();
  if (r.includes('blitz')) return '♟';
  if (r.includes('rápid') || r.includes('rapid')) return '♞';
  return '♚'; // clássico
}
