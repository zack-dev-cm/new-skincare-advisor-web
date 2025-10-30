'use client';

import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, ArrowLeft, Share2, Download, Heart, ShoppingCart } from 'lucide-react';
import { AnalysisResult, SkinConcern } from './SkinAnalysis';
import SkinAnalysisImage from './SkinAnalysisImage';
import SkincareRoutineCard from './SkincareRoutineCard';
import { useCart } from './CartContext';
import { fetchProductsByVariantIds, TransformedProduct } from '../lib/shopify-product-fetcher';
import { translateModuleName } from '../lib/moduleTranslations';
import { useState, useEffect } from 'react';

interface AnalysisResultsProps {
  result: AnalysisResult;
  onReset: () => void;
}

export default function AnalysisResults({ result, onReset }: AnalysisResultsProps) {
  const { addToCart, state } = useCart();
  const [routineSteps, setRoutineSteps] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Fetch products from Shopify and build routine steps
  useEffect(() => {
    const fetchRoutineProducts = async () => {
      if (!result.productRecommendations?.skincare_routine) {
        setRoutineSteps([]);
        return;
      }

      setIsLoadingProducts(true);
      
      try {
        // Collect all variant IDs from main and alternative products
        const allVariantIds: string[] = [];
        const productMapping: { [variantId: string]: { type: 'main' | 'alternative', categoryIndex: number, moduleIndex: number, productIndex?: number } } = {};

        console.log('=== ANALYSIS RESULTS - EXTRACTING VARIANT IDS ===');
        console.log('Raw skincare_routine:', result.productRecommendations.skincare_routine);

        result.productRecommendations.skincare_routine.forEach((category: any, categoryIndex: number) => {
          console.log(`Category ${categoryIndex}:`, category.category);
          category.modules.forEach((module: any, moduleIndex: number) => {
            console.log(`Module ${moduleIndex}:`, module.module);
            console.log('Main product:', module.main_product);
            
            // Main product
            if (module.main_product?.shopify_product_id) {
              const variantId = module.main_product.shopify_product_id;
              console.log('Found main product variant ID:', variantId);
              allVariantIds.push(variantId);
              productMapping[variantId] = { type: 'main', categoryIndex, moduleIndex };
            } else {
              console.log('No shopify_product_id found for main product');
            }

            // Alternative products
            if (module.alternative_products) {
              console.log('Alternative products:', module.alternative_products);
              module.alternative_products.forEach((altProduct: any, productIndex: number) => {
                console.log(`Alternative product ${productIndex}:`, altProduct);
                if (altProduct.shopify_product_id) {
                  const variantId = altProduct.shopify_product_id;
                  console.log('Found alternative product variant ID:', variantId);
                  allVariantIds.push(variantId);
                  productMapping[variantId] = { type: 'alternative', categoryIndex, moduleIndex, productIndex };
                } else {
                  console.log(`No shopify_product_id found for alternative product ${productIndex}`);
                }
              });
            }
          });
        });

        console.log('All variant IDs collected:', allVariantIds);
        console.log('Product mapping:', productMapping);

        // Fetch all products from Shopify
        const shopifyProducts = await fetchProductsByVariantIds(allVariantIds);
        
        console.log('=== SHOPIFY PRODUCTS FETCHED ===');
        console.log('Number of products fetched:', shopifyProducts.length);
        console.log('Fetched products:', shopifyProducts);
        
        // Build routine steps with fetched products
        let globalStepNumber = 1;
        const steps: any[] = [];

        result.productRecommendations.skincare_routine.forEach((category: any, categoryIndex: number) => {
          category.modules.forEach((module: any, moduleIndex: number) => {
            console.log(`\n=== PROCESSING MODULE ${moduleIndex} ===`);
            console.log('Module:', module.module);
            console.log('Main product variant ID:', module.main_product?.shopify_product_id);
            
            // Find main product
            const mainProductVariantId = module.main_product?.shopify_product_id;
            const mainProduct = mainProductVariantId 
              ? shopifyProducts.find(p => p.variants.some(v => v.id === mainProductVariantId))
              : null;

            console.log('Found main product:', mainProduct);
            if (mainProduct) {
              console.log('Main product images:', mainProduct.images);
            }

            // Find alternative products
            const alternativeProducts: TransformedProduct[] = [];
            if (module.alternative_products) {
              module.alternative_products.forEach((altProduct: any) => {
                if (altProduct.shopify_product_id) {
                  const altShopifyProduct = shopifyProducts.find(p => 
                    p.variants.some(v => v.id === altProduct.shopify_product_id)
                  );
                  if (altShopifyProduct) {
                    alternativeProducts.push(altShopifyProduct);
                  }
                }
              });
            }

            console.log('Alternative products found:', alternativeProducts.length);

            if (mainProduct) {
              const step = {
                stepNumber: globalStepNumber,
                stepTitle: `STEP ${globalStepNumber}: ${translateModuleName(module.module?.toUpperCase() || 'SKINCARE STEP')}`,
                category: category.category, // Use category from JSON for section title
                mainProduct,
                alternativeProducts,
                allProducts: [mainProduct, ...alternativeProducts].filter(Boolean)
              };
              
              steps.push(step);
              globalStepNumber++;
              console.log('Step created successfully');
            } else {
              console.log('No main product found, skipping step');
            }
          });
        });

        setRoutineSteps(steps);
      } catch (error) {
        console.error('Failed to fetch routine products:', error);
        setRoutineSteps([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchRoutineProducts();
  }, [result.productRecommendations]);


  // Handle adding all products to cart
  const handleAddAllToCart = async () => {
    const allProducts = routineSteps
      .map((step: any) => step.mainProduct)
      .filter(Boolean);

    for (const product of allProducts) {
      if (product && product.variants[0]) {
        try {
          const variantId = `gid://shopify/ProductVariant/${product.variants[0].id}`;
          const productInfo = {
            name: product.title,
            image: product.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
            price: parseFloat(product.variants[0].price) * 100
          };
          
          await addToCart(variantId, 1, [
            {
              key: 'source',
              value: 'dermaself_recommendation'
            },
            {
              key: 'recommendation_type',
              value: 'skin_analysis_routine'
            },
            {
              key: 'added_at',
              value: new Date().toISOString()
            }
          ], productInfo);
        } catch (error) {
          console.error('Failed to add product to cart:', error);
        }
      }
    }
  };

  // Handle adding alternative product to cart
  const handleAddAlternativeToCart = async (product: any) => {
    if (!product || !product.variants[0]) return;

    try {
      const variantId = `gid://shopify/ProductVariant/${product.variants[0].id}`;
      const productInfo = {
        name: product.title,
        image: product.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product',
        price: parseFloat(product.variants[0].price) * 100
      };
      
      await addToCart(variantId, 1, [
        {
          key: 'source',
          value: 'dermaself_recommendation'
        },
        {
          key: 'recommendation_type',
          value: 'skin_analysis_alternative'
        },
        {
          key: 'added_at',
          value: new Date().toISOString()
        }
      ], productInfo);
    } catch (error) {
      console.error('Failed to add alternative product to cart:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          I Risultati della Tua Analisi della Pelle
        </h2>
        <p className="text-gray-600">
          Basato sull'analisi AI della tua pelle, ecco le tue intuizioni personalizzate
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Image Analysis */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="card">
            {/* Enhanced Skin Analysis Image */}
            {result.rawAnalysisData ? (
              <SkinAnalysisImage
                imageUrl={result.imageUrl}
                analysisData={{
                  predictions: result.rawAnalysisData.predictions || [],
                  erythema: result.rawAnalysisData.redness?.erythema || false,
                  wrinkles: result.rawAnalysisData.wrinkles || undefined,
                  image: result.rawAnalysisData.image || { width: 0, height: 0 }
                }}
                className="mb-4"
              />
            ) : (
              // Fallback to simple image display
              <div className="relative mb-4">
                <img
                  src={result.imageUrl}
                  alt="Analyzed skin"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded-full p-2">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
              </div>
            )}

            {/* Health Score */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Salute Generale della Pelle
              </h3>
              <div className={`text-4xl font-bold mb-2 ${getHealthScoreColor(result.overallHealth)}`}>
                {result.overallHealth}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    result.overallHealth >= 80 ? 'bg-green-500' :
                    result.overallHealth >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.overallHealth}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {result.overallHealth >= 80 ? 'Eccellente salute della pelle!' :
                 result.overallHealth >= 60 ? 'Buona salute della pelle con margine di miglioramento' :
                 'Alcune preoccupazioni rilevate - vedi le raccomandazioni qui sotto'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Concerns and Recommendations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Skin Concerns */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Preoccupazioni della Pelle Rilevate
            </h3>
            
            {result.concerns.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600">Nessuna preoccupazione significativa della pelle rilevata!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {result.concerns.map((concern, index) => (
                  <motion.div
                    key={concern.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(concern.severity)}`}>
                          {getSeverityIcon(concern.severity)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{concern.name}</h4>
                          <p className="text-sm text-gray-600">{concern.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {Math.round(concern.confidence)}% confidenza
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(concern.severity)}`}>
                          gravità {concern.severity}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Text Recommendations */}
          <div className="card">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Raccomandazioni Personalizzate
            </h3>
            
            <div className="space-y-3">
              {Array.isArray(result.recommendations) ? (
                result.recommendations.map((recommendation, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-primary-50 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700">{recommendation}</p>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start space-x-3 p-3 bg-primary-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-primary-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-700">
                    {typeof result.recommendations === 'string' 
                      ? result.recommendations 
                      : 'Routine personalizzata generata basata sulla tua analisi'}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

             {/* Product Recommendations Section */}
       {(routineSteps.length > 0 || isLoadingProducts) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              La Tua Routine di Cura della Pelle Personalizzata
            </h3>
            <p className="text-gray-600">
              Basato sulla tua analisi della pelle, ecco i prodotti che raccomandiamo per la tua routine
            </p>
            {isLoadingProducts ? (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-primary-700">Caricamento prodotti da Shopify...</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-700">
                  Trovati {routineSteps.length} prodotti principali e{' '}
                  {routineSteps.reduce((total: number, step: any) => total + step.alternativeProducts.length, 0)} prodotti alternativi
                </p>
              </div>
            )}
           </div>

          <div className="space-y-8">
            {routineSteps.map((step: any, index: number) => (
              <motion.div
                key={`${step.category}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
              >
                {step.mainProduct && (
                  <SkincareRoutineCard
                    categoryTitle={step.category}
                    mainProduct={step.mainProduct}
                    alternativeProducts={step.alternativeProducts}
                    stepNumber={step.stepNumber}
                    isLastStep={index === routineSteps.length - 1}
                    showAddAllButton={index === routineSteps.length - 1}
                    onAddAllToCart={handleAddAllToCart}
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Alternative Products Section */}
          {routineSteps.some((step: any) => step.alternativeProducts.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="card"
            >
              <h4 className="text-xl font-semibold text-gray-900 mb-4">
                Prodotti Alternativi
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {routineSteps.map((step: any, stepIndex: number) => 
                  step.alternativeProducts.map((product: any, productIndex: number) => (
                    <motion.div
                      key={`alt-${stepIndex}-${productIndex}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + (stepIndex + productIndex) * 0.1 }}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={product.images[0]?.src || 'https://via.placeholder.com/300x300?text=Product'}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <h5 className="font-semibold text-gray-900 mb-1">{product.title}</h5>
                        <p className="text-sm text-gray-600 mb-2">{product.vendor}</p>
                        <p className="text-lg font-bold text-gray-900 mb-3">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: (typeof window !== 'undefined' && (window as any)?.Shopify?.currency?.active) ? (window as any).Shopify.currency.active : 'USD',
                          }).format(parseFloat(product.variants[0]?.price || '0'))}
                        </p>
                        <button 
                          onClick={() => handleAddAlternativeToCart(product)}
                          disabled={state.loading}
                          className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {state.loading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                          <span>{state.loading ? 'Aggiungendo...' : 'Aggiungi al Carrello'}</span>
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4"
      >
        <button
          onClick={onReset}
          className="btn-secondary"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Nuova Analisi
        </button>
        
        <button className="btn-secondary">
          <Share2 className="w-5 h-5 mr-2" />
          Condividi Risultati
        </button>
        
        <button className="btn-primary">
          <Download className="w-5 h-5 mr-2" />
          Scarica Report
        </button>
      </motion.div>

      {/* Disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs text-gray-500 bg-gray-50 p-4 rounded-lg"
      >
        <p>
          Questa analisi è solo a scopo informativo e non deve sostituire il consiglio medico professionale. 
          Consulta sempre un dermatologo per le preoccupazioni mediche.
        </p>
      </motion.div>
    </div>
  );
} 