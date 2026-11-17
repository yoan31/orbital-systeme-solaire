
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uDay, uNight, uNormalMap, uSpecular;
uniform vec3 uSunPos; uniform float uIllum;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 nTex = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  vec3 q1 = dFdx(vWorld), q2 = dFdy(vWorld);
  vec2 st1 = dFdx(vUv), st2 = dFdy(vUv);
  vec3 T = normalize(q1 * st2.y - q2 * st1.y);
  vec3 B = normalize(-q1 * st2.x + q2 * st1.x);
  vec3 Np = normalize(T * nTex.x * 0.55 + B * nTex.y * 0.55 + N * nTex.z);
  vec3 L = normalize(uSunPos - vWorld);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = dot(Np, L);
  float day = smoothstep(-0.055, 0.18, ndl);
  vec3 dayCol = texture2D(uDay, vUv).rgb;
  vec3 nightCol = texture2D(uNight, vUv).rgb;
  vec3 col = dayCol * (0.012 + 1.18 * max(ndl, 0.0)) * day;
  col += nightCol * vec3(1.0, 0.78, 0.48) * (1.0 - day) * 1.75;
  float ocean = texture2D(uSpecular, vUv).r;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(Np, H), 0.0), 190.0) * ocean * day * 0.26;
  col += vec3(1.0, 0.94, 0.82) * spec;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += vec3(0.16, 0.42, 0.95) * fres * (0.22 + 0.78 * day) * 0.55;
  col += dayCol * 0.006;
  col *= uIllum;
  gl_FragColor = vec4(col, 1.0);
  #include <logdepthbuf_fragment>
}