'use client';

/**
 * MINIMAL LOADER - Ultra-leggero per fast embed
 * 
 * Usa solo CSS puro (no framer-motion) per ridurre bundle size
 * Rendering istantaneo senza dipendenze pesanti
 */
export default function MinimalLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="text-center">
        {/* Spinner CSS puro */}
        <div className="inline-block w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
        
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Dermaself
        </h2>
        <p className="text-sm text-gray-600">
          Preparando l'analisi...
        </p>
      </div>
    </div>
  );
}

