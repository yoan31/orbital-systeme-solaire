
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap; uniform vec3 uSunPos; uniform float uOpacity; uniform float uIllum;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  float a = texture2D(uMap, vUv).r;
  a = smoothstep(0.055, 0.66, a) * uOpacity;
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uSunPos - vWorld);
  float ndl = max(dot(N, L), 0.0);
  vec3 col = vec3(0.9, 0.95, 1.0) * (0.015 + 1.25 * ndl);
  col *= uIllum;
  gl_FragColor = vec4(col, a);
  #include <logdepthbuf_fragment>
}