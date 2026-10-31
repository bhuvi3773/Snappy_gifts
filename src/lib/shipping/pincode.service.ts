import { SERVICEABLE_PINCODES } from '@/data/initialData';

export const INDIAN_STATE_GST_CODES: Record<string, string> = {
  'JAMMU AND KASHMIR': '01',
  'HIMACHAL PRADESH': '02',
  'PUNJAB': '03',
  'CHANDIGARH': '04',
  'UTTARAKHAND': '05',
  'HARYANA': '06',
  'DELHI': '07',
  'RAJASTHAN': '08',
  'UTTAR PRADESH': '09',
  'BIHAR': '10',
  'SIKKIM': '11',
  'ARUNACHAL PRADESH': '12',
  'NAGALAND': '13',
  'MANIPUR': '14',
  'MIZORAM': '15',
  'TRIPURA': '16',
  'MEGHALAYA': '17',
  'ASSAM': '18',
  'WEST BENGAL': '19',
  'JHARKHAND': '20',
  'ODISHA': '21',
  'CHHATTISGARH': '22',
  'MADHYA PRADESH': '23',
  'GUJARAT': '24',
  'DAMAN AND DIU': '25',
  'DADRA AND NAGAR HAVELI': '26',
  'MAHARASHTRA': '27',
  'ANDHRA PRADESH': '28',
  'KARNATAKA': '29',
  'GOA': '30',
  'LAKSHADWEEP': '31',
  'KERALA': '32',
  'TAMIL NADU': '33',
  'PUDUCHERRY': '34',
  'ANDAMAN AND NICOBAR ISLANDS': '35',
  'TELANGANA': '36',
  'LADAKH': '37',
};

export interface PincodeServiceabilityResult {
  valid: boolean;
  serviceable: boolean;
  city?: string;
  state?: string;
  stateCode: string;
  estimatedDays?: number;
  expressAvailable?: boolean;
  message: string;
}

/**
 * Validate standard 6-digit Indian Postal Index Number.
 */
export function isValidIndianPincode(pincode: string): boolean {
  if (!pincode || typeof pincode !== 'string') return false;
  const clean = pincode.trim();
  return /^[1-9][0-9]{5}$/.test(clean);
}

/**
 * Resolve 2-digit GST State Code from Indian State name.
 * Defaults to interstate "99" if state name is unknown.
 */
export function resolveStateCode(stateName?: string): string {
  if (!stateName || typeof stateName !== 'string') return '99';
  const normalized = stateName.trim().toUpperCase();
  return INDIAN_STATE_GST_CODES[normalized] || '99';
}

/**
 * Check delivery serviceability for a PIN code against approved hub registry.
 */
export function checkPincodeServiceability(pincode: string): PincodeServiceabilityResult {
  const clean = pincode ? pincode.trim() : '';

  if (!isValidIndianPincode(clean)) {
    return {
      valid: false,
      serviceable: false,
      stateCode: '99',
      message: 'Please enter a valid 6-digit Indian PIN code (e.g. 305001 or 110001)',
    };
  }

  // Lookup in approved dataset
  const hub = SERVICEABLE_PINCODES[clean];
  if (hub) {
    const stateCode = resolveStateCode(hub.state);
    return {
      valid: true,
      serviceable: true,
      city: hub.city,
      state: hub.state,
      stateCode,
      estimatedDays: hub.days,
      expressAvailable: hub.expressAvailable,
      message: `Delivery available in ${hub.city}, ${hub.state} within ${hub.days} business day${hub.days > 1 ? 's' : ''}`,
    };
  }

  // Pincode has valid 6-digit format, but is NOT present in the approved serviceable registry
  // Explicitly return unserviceable rather than fabricating a delivery promise
  return {
    valid: true,
    serviceable: false,
    stateCode: '99',
    message: `Delivery is currently not available for PIN code ${clean}. Snappy Gifts currently services verified express hubs.`,
  };
}
