import { AU_KM } from '../astro/constants';
import { BODY_INFO } from '../astro/info';
import { COMET_BY_KEY, SATELLITES } from '../astro/constants';
import { cometPerihelionWindow, formatDateShort, radToDeg } from '../astro/kepler';
import { solarDeclination } from '../astro/earth';
import { ephemeris, moonGeo, satelliteEphemeris } from '../state/ephemeris';
import { moonInfo } from './frame';
import { fmtAU, fmtKm, fmtPeriod, fmtRotation, fmtSpeed } from '../lib/format';

export interface InfoStat {
  label: string;
  value: string;
  sub: string;
}

export interface InfoTag {
  text: string;
  hot?: boolean;
}

export interface InfoView {
  name: string;
  type: string;
  desc: string;
  stats: InfoStat[];
  tags: InfoTag[];
  isEarth: boolean;
}

const nfInt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const nf4 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function stat(label: string, value: string, sub = ''): InfoStat {
  return { label, value, sub };
}

/* Fiche de l'astre : mêmes libellés et valeurs que updateInfo() d'origine. */
export function buildInfo(key: string, jd: number): InfoView {
  const info = BODY_INFO[key];
  const view: InfoView = { name: info.name, type: info.type, desc: info.desc, stats: [], tags: [], isEarth: key === 'earth' };
  const earth = ephemeris.earth;
  const isSatellite = !!(info.parent && satelliteEphemeris[key]);

  if (key === 'sun') {
    view.stats.push(stat('Distance à la Terre', fmtAU(earth.r), fmtKm(earth.r * AU_KM)));
    view.stats.push(stat('Rayon', fmtKm(info.radiusKm), `${nf2.format(info.radiusKm / 6371)} R⊕`));
    view.stats.push(stat('Rotation (équateur)', fmtRotation(info.rotationHours), 'période sidérale'));
    view.stats.push(stat('Température de surface', info.temp, 'photosphère'));
    view.stats.push(stat('Masse', '1,989 × 10³⁰ kg', '99,86 % du système'));
    view.stats.push(stat('Lunes', '—'));
    view.tags.push({ text: 'Source lumineuse principale' }, { text: 'Bloom + couronne' }, { text: 'Shader émissif animé', hot: true });
  } else if (key === 'moon') {
    view.stats.push(stat('Distance à la Terre', fmtKm(moonGeo.distKm), fmtAU(moonGeo.distKm / AU_KM)));
    view.stats.push(stat('Période sidérale', '27,3217 j', 'révolution autour de la Terre'));
    view.stats.push(stat('Rayon', fmtKm(info.radiusKm), `${nf2.format(info.radiusKm / 6371)} R⊕`));
    view.stats.push(stat('Phase', moonInfo.phase || '—', `${nf2.format(moonInfo.illum * 100)} % éclairée`));
    view.stats.push(stat('Élongation Soleil–Lune', `${nf2.format(moonInfo.elongDeg)}°`, moonInfo.waxing ? 'croissante' : 'décroissante'));
    view.stats.push(stat('Vitesse orbitale moyenne', '1,022 km/s', 'autour de la Terre'));
    view.tags.push({ text: 'Inclinaison 5,145°' }, { text: 'Nœud rétrograde 18,6 ans' });
    if (moonInfo.solar) view.tags.push({ text: `${moonInfo.solar} (géocentrique)`, hot: true });
    if (moonInfo.lunar) view.tags.push({ text: moonInfo.lunar, hot: true });
    if (!moonInfo.solar && !moonInfo.lunar) view.tags.push({ text: 'Aucune éclipse géocentrique en cours' });
  } else if (isSatellite) {
    const sat = satelliteEphemeris[key];
    const s = SATELLITES.find((x) => x.key === key);
    if (s) {
      view.stats.push(stat(`Distance au ${BODY_INFO[info.parent as string].name}`, fmtKm(s.aKm), 'demi-grand axe'));
      view.stats.push(stat('Période orbitale', fmtPeriod(s.periodDays), s.periodDays < 0 ? 'rétrograde' : 'prograde'));
      view.stats.push(stat('Rayon', fmtKm(info.radiusKm), `${nf2.format(info.radiusKm / 6371)} R⊕`));
      view.stats.push(stat('Inclinaison (équateur)', `${nf2.format(Math.abs(s.incl))}°`, 'orbite simplifiée'));
      view.stats.push(stat('Vitesse orbitale', fmtSpeed(sat.speed), 'moyenne'));
      view.stats.push(stat('Distance à la Terre', fmtAU(sat.distEarthAU), fmtKm(sat.distEarthAU * AU_KM)));
    }
    view.tags.push({ text: 'Orbite circulaire simplifiée' }, { text: 'Phase initiale approchée' });
  } else if (COMET_BY_KEY[key]) {
    const c = COMET_BY_KEY[key];
    const st = ephemeris[key];
    const win = cometPerihelionWindow(c, jd);
    view.stats.push(stat('Distance au Soleil', fmtAU(st.r), fmtKm(st.r * AU_KM)));
    view.stats.push(stat('Vitesse orbitale', fmtSpeed(st.v), 'loi des aires'));
    view.stats.push(stat('Période orbitale', fmtPeriod(c.periodDays), `${nfInt.format(c.periodDays)} jours`));
    view.stats.push(stat('Rayon du noyau', `≈ ${nf2.format(c.radiusKm)} km`, 'forme irrégulière'));
    view.stats.push(stat('Distance à la Terre', fmtAU(st.distEarthAU ?? 0), fmtKm((st.distEarthAU ?? 0) * AU_KM)));
    view.stats.push(stat('Excentricité', nf4.format(c.e), c.e >= 0.99 ? 'orbite quasi parabolique' : 'ellipse très excentrique'));
    view.tags.push({ text: `Inclinaison ${nf2.format(c.incl)}°` }, { text: `Périhélie ${formatDateShort(win.last)}` });
    view.tags.push({ text: `Prochain retour ${formatDateShort(win.next)}`, hot: true });
  } else {
    const st = ephemeris[key];
    if (!st) return view;
    view.stats.push(stat('Distance au Soleil', fmtAU(st.r), fmtKm(st.r * AU_KM)));
    view.stats.push(stat('Vitesse orbitale', fmtSpeed(st.v), 'instantanée (vis-viva)'));
    view.stats.push(stat('Période orbitale', fmtPeriod(st.periodDays), `${nfInt.format(st.periodDays)} jours`));
    view.stats.push(stat('Rayon', fmtKm(info.radiusKm), `${nf2.format(info.radiusKm / 6371)} R⊕`));
    view.stats.push(stat('Inclinaison axiale', `${nf2.format(info.tilt)}°`, 'pôle IAU'));
    view.stats.push(stat('Rotation sidérale', fmtRotation(info.rotationHours), 'période réelle'));
    view.stats.push(
      stat('Distance à la Terre', key === 'earth' ? '—' : fmtAU(st.distEarthAU ?? 0), key === 'earth' ? 'planète de référence' : fmtKm((st.distEarthAU ?? 0) * AU_KM)),
    );
    view.stats.push(stat('Lunes connues', nfInt.format(info.moons), 'nombre confirmé (2025)'));
    if (key === 'earth') {
      const decl = radToDeg(solarDeclination(jd));
      const d2 = radToDeg(solarDeclination(jd + 0.5));
      const rising = d2 > decl;
      const season =
        Math.abs(decl) < 0.35
          ? rising
            ? 'Équinoxe de mars'
            : 'Équinoxe de septembre'
          : decl > 0
            ? rising
              ? 'Printemps (N)'
              : 'Été (N)'
            : rising
              ? 'Hiver (N)'
              : 'Automne (N)';
      view.tags.push(
        { text: `Déclinaison solaire ${nf2.format(decl)}°` },
        { text: season },
        { text: 'Terminateur réel jour/nuit' },
        { text: 'Axe précessé' },
      );
    } else if (key === 'saturn') {
      view.tags.push({ text: 'Anneaux 1,24–2,36 R' }, { text: 'Ombres planète ↔ anneaux', hot: true }, { text: 'Alpha radial' });
    } else if (key === 'venus') {
      view.tags.push({ text: 'Rotation rétrograde' }, { text: 'Surface + nuages' });
    } else if (key === 'jupiter') {
      view.tags.push({ text: 'Io · Europe · Ganymède · Callisto' });
    } else if (key === 'neptune') {
      view.tags.push({ text: 'Triton rétrograde' }, { text: 'Anneaux non représentés' });
    } else if (key === 'uranus') {
      view.tags.push({ text: 'Anneaux procéduraux' }, { text: 'Axe 97,77°' });
    } else if (key === 'pluto') {
      view.tags.push({ text: 'Texture procédurale' }, { text: 'Bonus · orbite 17,1°' });
    }
  }
  void nf3;
  return view;
}
