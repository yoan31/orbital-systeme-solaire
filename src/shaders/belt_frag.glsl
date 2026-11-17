
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 vColor;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float m = smoothstep(0.5, 0.16, length(d));
  if (m < 0.01) discard;
  gl_FragColor = vec4(vColor, m * 0.72);
  #include <logdepthbuf_fragment>
}