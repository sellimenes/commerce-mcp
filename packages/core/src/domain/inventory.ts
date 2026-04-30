export interface PriceInventoryItem {
  barcode: string;
  quantity?: number;
  salePrice?: number;
  listPrice?: number;
}

export interface PriceInventoryUpdate {
  items: PriceInventoryItem[];
}

export type BatchStatus = 'created' | 'processing' | 'completed' | 'failed';

export interface BatchItemResult {
  barcode: string;
  success: boolean;
  message?: string;
}

export interface BatchResult {
  batchId: string;
  type: string;
  status: BatchStatus;
  itemCount: number;
  results?: BatchItemResult[];
  createdAt: Date;
  completedAt?: Date;
}
