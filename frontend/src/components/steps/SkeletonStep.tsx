'use client';

/**
 * SKELETON UI - Rendering istantaneo per instant feedback
 * Usa solo CSS, nessuna dipendenza pesante
 */
export default function SkeletonStep() {
  return (
    <div className="h-full flex flex-col bg-white animate-pulse">
      {/* Skeleton header */}
      <div className="p-6">
        <div className="h-8 bg-primary-200 rounded-lg w-3/4 mx-auto mb-4"></div>
        <div className="h-4 bg-primary-100 rounded w-1/2 mx-auto"></div>
      </div>
      
      {/* Skeleton content */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 h-32">
              <div className="h-16 bg-primary-100 rounded-lg mb-2"></div>
              <div className="h-4 bg-primary-50 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Skeleton footer */}
      <div className="p-6">
        <div className="h-12 bg-primary-200 rounded-lg w-full"></div>
      </div>
    </div>
  );
}

