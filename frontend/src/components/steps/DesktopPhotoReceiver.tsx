import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DesktopPhotoReceiver({ session, onPhotoReceived }: { session: string, onPhotoReceived: (image: any) => void }) {
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'ready'>('pending');

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/photo-upload?session=${session}`);
      const data = await res.json();
      if (data.status === 'ready' && data.image) {
        setImage(data.image);
        onPhotoReceived(data.image)
        setStatus('ready');
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [session]);

  if (status === 'pending') {
    return <div className="text-white opacity-80">{t('camera:qr_code.waiting')}</div>;
  }
  return (
    <div>
      <img src={image!} alt="Uploaded" className="max-w-xs rounded" />
      <div>{t('camera:qr_code.photo_received')}</div>
    </div>
  );
}
