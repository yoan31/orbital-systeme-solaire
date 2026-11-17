import { dateToJD, jdToDateParts, jdFromUTC } from '../astro/kepler';

/* Horloge de simulation : objet mutable hors React, lu/écrit par la boucle.
   Aucune allocation par image ; le store reçoit un instantané à ~7 Hz. */
export const clock = {
  jd: dateToJD(new Date()),
  playing: true,
  direction: 1 as 1 | -1,
  speed: 1,
  timeElapsed: 0,
  fps: 60,
  outOfRange: false,
  outOfRangeWarned: false,
};

export function setJD(jd: number): void {
  if (!Number.isFinite(jd)) return;
  clock.jd = jd;
}

export function goNow(): void {
  clock.jd = dateToJD(new Date());
}

export function togglePlay(): void {
  clock.playing = !clock.playing;
}

export function isOutOfRange(jd: number): boolean {
  const y = jdToDateParts(jd).year;
  return y < 1800 || y > 2050;
}

export function parseDateInput(value: string): number | null {
  const m = value && value.match(/^(\d{4,5})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return jdFromUTC(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0));
}
