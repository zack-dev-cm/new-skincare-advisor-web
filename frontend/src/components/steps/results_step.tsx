"use client";
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RotateCcw, Sun, Moon, CalendarDays, Palette } from 'lucide-react';
import { ASSETS } from '../../lib/assets';
import { fetchProductsByVariantIds, TransformedProduct } from '../../lib/shopify-product-fetcher';
import { useCart } from '../CartContext';
// Server now returns pre-categorized and ordered modules
import { translateModuleName } from '../../lib/moduleTranslations';
// App configuration
import { useAppConfig } from '@/lib/AppConfigContext';

// Import components
import RoutineProductCard from '../RoutineProductCard';
import SkinAnalysisImage from '../SkinAnalysisImage';
import SpideringChart from '../SpideringChart';

interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  size: string;
  description: string;
  tags: string[];
  usage: 'morning' | 'evening' | 'both';
  step: 'cleanse' | 'moisturise' | 'protect' | 'addon';
  skinTypes: string[];
  shopifyProductId?: string;
  shopifyVariantId?: string;
  inStock: boolean;
  rating?: number;
  reviewCount?: number;
}

interface RoutineStep {
  step: string;
  title: string;
  products: Product[];
}

interface SkinRoutine {
  essential: RoutineStep[];
  expert: RoutineStep[];
  addons: Product[];
}

interface ResultsStepProps {
  analysisData: any;
  routine: SkinRoutine | null; // Keep for backward compatibility, but will be null
  routineType: 'essential' | 'expert';
  onRoutineTypeChange: (type: 'essential' | 'expert') => void;
  onRestart: () => void;
  capturedImage: string | null;
  activeTab: 'results' | 'routine';
  onTabChange: (tab: 'results' | 'routine') => void;
}

