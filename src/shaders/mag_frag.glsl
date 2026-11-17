
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor; uniform float uOpacity;
varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(N, V)), 2.8);
  gl_FragColor = vec4(uColor, fres * uOpacity);
  #include <logdepthbuf_fragment>
}