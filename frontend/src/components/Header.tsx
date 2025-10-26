'use client';

import Image from 'next/image';
import { Sparkles, Heart } from 'lucide-react';
import CartIcon from './CartIcon';
import LogoWhite from '../app/RGB_Logo_White.png';

export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src={LogoWhite} alt="Dermaself" className="h-8 w-auto" priority />
            <span className="sr-only">Dermaself</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors">
              Funzionalità
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-primary-600 transition-colors">
              Come Funziona
            </a>
            <a href="#about" className="text-gray-600 hover:text-primary-600 transition-colors">
              Chi Siamo
            </a>
          </nav>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 transition-colors">
              <Heart className="w-5 h-5" />
              <span className="hidden sm:inline">Preferiti</span>
            </button>
            <CartIcon />
            <button className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              <Sparkles className="w-5 h-5" />
              <span>Prova Analisi</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 