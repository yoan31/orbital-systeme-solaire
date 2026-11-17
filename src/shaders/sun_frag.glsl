
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap; uniform float uTime;
uniform float uSunSpin, uActivity, uSunspots, uFlare;
uniform vec2 uFlareUv; uniform vec3 uWaveTint;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
const float TAU = 6.28318530718;
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Bruit multi-octaves 2D (deux octaves) pour la couronne animée.
float fbm2(vec2 p){
  float s = 0.0; float a = 0.55;
  for (int i = 0; i < 2; i++) { s += a * hash21(floor(p)); p *= 2.03; a *= 0.5; }
  return s;
}
void main(){
  // Rotation différentielle : équateur ~25,38 j, pôles plus lents.
  float lat = (vUv.y - 0.5) * 3.14159265359;
  // Rotation équatoriale portée par le mesh ; petite dérive différentielle bornée
  // (approximation visuelle, sans cisailler toute la carte solaire).
  float diff = 0.022 * sin(lat) * sin(uTime * 0.045 + uSunSpin * 0.015);
  vec2 uv0 = vec2(fract(vUv.x + diff), vUv.y);
  float t = uTime * 0.02;
  vec3 a = texture2D(uMap, uv0 + vec2(t * 0.006, 0.0)).rgb;
  vec3 b = texture2D(uMap, uv0 - vec2(t * 0.009, 0.002 * sin(uTime * 0.06))).rgb;
  vec3 col = a * 0.72 + b * 0.48;
  float n = hash21(floor(uv0 * vec2(1100.0, 550.0)) + floor(uTime * 1.7));
  col *= 0.88 + 0.22 * n;
  // Taches solaires procédurales, contraste piloté par les probabilités NOAA.
  float spot = smoothstep(0.865, 0.94, hash21(floor(uv0 * vec2(34.0, 17.0)) + 3.7));
  col *= 1.0 - 0.62 * spot * uSunspots;
  // Luminosité globale pilotée par le flux X.
  col *= 1.0 + 0.22 * uActivity;
  // Flash localisé et boucle coronale (l'UV est dans le repère de la texture).
  vec2 fd = (uv0 - uFlareUv) * vec2(1.0, 1.8);
  float flash = exp(-dot(fd, fd) * 900.0) * uFlare;
  col += vec3(1.0, 0.82, 0.48) * flash * 2.1;
  col *= uWaveTint;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 Nw = normalize(vNormalW);
  float rim = pow(1.0 - max(dot(Nw, V), 0.0), 2.2);
  col += vec3(1.0, 0.38, 0.06) * rim * 0.55;
  // Couronne : limb noise multi-octaves animé, pics d'activité pilotés par uFlare.
  vec2 cq = vec2(atan(Nw.z, Nw.x) * 2.4, asin(clamp(Nw.y, -1.0, 1.0)) * 5.0);
  vec2 cflow = cq * 5.0 + vec2(uTime * 0.10, -uTime * 0.06);
  float cn = fbm2(cflow) * 0.68 + fbm2(cflow * 2.17 + 7.3) * 0.32;
  float limb = pow(1.0 - max(dot(Nw, V), 0.0), 1.45);
  col += vec3(1.0, 0.46, 0.10) * limb * (0.30 + 0.75 * cn) * (1.0 + 1.15 * uFlare);
  col *= 1.18;
  gl_FragColor = vec4(col, 1.0);
  #include <logdepthbuf_fragment>
}