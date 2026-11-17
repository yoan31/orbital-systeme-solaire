
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap; uniform vec3 uSunPos; uniform vec3 uEarthPos;
uniform float uEarthshine; uniform float uEclipse; uniform float uIllum;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uSunPos - vWorld);
  vec3 E = normalize(uEarthPos - vWorld);
  float ndl = dot(N, L);
  vec3 tex = texture2D(uMap, vUv).rgb;
  float day = smoothstep(-0.02, 0.12, ndl);
  vec3 col = tex * (0.006 + 1.18 * max(ndl, 0.0));
  float es = max(dot(N, E), 0.0);
  col += tex * vec3(0.05, 0.065, 0.09) * es * uEarthshine;
  col *= mix(1.0, 0.22, uEclipse);
  col += vec3(0.16, 0.025, 0.0) * uEclipse * 0.18;
  col *= uIllum;
  gl_FragColor = vec4(col, 1.0);
  #include <logdepthbuf_fragment>
}