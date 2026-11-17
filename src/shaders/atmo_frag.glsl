
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uSunPos; uniform vec3 uColor; uniform vec3 uAtmoColor; uniform float uIntensity; uniform float uIllum;
varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uSunPos - vWorld);
  float rim = pow(1.0 - abs(dot(N, V)), 3.4);
  float sun = max(dot(N, L), 0.0);
  // Diffusion type Rayleigh : liseré diurne plus large et plus chaud,
  // face nuit fortement atténuée (0,25) comme dans l'atmosphère réelle.
  float daySide = smoothstep(-0.35, 0.42, dot(N, L));
  vec3 tint = mix(uColor, uAtmoColor, 0.30 + 0.55 * daySide);
  float alpha = rim * (0.06 + 1.02 * sun) * uIntensity * (0.25 + 0.75 * daySide);
  gl_FragColor = vec4(tint * alpha * uIllum, alpha * 0.9 * sqrt(uIllum));
  #include <logdepthbuf_fragment>
}