
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap; uniform vec3 uSunPos, uPlanetPos, uRingNormal;
uniform float uPlanetRadius, uOpacity, uInner, uOuter; uniform float uIllum;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec4 tex = texture2D(uMap, vec2(clamp(vUv.x, 0.0, 1.0), 0.5));
  float alpha = tex.a * uOpacity;
  if (alpha < 0.004) discard;
  vec3 N = normalize(vNormalW);
  if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(uSunPos - vWorld);
  float lit = max(dot(N, L), 0.0);
  vec3 oc = uPlanetPos - vWorld;
  float tca = dot(oc, L);
  float d = length(oc - L * max(tca, 0.0));
  float shadow = 1.0 - smoothstep(uPlanetRadius * 0.94, uPlanetRadius * 1.06, d) * step(0.0, tca);
  vec3 col = tex.rgb * (0.42 + 1.25 * lit * shadow);
  float back = max(dot(-N, L), 0.0);
  col += tex.rgb * 0.22 * back;
  col *= 1.12;
  col *= uIllum;
  gl_FragColor = vec4(col, alpha);
  #include <logdepthbuf_fragment>
}