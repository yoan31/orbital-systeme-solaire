
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap, uRingMap; uniform vec3 uSunPos, uPlanetPos, uRingNormal;
uniform float uRingInner, uRingOuter; uniform float uIllum;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uSunPos - vWorld);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = max(dot(N, L), 0.0);
  float shadow = 1.0;
  float denom = dot(L, uRingNormal);
  if (abs(denom) > 1e-5) {
    float t = dot(uPlanetPos - vWorld, uRingNormal) / denom;
    if (t > 0.0) {
      vec3 hit = vWorld + L * t;
      float rad = length(hit - uPlanetPos);
      if (rad > uRingInner && rad < uRingOuter) {
        float u = (rad - uRingInner) / max(uRingOuter - uRingInner, 1e-6);
        float a = texture2D(uRingMap, vec2(clamp(u, 0.0, 1.0), 0.5)).a;
        shadow = 1.0 - 0.92 * a;
      }
    }
  }
  vec3 col = texture2D(uMap, vUv).rgb;
  float mu = max(dot(N, V), 0.0);
  col *= (0.018 + 1.12 * ndl * shadow) * (0.82 + 0.18 * sqrt(mu));
  col *= uIllum;
  gl_FragColor = vec4(col, 1.0);
  #include <logdepthbuf_fragment>
}