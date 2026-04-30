export const ORDER_STATUSES = [
  'Awaiting',
  'Created',
  'Picking',
  'Invoiced',
  'Shipped',
  'AtCollectionPoint',
  'Delivered',
  'UnDelivered',
  'Cancelled',
  'UnSupplied',
  'Returned',
  'Repack',
  'UnPacked',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface ShipmentAddress {
  firstName: string;
  lastName: string;
  fullAddress: string;
  city: string;
  district: string;
  postalCode?: string;
  phone?: string;
}

export interface UnifiedOrderItem {
  orderLineItemId: number;
  productMainId: string;
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
  status: OrderStatus;
}

export interface UnifiedOrder {
  packageId: number;
  orderId: number;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  totalPrice: number;
  currency: string;
  items: UnifiedOrderItem[];
  cargoTrackingNumber?: string;
  cargoProviderName?: string;
  shipmentAddress?: ShipmentAddress;
  createdAt: Date;
  lastModifiedAt: Date;
}

export interface OrdersFilter {
  status?: OrderStatus[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  size?: number;
}

export interface ShipInput {
  packageId: number;
  trackingNumber: string;
  providerCode?: string;
}

export interface CancelItemsInput {
  packageId: number;
  items: Array<{
    orderLineItemId: number;
    quantity: number;
    reasonCode: 'STOCK' | 'OTHER';
  }>;
}

export interface UpdateStatusInput {
  packageId: number;
  status: 'Picking' | 'Invoiced';
}
