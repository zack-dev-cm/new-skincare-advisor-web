/**
 * Demo Product Utilities
 * 
 * Utilities for extracting and displaying product information from the API response
 * in demo mode (without Shopify integration).
 */

export interface DemoProduct {
  product_name: string;
  product_description?: string;
  product_image?: string;
  brand?: string;
  module_name: string;
  price?: number;
  size?: string;
  // Raw data from API
  rawData?: any;
}

export interface DemoRoutineCategory {
  category: string;
  modules: DemoModule[];
}

export interface DemoModule {
  module_name: string;
  main_product: DemoProduct | null;
  alternative_products: DemoProduct[];
}

/**
 * Extracts demo products from API response
 * Parses the skincare_routine structure from the API
 */
export function extractDemoProducts(apiResponse: any): DemoRoutineCategory[] {
  if (!apiResponse?.recommendations?.skincare_routine) {
    console.warn('No skincare_routine found in API response');
    return [];
  }

  const routine = apiResponse.recommendations.skincare_routine;
  
  return routine.map((category: any) => ({
    category: category.category || 'Unknown Category',
    modules: (category.modules || []).map((module: any) => ({
      module_name: module.module_name || 'Unknown Module',
      main_product: module.main_product ? mapProduct(module.main_product, module.module_name) : null,
      alternative_products: (module.alternative_products || []).map((p: any) => 
        mapProduct(p, module.module_name)
      )
    }))
  }));
}

/**
 * Maps a product from API format to DemoProduct format
 */
function mapProduct(product: any, moduleName: string): DemoProduct {
  return {
    product_name: product.product_name || 'Unknown Product',
    product_description: product.product_description || product.description || '',
    product_image: product.product_image || product.image || '',
    brand: product.brand || '',
    module_name: moduleName,
    price: product.price || undefined,
    size: product.size || undefined,
    rawData: product
  };
}

/**
 * Gets all main products from a routine
 */
export function getMainProducts(categories: DemoRoutineCategory[]): DemoProduct[] {
  return categories.flatMap(category => 
    category.modules
      .map(module => module.main_product)
      .filter((product): product is DemoProduct => product !== null)
  );
}

/**
 * Gets all alternative products from a routine
 */
export function getAlternativeProducts(categories: DemoRoutineCategory[]): DemoProduct[] {
  return categories.flatMap(category => 
    category.modules.flatMap(module => module.alternative_products)
  );
}

/**
 * Gets all products (main + alternatives) from a routine
 */
export function getAllProducts(categories: DemoRoutineCategory[]): DemoProduct[] {
  return [
    ...getMainProducts(categories),
    ...getAlternativeProducts(categories)
  ];
}

/**
 * Filters products by category
 */
export function getProductsByCategory(
  categories: DemoRoutineCategory[], 
  categoryName: string
): DemoProduct[] {
  const category = categories.find(cat => cat.category === categoryName);
  if (!category) return [];
  
  return category.modules.flatMap(module => [
    module.main_product,
    ...module.alternative_products
  ].filter((p): p is DemoProduct => p !== null));
}

/**
 * Format product image URL
 * Handles various URL formats from the API
 */
export function formatProductImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) {
    return '/placeholder-product.png'; // Fallback image
  }
  
  // If already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If relative URL, prepend API base or CDN
  return imageUrl;
}

/**
 * Format price for display
 */
export function formatPrice(price: number | undefined, currencyCode: string = 'EUR'): string {
  if (!price) return '';
  
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currencyCode,
  }).format(price);
}
