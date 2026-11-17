
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap; uniform sampler2D uDetail; uniform vec3 uSunPos; uniform float uOpacity, uCloudOnly;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec4 t = texture2D(uMap, vUv);
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uSunPos - vWorld);
  float ndl = dot(N, L);
  float day = smoothstep(-0.06, 0.16, ndl);
  vec3 col;
  float a;
  if (uCloudOnly > 0.5) {
    col = vec3(0.88, 0.93, 1.0);
    float detail = texture2D(uDetail, vUv).r;
    float cloudPatch = smoothstep(0.035, 0.58, detail);
    a = t.a * uOpacity * (0.10 + 0.90 * day) * (0.22 + 0.78 * cloudPatch);
  } else {
    col = t.rgb;
    a = t.a * uOpacity * day;
  }
  gl_FragColor = vec4(col, a);
  #include <logdepthbuf_fragment>
}