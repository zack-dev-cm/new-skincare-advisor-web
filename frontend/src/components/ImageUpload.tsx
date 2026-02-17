'use client';

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void;
}

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const { t } = useTranslation('common');
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    if (acceptedFiles.length === 0) {
      setError(t('upload.invalid_file_type'));
      return;
    }

    const file = acceptedFiles[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('upload.please_valid_image'));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('upload.image_size'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelect(result);
      }
    };
    reader.readAsDataURL(file);
  }, [onImageSelect, t]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject 
            ? 'border-primary-500 bg-primary-50' 
            : isDragReject 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              ${isDragActive && !isDragReject 
                ? 'bg-primary-100' 
                : isDragReject 
                ? 'bg-red-100' 
                : 'bg-gray-100'
              }
            `}>
              {isDragReject ? (
                <AlertCircle className="w-8 h-8 text-red-500" />
              ) : (
                <Upload className="w-8 h-8 text-gray-600" />
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isDragActive 
                  ? isDragReject 
                    ? t('upload.invalid_file') 
                    : t('upload.drop_here')
                  : t('upload.upload_photo')
                }
              </p>
              <p className="text-sm text-gray-500">
                {isDragActive 
                  ? isDragReject 
                    ? t('upload.valid_file')
                    : t('upload.release_upload')
                  : t('upload.drag_drop')
                }
              </p>
            </div>
            
            {!isDragActive && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Image className="w-4 h-4" />
                <span>{t('upload.file_types')}</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
        >
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700 text-sm">{error}</span>
        </motion.div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          {t('upload.best_results')}
        </p>
      </div>
    </div>
  );
} 