export interface UnifiedProduct {
  productMainId: string;
  /** Optional secondary id (Hepsiburada Listing id, etc.) — undefined for Trendyol. */
  listingId?: string;
  barcode: string;
  stockCode: string;
  title: string;
  description?: string;
  brandId: number;
  brandName?: string;
  categoryId: number;
  categoryName?: string;
  listPrice: number;
  salePrice: number;
  quantity: number;
  approved: boolean;
  vatRate: number;
  dimensionalWeight: number;
  attributes?: Record<string, unknown>;
}

export interface ProductFilter {
  approved?: boolean;
  barcode?: string;
  stockCode?: string;
  page?: number;
  size?: number;
}

export interface ProductLookup {
  barcode?: string;
  productMainId?: string;
}

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
}
