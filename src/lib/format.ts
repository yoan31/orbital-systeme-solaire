import { jdToDateParts } from '../astro/kepler';

const nfInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatUTC(jd: number): string {
  const p = jdToDateParts(jd);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)} ${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

export function dateInputValue(jd: number): string {
  const p = jdToDateParts(jd);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}:${pad2(p.second)}`;
}

export function fmtKm(km: number): string {
  return `${nfInt.format(Math.round(km))} km`;
}
export function fmtAU(au: number): string {
  return `${nf3.format(au)} UA`;
}
export function fmtSpeed(v: number): string {
  return `${nf2.format(v)} km/s`;
}

export function fmtPeriod(days: number): string {
  if (!Number.isFinite(days)) return '—';
  if (Math.abs(days) < 1000) return `${nf2.format(Math.abs(days))} j`;
  return `${nf2.format(Math.abs(days) / 365.25)} ans`;
}

export function fmtRotation(hours: number): string {
  if (!hours) return '—';
  const a = Math.abs(hours);
  if (a < 48) return `${nf2.format(hours)} h`;
  return `${nf2.format(hours / 24)} j${hours < 0 ? ' (rétrograde)' : ''}`;
}

export function fmtSpeedScale(s: number): string {
  if (Math.abs(s - 1) < 1e-9) return 'Temps réel';
  if (s < 1) return `×${s.toFixed(2)}`;
  if (s < 60) return `${nf2.format(s)} s/s`;
  if (s < 3600) return `${nf2.format(s / 60)} min/s`;
  if (s < 86400) return `${nf2.format(s / 3600)} h/s`;
  if (s < 604800) return `${nf2.format(s / 86400)} j/s`;
  if (s < 2629800) return `${nf2.format(s / 604800)} sem/s`;
  if (s < 31557600) return `${nf2.format(s / 2629800)} mois/s`;
  return `${nf2.format(s / 31557600)} an/s`;
}

export function fmtDaysFromNow(days: number): string {
  return nfInt.format(Math.round(days));
}
