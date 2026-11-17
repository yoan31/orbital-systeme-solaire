uniform highp sampler2D depthBuffer;
uniform float uHalfLogFC;
uniform float uFocus;
uniform float uRange;
uniform float uMaxCoC;
uniform vec2 uTexel;

/* Reconstruction de la distance vue depuis la profondeur logarithmique de three :
   gl_FragDepth = log2(1 + w) / log2(far + 1), donc w = 2^(d / uHalfLogFC) - 1
   avec uHalfLogFC = 1 / log2(far + 1). */
float viewDistance(const in vec2 uv) {
  float d = texture2D(depthBuffer, uv).x;
  return pow(2.0, d / uHalfLogFC) - 1.0;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float dist = viewDistance(uv);
  float coc = clamp(abs(dist - uFocus) / max(uRange, 1e-4), 0.0, 1.0);
  coc = pow(coc, 1.4);
  float radius = coc * uMaxCoC;
  if (radius < 0.35) {
    outputColor = inputColor;
    return;
  }
  vec3 sum = inputColor.rgb * 1.5;
  float wsum = 1.5;
  for (int i = 0; i < 16; i++) {
    float t = (float(i) + 0.5) / 16.0;
    float r = sqrt(t) * radius;
    float a = float(i) * 2.39996323;
    vec2 off = vec2(cos(a), sin(a)) * r * uTexel;
    sum += texture2D(inputBuffer, uv + off).rgb;
    wsum += 1.0;
  }
  outputColor = vec4(sum / wsum, inputColor.a);
}
