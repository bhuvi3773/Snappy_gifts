/**
 * Courier / Logistics Provider Adapter Interface
 * Implementations: Mock / Manual (Default in Early Batches), Delhivery / BlueDart (Live Cutover).
 */

export interface TrackingCheckpoint {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface TrackingResult {
  awbNumber: string;
  courierName: string;
  status: 'PENDING' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  estimatedDeliveryDate?: string;
  checkpoints: TrackingCheckpoint[];
}

export interface CourierAdapter {
  trackShipment(awbNumber: string): Promise<TrackingResult>;
  verifyPincodeServiceability(pincode: string): Promise<{ serviceable: boolean; estimatedDays: number }>;
}
