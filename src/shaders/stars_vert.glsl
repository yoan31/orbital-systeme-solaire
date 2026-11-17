#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 color;
attribute float aPhase;
attribute float aSpeed;
attribute float aBright;
uniform float uTime;
uniform float uSize;
varying vec3 vColor;
varying float vTwinkle;
void main(){
  vColor = color;
  // Scintillement : amplitude et fréquence dérivées d'un hash de la position,
  // donc stables d'une image à l'autre sans attribute supplémentaire par étoile.
  vTwinkle = 0.75 + 0.25 * sin(uTime * aSpeed + aPhase) * aBright;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.7 + 0.6 * aBright);
  #include <logdepthbuf_vertex>
}
