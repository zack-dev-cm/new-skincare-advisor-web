'use client';

import { Camera, Shield, Zap, Users } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Dermaself</h3>
                <p className="text-gray-400">Analisi della Pelle Powered by AI</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Tecnologia AI avanzata che analizza la tua pelle e fornisce raccomandazioni 
              personalizzate per la cura della pelle. Ottieni intuizioni professionali dal comfort di casa tua.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-gray-400">
                <Shield className="w-5 h-5" />
                <span>Sicuro e Privato</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Zap className="w-5 h-5" />
                <span>Risultati Istantanei</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Users className="w-5 h-5" />
                <span>Sostenuto da Esperti</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Prodotto</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Funzionalità</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Prezzi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrazioni</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Azienda</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Chi Siamo</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carriere</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contatti</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm">
                  © 2024 Dermaself. Tutti i diritti riservati.
                </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Informativa sulla Privacy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Termini di Servizio</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">Politica sui Cookie</a>
          </div>
        </div>
      </div>
    </footer>
  );
} 