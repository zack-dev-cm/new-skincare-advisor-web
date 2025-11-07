// Ensures TensorFlow.js backend is initialized once on the client.
// Caches the initialization to avoid repeated work.

let tfReadyPromise: Promise<void> | null = null;

export async function ensureTfBackendReady(): Promise<void> {
  if (typeof window === 'undefined') return; // SSR no-op
  if (tfReadyPromise) return tfReadyPromise;

  tfReadyPromise = (async () => {
    // Import TFJS core and backends dynamically
    const tf = await import('@tensorflow/tfjs-core');
    try {
      // Prefer WebGL backend when available
      await import('@tensorflow/tfjs-backend-webgl');
    } catch {
      // ignore
    }
    try {
      // Ensure CPU backend exists as fallback
      await import('@tensorflow/tfjs-backend-cpu');
    } catch {
      // ignore
    }

    try {
      // Try WebGL first, fallback to CPU
      await tf.setBackend('webgl');
    } catch {
      await tf.setBackend('cpu');
    }
    await tf.ready();
  })();

  return tfReadyPromise;
}


