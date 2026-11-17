
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uAurora; uniform vec3 uSunPos;
uniform float uKp, uUseOvation, uTime, uIntensity;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uSunPos - vWorld);
  float ndl = dot(N, L);
  float night = 1.0 - smoothstep(-0.20, 0.06, ndl);
  float lat = abs(vUv.y - 0.5) * 2.0;
  float oval;
  if (uUseOvation > 0.5) {
    // Ovation est en longitude 0..360 ; la carte équirectangulaire de la Terre est centrée sur 0.
    // DataTexture (flipY = false) : la ligne 0 est au nord (latitude +90) et est
    // échantillonnée en v = 0, d'où le 1 - vUv.y.
    vec2 auv = vec2(fract(vUv.x + 0.5), 1.0 - clamp(vUv.y, 0.0, 1.0));
    oval = texture2D(uAurora, auv).r;
  } else {
    oval = smoothstep(0.62, 0.93, lat);
  }
  float kp = clamp((uKp - 1.0) / 7.0, 0.0, 1.0);
  float a = oval * night * (0.10 + 0.90 * kp) * uIntensity;
  a *= 0.75 + 0.25 * sin(uTime * 1.3 + vUv.x * 18.0);
  vec3 col = mix(vec3(0.15, 1.0, 0.45), vec3(0.65, 0.22, 1.0), 0.24 * smoothstep(0.70, 0.98, lat));
  gl_FragColor = vec4(col * a, a);
  #include <logdepthbuf_fragment>
}