
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uT, uMode, uRealScale, uPedScale, uPedPower, uPixelRatio, uSizeMul;
attribute float a; attribute float ecc; attribute float inc; attribute float node;
attribute float peri; attribute float m0; attribute float n; attribute float psize; attribute vec3 tint;
varying vec3 vColor;
void main(){
  float M = m0 + n * uT;
  M = mod(M, 6.28318530718);
  float E = M;
  for (int i = 0; i < 5; i++) {
    E -= (E - ecc * sin(E) - M) / max(1.0 - ecc * cos(E), 0.05);
  }
  float ce = cos(E), se = sin(E);
  float xp = a * (ce - ecc);
  float yp = a * sqrt(max(1.0 - ecc * ecc, 0.0)) * se;
  float w = peri, O = node, I = inc;
  float cw = cos(w), sw = sin(w), cO = cos(O), sO = sin(O), ci = cos(I), si = sin(I);
  vec3 p;
  p.x = xp * (cw * cO - sw * sO * ci) + yp * (-sw * cO - cw * sO * ci);
  p.y = xp * (cw * sO + sw * cO * ci) + yp * (-sw * sO + cw * cO * ci);
  p.z = xp * (sw * si) + yp * (cw * si);
  float r = max(length(p), 0.0001);
  float rw = uMode < 0.5 ? r * uRealScale : uPedScale * pow(r, uPedPower);
  vec3 world = vec3(p.x, p.z, -p.y) / r * rw;
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(psize * uSizeMul * uPixelRatio * (240.0 / max(-mv.z, 0.6)), 1.0, 4.5 * uPixelRatio);
  vColor = tint;
  #include <logdepthbuf_vertex>
}