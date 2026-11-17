#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vColor;
varying float vTwinkle;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  float core = smoothstep(0.5, 0.0, r);
  float halo = exp(-r * r * 26.0);
  float a = (core * 0.75 + halo * 0.5) * vTwinkle;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * (0.9 + 0.5 * vTwinkle), a);
  #include <logdepthbuf_fragment>
}
