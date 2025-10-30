import type { Metadata } from 'next';
import '../globals.css';
import { CartProvider } from '../../components/CartContext';

export const metadata: Metadata = {
  title: 'Dermaself - AI Skin Analysis',
  description: 'Advanced AI-powered skin analysis and personalized product recommendations',
};

// Note: Non renderizziamo <html>/<body> in un layout annidato per evitare
// mismatch di idratazione con il layout root che imposta classi/font.
export default function FastEmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="m-0 p-0 overflow-hidden">
        {children}
      </div>
    </CartProvider>
  );
}

