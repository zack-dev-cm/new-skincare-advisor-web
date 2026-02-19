'use client';

import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TypingEffect from './TypingEffect';
import RandomCircles from './RandomCircles';

interface UploadingScreenProps {
  imageUrl: string;
  /** Se true, la preview è contenuta nel contenitore (modal) invece che a schermo intero */
  contained?: boolean;
}

export default function UploadingScreen({ imageUrl, contained = false }: UploadingScreenProps) {
  const { t } = useTranslation('analysis');
  const photoContainerRef = useRef<HTMLDivElement>(null);
  const [containerRect, setContainerRect] = useState({ width: 0, height: 0, top: 0, left: 0 });

  useEffect(() => {
    if (!contained || !photoContainerRef.current) return;
    const el = photoContainerRef.current;
    const updateRect = () => {
      const r = el.getBoundingClientRect();
      setContainerRect({ width: r.width, height: r.height, top: r.top, left: r.left });
    };
    updateRect();
    const ro = new ResizeObserver(updateRect);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contained]);

  if (contained) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
        {/* Area preview foto: contenuta, non a tutto schermo */}
        <div
          ref={photoContainerRef}
          className="flex-1 min-h-0 flex items-center justify-center p-4 relative bg-gray-50"
        >
          <>
            <div className="relative inline-block max-w-full max-h-full flex-shrink-0">
              <img
              src={imageUrl}
              alt="Captured"
              className="relative z-0 block max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-md"
            />
            <div className="scanner-contained absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden" />
            {containerRect.width > 0 ? (
              <div className="absolute z-20 pointer-events-none rounded-xl overflow-hidden inset-[10%]">
                <RandomCircles numCircles={8} minSize={4} maxSize={8} speed={0.7} color="#0092FF" />
              </div>
            ) : null}
            </div>
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none px-4">
            <div className="text-gray-800 text-lg md:text-xl font-medium text-center drop-shadow-sm">
              <TypingEffect
                baseContent={t('uploading.we_are_analyzing')}
                typingEffectContent={[
                  t('uploading.wrinkles'),
                  t('uploading.pores'),
                  t('uploading.eye_area'),
                  t('uploading.pigmentation'),
                  t('uploading.acne'),
                  t('uploading.hydration'),
                  t('uploading.redness'),
                  t('uploading.translucency'),
                  '',
                ]}
                typingSpeed={120}
                delayBetween={800}
              />
            </div>
            </div>
          </>
        </div>
      </div>
    );
  }

  /* Modalità legacy full-screen (non usata se sempre contained) */
  return (
    <div className="absolute inset-0 z-30 bg-white flex flex-col items-center justify-center text-center overflow-hidden">
      <img
        src={imageUrl}
        alt="Captured"
        className="absolute inset-0 w-full h-full object-cover opacity-30"
        aria-hidden
      />
      <div className="absolute z-40 text-gray-800 text-lg md:text-xl font-medium">
        <TypingEffect
          baseContent={t('uploading.we_are_analyzing')}
          typingEffectContent={[
            t('uploading.wrinkles'),
            t('uploading.pores'),
            t('uploading.eye_area'),
            t('uploading.pigmentation'),
            t('uploading.acne'),
            t('uploading.hydration'),
            t('uploading.redness'),
            t('uploading.translucency'),
            '',
          ]}
          typingSpeed={120}
          delayBetween={800}
        />
      </div>
    </div>
  );
}
