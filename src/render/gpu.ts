import * as THREE from 'three';
import { useStore } from '../state/store';
import type { GpuInfo } from '../state/store';

/* Détection GPU / WebGPU (affichage interface). Le rendu reste WebGL2 pour
   conserver les ShaderMaterial personnalisés et le post-traitement. */
export function detectGpu(gl: THREE.WebGLRenderer): void {
  const info: GpuInfo = { name: 'GPU inconnu', short: '—', software: false, webgpu: false, webgpuInfo: '' };
  try {
    const ctx = gl.getContext();
    const ext = ctx.getExtension('WEBGL_debug_renderer_info');
    info.name = ext ? (ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : (ctx.getParameter(ctx.RENDERER) as string) || 'WebGL2';
    info.short = /swiftshader/i.test(info.name)
      ? 'SwiftShader (logiciel)'
      : (info.name.match(/(NVIDIA|AMD|Intel|Apple|Adreno|Mali|Radeon)[^,)]*/i) || [info.name.replace(/^ANGLE \(/, '').replace(/\)$/, '').slice(0, 26)])[0];
    info.software = /swiftshader|llvmpipe|software|basic render|angle \(google/i.test(info.name) && !/nvidia|amd|intel|apple|adreno|mali/i.test(info.name);
  } catch {
    /* contexte restreint : on garde les valeurs par défaut */
  }
  useStore.getState().setGpu(info, '…');
  if (info.software) {
    useStore
      .getState()
      .pushToast('Accélération matérielle', `GPU logiciel détecté (${info.name}). Les performances et le rendu peuvent être dégradés.`, 'warn', 8000);
  }
  void (async () => {
    let state = 'WebGL2';
    try {
      const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ info?: Record<string, string> } | null> } };
      if (nav.gpu) {
        const adapter = await nav.gpu.requestAdapter();
        info.webgpu = !!adapter;
        if (adapter?.info) {
          info.webgpuInfo = [adapter.info.vendor, adapter.info.architecture, adapter.info.device, adapter.info.description].filter(Boolean).join(' ');
        }
      }
    } catch {
      /* WebGPU peut être bloqué */
    }
    state = info.webgpu ? 'WebGL2 · WebGPU dispo.' : 'WebGL2';
    useStore.getState().setGpu(info, state);
  })();
}
