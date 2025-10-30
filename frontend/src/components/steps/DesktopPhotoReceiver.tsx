import { useEffect, useState } from 'react';

export default function DesktopPhotoReceiver({ session, onPhotoReceived }: { session: string, onPhotoReceived: (image: any) => void }) {
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
    return <div className="text-white opacity-80">The results will be shown here</div>;
  }
  return (
    <div>
      <img src={image!} alt="Uploaded" className="max-w-xs rounded" />
      <div>Photo received! Continue your experience.</div>
    </div>
  );
}