export default function ResultsStep({
  analysisData,
  routine,
  routineType,
  onRoutineTypeChange,
  onRestart,
  capturedImage,
  activeTab,
  onTabChange
}: ResultsStepProps) {
  const { t } = useTranslation(['analysis', 'steps']);
  // Get app configuration to determine if running in demo mode
  const appConfig = useAppConfig();
  const isDemoMode = appConfig.mode === 'demo';
  
  // State for fresh product data
  const [routineSteps, setRoutineSteps] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  // UI state: expanded alternatives per step
  const [expandedAlternatives, setExpandedAlternatives] = useState<Set<string>>(new Set());
  // UI state: category selector (skincare subcategories + makeup)
  const [selectedCategory, setSelectedCategory] = useState<'skincare_morning' | 'skincare_evening' | 'skincare_weekly' | 'makeup'>('skincare_morning');
  const toggleAlternatives = (key: string) => {
    setExpandedAlternatives(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  // Cart functionality (only used when not in demo mode)
  const { addToCart } = useCart();

  // Helper: extract a Shopify variant ID from various possible fields
  const extractVariantId = (product: any): string | null => {
    if (!product) return null;

    const candidates = [
      product.shopify_variant_id,
      product.shopify_product_id,
      product.shopify_variant_gid,
      product.shopify_product_gid,
      product.shopify_variant,
      product.shopify_product,
      product.variant_id,
      product.variantId,
      product.variant,
    ];

    const raw = candidates.find((v) => v !== undefined && v !== null && v !== 0);
    if (!raw) return null;

    let id = raw.toString();

    // If the backend already returns a Shopify GID, strip it down to the numeric ID
    if (id.startsWith('gid://shopify/ProductVariant/')) {
      const parts = id.split('/');
      id = parts[parts.length - 1];
    }

    return id;
  };

  // Scroll to top when tab changes
  useEffect(() => {
    // Find the scrollable parent container and scroll to top
    const scrollableContainer = document.querySelector('.flex-1');
    if (scrollableContainer) {
      scrollableContainer.scrollTop = 0;
    }
    // Also scroll window to top as fallback
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Fetch products from Shopify and build routine steps
  useEffect(() => {
    const fetchRoutineProducts = async () => {
      if (!analysisData?.recommendations?.skincare_routine) {
        setRoutineSteps([]);
        return;
      }

      // In demo mode, use API data directly without Shopify fetching
      if (isDemoMode) {
        console.log('🎯 Demo mode: Using products directly from API');
        
        // Transform API data to match RoutineProductCard expected structure
        const transformedSteps = analysisData.recommendations.skincare_routine.map((category: any) => {
          return category.modules.map((module: any) => {
            // Transform main product from API format to display format
            const mainFit = module.main_product?.fit ?? (module.main_product?.score != null ? Math.round(module.main_product.score * 100) : undefined);
            const mainProduct = module.main_product ? {
              title: module.main_product.product_name || 'Unknown Product',
              vendor: module.main_product.brand || '',
              images: module.main_product.image_url ? [
                { src: module.main_product.image_url, alt: module.main_product.product_name }
              ] : [],
              variants: [{
                id: '0',
                title: 'Default',
                price: module.main_product.best_price?.toString() || '0',
                inventory_quantity: 1
              }],
              body_html: module.main_product.info || module.main_product.product_description || '',
              fit: mainFit,
            } : null;

            // Transform alternative products
            const alternativeProducts = (module.alternative_products || []).map((altProd: any) => ({
              title: altProd.product_name || 'Unknown Product',
              vendor: altProd.brand || '',
              images: altProd.image_url ? [
                { src: altProd.image_url, alt: altProd.product_name }
              ] : [],
              variants: [{
                id: '0',
                title: 'Default',
                price: altProd.best_price?.toString() || '0',
                inventory_quantity: 1
              }],
              body_html: altProd.info || altProd.product_description || '',
              fit: altProd.fit ?? (altProd.score != null ? Math.round(altProd.score * 100) : undefined),
            }));

            return {
              category: category.category || 'Skincare',
              stepTitle: module.module || module.module_name || 'Step',
              mainProduct: mainProduct,
              alternativeProducts: alternativeProducts,
              whyPicked: module.main_product?.why_picked || ''
            };
          });
        }).flat();

        setRoutineSteps(transformedSteps);
        setIsLoadingProducts(false);
        return;
      }

      setIsLoadingProducts(true);
      
      try {
        // Collect all variant IDs from main and alternative products
        const allVariantIds: string[] = [];
        const productMapping: { [variantId: string]: { type: 'main' | 'alternative', categoryIndex: number, moduleIndex: number, productIndex?: number } } = {};

        console.log('=== RESULTS STEP - EXTRACTING VARIANT IDS ===');
        console.log('Raw skincare_routine:', analysisData.recommendations.skincare_routine);

        analysisData.recommendations.skincare_routine.forEach((category: any, categoryIndex: number) => {
          console.log(`Category ${categoryIndex}:`, category.category);
          category.modules.forEach((module: any, moduleIndex: number) => {
            console.log(`Module ${moduleIndex}:`, module.module);
            console.log('Main product:', module.main_product);
            
            // Main product
            const mainVariantId = extractVariantId(module.main_product);
            if (mainVariantId) {
              console.log('Found main product variant ID:', mainVariantId);
              allVariantIds.push(mainVariantId);
              productMapping[mainVariantId] = { type: 'main', categoryIndex, moduleIndex };
            } else {
              console.log('No Shopify variant ID found for main product', module.main_product);
            }

            // Alternative products
            if (module.alternative_products) {
              console.log('Alternative products:', module.alternative_products);
              module.alternative_products.forEach((altProduct: any, productIndex: number) => {
                console.log(`Alternative product ${productIndex}:`, altProduct);
                const altVariantId = extractVariantId(altProduct);
                if (altVariantId) {
                  console.log('Found alternative product variant ID:', altVariantId);
                  allVariantIds.push(altVariantId);
                  productMapping[altVariantId] = {
                    type: 'alternative',
                    categoryIndex,
                    moduleIndex,
                    productIndex,
                  };
                } else {
                  console.log(`No Shopify variant ID found for alternative product ${productIndex}`, altProduct);
                }
              });
            }
          });
        });

        console.log('All variant IDs collected:', allVariantIds);
        console.log('Product mapping:', productMapping);

        // Fetch all products from Shopify
        const shopifyProducts = await fetchProductsByVariantIds(allVariantIds);
        // Build fast lookup map by variant id (string form)
        const variantIdToProduct = new Map<string, TransformedProduct>();
        for (const p of shopifyProducts) {
          for (const v of p.variants) {
            variantIdToProduct.set(v.id.toString(), p);
          }
        }
        
        console.log('=== SHOPIFY PRODUCTS FETCHED ===');
        console.log('Number of products fetched:', shopifyProducts.length);
        console.log('Fetched products:', shopifyProducts);
        
        // Debug: Show all variant IDs from fetched products
        const allFetchedVariantIds = shopifyProducts.flatMap(p => p.variants.map(v => v.id));
        console.log('All fetched variant IDs:', allFetchedVariantIds);
        console.log('Requested variant IDs:', allVariantIds);
        console.log('Variant ID types - requested:', allVariantIds.map(id => typeof id));
        console.log('Variant ID types - fetched:', allFetchedVariantIds.map(id => typeof id));
        
        // Test matching
        const matchingIds = allVariantIds.filter(requestedId => 
          allFetchedVariantIds.some(fetchedId => 
            requestedId.toString() === fetchedId.toString()
          )
        );
        console.log('Matching variant IDs found:', matchingIds);
        console.log('Number of matches:', matchingIds.length, 'out of', allVariantIds.length);
        
        // Build routine steps with fetched products
        let globalStepNumber = 1;
        const steps: any[] = [];

        analysisData.recommendations.skincare_routine.forEach((category: any, categoryIndex: number) => {
          category.modules.forEach((module: any, moduleIndex: number) => {
            console.log(`\n=== PROCESSING MODULE ${moduleIndex} ===`);
            console.log('Module:', module.module);
            console.log('Main product variant ID:', module.main_product?.shopify_product_id);
            
            // Find main product
            const mainProductVariantId = module.main_product?.shopify_product_id;
            console.log('Looking for variant ID:', mainProductVariantId, 'type:', typeof mainProductVariantId);
            
            const mainProductRaw = mainProductVariantId
              ? variantIdToProduct.get(mainProductVariantId.toString()) || null
              : null;

            console.log('Found main product:', mainProductRaw);
            if (mainProductRaw) {
              console.log('Main product images:', mainProductRaw.images);
            }

            const mainProductFit = module.main_product?.fit ?? (module.main_product?.score != null ? Math.round(module.main_product.score * 100) : undefined);
            const mainProduct = mainProductRaw ? { ...mainProductRaw, fit: mainProductFit } : null;

            // Find alternative products
            const alternativeProducts: TransformedProduct[] = [];
            if (module.alternative_products) {
              module.alternative_products.forEach((altProduct: any) => {
                if (altProduct.shopify_product_id) {
                  console.log('Looking for alternative variant ID:', altProduct.shopify_product_id);
                  const altShopifyProduct = variantIdToProduct.get(altProduct.shopify_product_id.toString()) || null;
                  if (altShopifyProduct) {
                    console.log('✅ Found alternative product:', altShopifyProduct.title);
                    const altFit = altProduct.fit ?? (altProduct.score != null ? Math.round(altProduct.score * 100) : undefined);
                    alternativeProducts.push({ ...altShopifyProduct, fit: altFit });
                  } else {
                    console.log('❌ Alternative product not found for variant:', altProduct.shopify_product_id);
                  }
                }
              });
            }

            console.log('Alternative products found:', alternativeProducts.length);

            if (mainProduct) {
              const whyPicked = module.why_picked || module.reason || module.description || (mainProduct?.body_html ? mainProduct.body_html.replace(/<[^>]*>/g, '').substring(0, 400) : '');
              const moduleName: string = module.module || 'Skincare Step';

              // Category is already decided server-side
              const catKey = (category.category || 'skincare_morning').toLowerCase();
                const step = {
                  stepNumber: globalStepNumber,
                  stepTitle: moduleName,
                  category: catKey, // 'skincare_morning' | 'skincare_evening' | 'skincare_weekly' | 'makeup'
                  mainProduct,
                  alternativeProducts,
                  whyPicked,
                  allProducts: [mainProduct, ...alternativeProducts].filter(Boolean)
                };
                steps.push(step);
                globalStepNumber++;
              
            } else {
              console.log('No main product found, skipping step');
            }
          });
        });

        // Server already provides ordered modules; keep API order
        setRoutineSteps(steps);
      } catch (error) {
        console.error('Failed to fetch routine products:', error);
        setRoutineSteps([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchRoutineProducts();
  }, [analysisData?.recommendations, isDemoMode]);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'results' && (
          <div className="bg-white min-h-full">
            {/* AI Photo Analysis Section */}
            <div className="p-6">
              <div className="relative">
                <div className="text-center">
                  {/* Analysis Image */}
                  <div className="relative mb-6">
                    <SkinAnalysisImage 
                      imageUrl={analysisData?.base64 || capturedImage || analysisData?.image_url || ''} 
                      analysisData={analysisData}
                    />
                  </div>

                  {/* Spidering Chart */}
                  {analysisData && (
                    <div className="mb-6">
                      <SpideringChart 
                        analysisData={analysisData} 
                        userAge={30} 
                        userGender={analysisData?.userData?.gender || 'female'}
                        ageRange={analysisData?.userData?.ageRange || analysisData?.userData?.age_range || '26-35'}
                      />
                    </div>
                  )}

                  {/* Analysis Results */}
                  {analysisData && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">{t('analysis:results_labels.analysis_title')}</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{t('analysis:results_labels.skin_type')}</span>
                          <span className="text-sm font-semibold text-primary-600">
                            {(() => {
                              const raw = analysisData.userData?.skin_type;
                              if (!raw) return t('steps:skin_type.normal');
                              const lower = raw.toLowerCase().replace(/\s+/g, '_');
                              const legacyMap: Record<string, string> = {
                                normale: 'normal', secca: 'dry', grassa: 'oily', mista: 'combination',
                                normal: 'normal', dry: 'dry', oily: 'oily', combination: 'combination',
                                dont_know: 'dont_know', no_lo_sé: 'dont_know', no_lo_se: 'dont_know',
                              };
                              const key = legacyMap[lower] ?? lower;
                              const known = ['normal', 'dry', 'oily', 'combination', 'dont_know'];
                              if (known.includes(key)) return t(`steps:skin_type.${key}`);
                              return raw;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{t('analysis:results_labels.acne_classification')}</span>
                          <span className="text-sm font-semibold text-primary-600">
                            {analysisData['acne-classification'] || analysisData.acneFullData?.['acne-classification'] || t('analysis:results_labels.none_detected')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{t('analysis:results_labels.acne_severity')}</span>
                          <span className="text-sm font-semibold text-primary-600">
                            {analysisData['acne-severity'] || analysisData.acneFullData?.['acne-severity'] || t('analysis:results_labels.none')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{t('analysis:results_labels.redness')}</span>
                          <span className="text-sm font-semibold text-primary-600">
                            {analysisData.laxityRednessData?.predictions?.redness?.class || t('analysis:results_labels.not_detected')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{t('analysis:results_labels.wrinkles')}</span>
                          <span className="text-sm font-semibold text-primary-600">
                            {analysisData.wrinklesData?.wrinkleSeverity?.overall?.severity 
                              ? t('analysis:results_labels.level_severity', { level: analysisData.wrinklesData.wrinkleSeverity.overall.severity })
                              : analysisData.wrinkles?.severity || t('analysis:results_labels.none_detected')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{t('analysis:results_labels.dryness')}</span>
                          <span className="text-sm font-semibold text-primary-600">
                            {analysisData.laxityRednessData?.predictions?.dryness?.class || t('analysis:results_labels.not_detected_f')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-primary-50 rounded-xl">
                          <span className="text-sm font-medium text-gray-700">{t('analysis:results_labels.laxity')}</span>
                          <span className="text-sm font-semibold text-primary-600">
                            {analysisData.laxityRednessData?.predictions?.laxity?.class || t('analysis:results_labels.not_detected_f')}
                          </span>
                        </div>
                        <div className="p-3 bg-gradient-to-r from-primary-100 to-primary-200 rounded-xl">
                          <span className="text-sm font-medium text-gray-700 block mb-1">{t('analysis:results_labels.recommendations')}</span>
                          <span className="text-sm text-gray-600">
                            {typeof analysisData.recommendations === 'string' 
                              ? analysisData.recommendations 
                              : analysisData.recommendations?.skincare_routine 
                                ? t('analysis:results_labels.custom_categories', { count: analysisData.recommendations.skincare_routine.length }) 
                                : t('analysis:results_labels.suggested_routine')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="bg-white min-h-full p-6">
            {/* Category Selector */}
            <div className="mb-4 sticky top-0 z-30 bg-transparent py-2 flex justify-center">
                      <div className="flex space-x-2 bg-white rounded-lg p-1 shadow-sm border border-primary-100">
                {/* Skincare Morning */}
                <button
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'skincare_morning' ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'}`}
                  onClick={() => setSelectedCategory('skincare_morning')}
                  title={t('analysis:results_labels.skincare_morning')}
                >
                  <Sun className="w-4 h-4" />
                  {selectedCategory === 'skincare_morning' && <span>{t('analysis:results_labels.skincare')}</span>}
                </button>
                {/* Skincare Evening */}
                <button
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'skincare_evening' ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'}`}
                  onClick={() => setSelectedCategory('skincare_evening')}
                  title={t('analysis:results_labels.skincare_evening')}
                >
                  <Moon className="w-4 h-4" />
                  {selectedCategory === 'skincare_evening' && <span>{t('analysis:results_labels.skincare')}</span>}
                </button>
                {/* Skincare Weekly */}
                <button
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'skincare_weekly' ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'}`}
                  onClick={() => setSelectedCategory('skincare_weekly')}
                  title={t('analysis:results_labels.skincare_weekly')}
                >
                  <CalendarDays className="w-4 h-4" />
                  {selectedCategory === 'skincare_weekly' && <span>{t('analysis:results_labels.weekly')}</span>}
                </button>
                {/* Makeup */}
                <button
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-1 ${selectedCategory === 'makeup' ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow' : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'}`}
                  onClick={() => setSelectedCategory('makeup')}
                >
                  <Palette className="w-4 h-4" />
                  {selectedCategory === 'makeup' && <span>{t('analysis:results_labels.makeup')}</span>}
                </button>
              </div>
            </div>
            
            {/* Loading State */}
            {isLoadingProducts ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-lg border border-primary-100 p-6">
                    <div className="animate-pulse">
                      <div className="h-8 bg-primary-200 rounded mb-4"></div>
                      <div className="h-32 bg-primary-100 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Routine Steps */
              <div className="space-y-6">
                {routineSteps && routineSteps.length > 0 ? (
                  routineSteps
                    .filter(step => (step.category || '').toLowerCase() === selectedCategory)
                    .map((step, index, arr) => (
                      <div key={`${step.category}-${index + 1}`} className="bg-white rounded-2xl shadow-lg border border-primary-100 p-6">
                      <div className="space-y-3">
                        <RoutineProductCard
                          product={step.mainProduct as any}
                          stepNumber={index + 1}
                          stepTitle={step.stepTitle}
                          categoryTitle={
                            selectedCategory === 'makeup' ? t('analysis:results_labels.makeup') : (selectedCategory === 'skincare_weekly' ? t('analysis:results_labels.skincare_weekly') : t('analysis:results_labels.skincare'))
                          }
                          isLastStep={index === arr.length - 1}
                          showAddAllButton={index === arr.length - 1}
                        // new UI props
                          whyPicked={step.whyPicked}
                          alternatives={step.alternativeProducts as any}
                          alternativesExpanded={expandedAlternatives.has(`${step.category}-${index + 1}`)}
                          onToggleAlternatives={() => toggleAlternatives(`${step.category}-${index + 1}`)}
                          onAddAllToCart={isDemoMode ? undefined : async () => {
                            // Add all main products (filtered list) to cart
                            for (const routineStep of arr) {
                              if (routineStep.mainProduct && routineStep.mainProduct.variants[0]) {
                                try {
                                  const variantId = `gid://shopify/ProductVariant/${routineStep.mainProduct.variants[0].id}`;
                                  const productInfo = {
                                    name: routineStep.mainProduct.title,
                                    image: routineStep.mainProduct.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
                                    price: parseFloat(routineStep.mainProduct.variants[0].price) * 100
                                  };

                                  const customAttributes = [
                                    { key: 'source', value: 'dermaself_recommendation' },
                                    { key: 'recommendation_type', value: 'skin_analysis' },
                                    { key: 'product_step', value: routineStep.category.toLowerCase().replace(/\s+/g, '_') },
                                    { key: 'added_at', value: new Date().toISOString() }
                                  ];

                                  await addToCart(variantId, 1, customAttributes, productInfo);
                                } catch (error) {
                                  console.error('Failed to add product to cart:', error);
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg border border-primary-100 p-8 text-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💄</span>
                    </div>
                    <p className="text-gray-600 font-medium">{t('analysis:results_labels.no_routine_data')}</p>
                    <p className="text-sm text-gray-400 mt-2">{t('analysis:results_labels.please_retry_analysis')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restart Button */}
      <div className="p-6 bg-white border-t border-primary-100">
        <motion.button
          onClick={onRestart}
          className="w-full py-4 px-6 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-2xl hover:from-primary-700 hover:to-primary-600 transition-all duration-300 flex items-center justify-center shadow-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          {t('analysis:results_labels.start_new_analysis')}
        </motion.button>
      </div>
    </motion.div>
  );
}
