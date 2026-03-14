import type { Metadata, Viewport } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/Providers';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Dermaself - AI Skin Analysis',
  description: 'Advanced AI-powered skin analysis and personalized product recommendations',
  icons: {
    icon: 'https://www.shiseido.it/on/demandware.static/Sites-shiseido_global_it-Site/-/default/dw31ce404d/images/favicon.ico?frz-v=155',
  },
  keywords: 'skin analysis, AI, skincare, beauty, dermatology, personalized recommendations',
  authors: [{ name: 'Dermaself Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Dermaself - AI Skin Analysis',
    description: 'Advanced AI-powered skin analysis and personalized product recommendations',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dermaself - AI Skin Analysis',
    description: 'Advanced AI-powered skin analysis and personalized product recommendations',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"></script>
      </head>
      <body className={spaceGrotesk.className}>
        <Providers>
          <div className="min-h-screen">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
