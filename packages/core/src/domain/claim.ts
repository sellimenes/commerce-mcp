export type ClaimStatus =
  | 'Created'
  | 'WaitingInAction'
  | 'Accepted'
  | 'Rejected'
  | 'Cancelled'
  | 'InAnalysis'
  | 'Unresolved';

export interface ReturnClaim {
  id: string;
  packageId: number;
  orderLineItemId: number;
  productMainId: string;
  productName?: string;
  status: ClaimStatus;
  reason: string;
  customerNote?: string;
  createdAt: Date;
}

export interface ClaimsFilter {
  status?: ClaimStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  size?: number;
}
