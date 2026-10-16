let cached: boolean | null = null;

/** Returns true when the browser can create a WebGL context. Cached after first call. */
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    cached = !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch {
    cached = false;
  }
  return cached;
}
