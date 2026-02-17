'use client';

import { useTranslation } from 'react-i18next';
import { Camera, Shield, Zap, Users } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation('common');
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
                <p className="text-gray-400">{t('footer.tagline')}</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-gray-400">
                <Shield className="w-5 h-5" />
                <span>{t('footer.secure_private')}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Zap className="w-5 h-5" />
                <span>{t('footer.instant_results')}</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400">
                <Users className="w-5 h-5" />
                <span>{t('footer.expert_backed')}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.product')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.features')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.pricing')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.api')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.integrations')}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.about_us')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.blog')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.careers')}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t('footer.contact')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm">
                  {t('footer.copyright')}
                </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{t('footer.privacy_policy')}</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{t('footer.terms_of_service')}</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">{t('footer.cookie_policy')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
} 