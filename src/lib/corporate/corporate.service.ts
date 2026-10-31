import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import {
  calculateCartPricing,
  PricingValidationError,
  LineItemQuote,
  RAJASTHAN_STATE_CODE,
} from '@/lib/pricing/pricing.service';
import {
  isValidIndianPincode,
  resolveStateCode,
} from '@/lib/shipping/pincode.service';
import { INITIAL_PRODUCTS } from '@/data/initialData';
import {
  createOrder,
  CreateOrderInput,
  DEV_ORDERS_STORE,
  SanitizedOrderResult,
} from '@/lib/orders/order.service';

// ============================================================================
// DOMAIN ENUMS & TYPES
// ============================================================================

export type CorporateRole = 'OWNER' | 'REQUESTER' | 'APPROVER' | 'FINANCE';
export type CorporateAccountStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type RFQStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export type QuoteStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'EXPIRED';

export interface CorporateAddressInput {
  label: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  street: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  department?: string;
  isDefault?: boolean;
}

export interface CorporateRegistrationInput {
  legalName: string;
  displayName: string;
  companyEmail: string;
  contactPerson: string;
  contactPhone: string;
  registeredAddress: {
    street: string;
    city: string;
    state: string;
    stateCode: string;
    pincode: string;
  };
  gstin?: string;
  businessDetails?: string;
}

export interface RFQItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  personalizationNote?: string;
  logoUrl?: string;
  estimatedUnitBudgetPaise?: number;
}

export interface CreateRFQInput {
  requiredDeliveryDate?: string;
  deliveryLocationsCount?: number;
  brandingLogoRequired?: boolean;
  customPackagingRequired?: boolean;
  estimatedBudgetPaise?: number;
  additionalInstructions?: string;
  items: RFQItemInput[];
}

export interface QuoteItemInput {
  productId: string;
  variantId?: string;
  sku?: string;
  quantity: number;
  unitPricePaise?: number; // Admin override if specified, otherwise calculated
  customizationFeePaise?: number;
  discountPercent?: number;
  personalizationDetails?: any;
}

export interface CreateQuoteInput {
  rfqId?: string;
  organizationId: string;
  validUntil: string;
  commercialTerms?: string;
  customerNotes?: string;
  internalAdminNotes?: string;
  shippingTotalPaise?: number;
  items: QuoteItemInput[];
}

export interface ReviseQuoteInput {
  validUntil?: string;
  commercialTerms?: string;
  customerNotes?: string;
  internalAdminNotes?: string;
  shippingTotalPaise?: number;
  items?: QuoteItemInput[];
}

export interface PriceTierInput {
  minQuantity: number;
  maxQuantity?: number;
  unitPricePaise: number;
}

export interface CreatePriceAgreementInput {
  organizationId: string;
  productId: string;
  variantId?: string;
  agreementName: string;
  unitPricePaise: number;
  effectiveFrom: string;
  effectiveTo: string;
  negotiationReason?: string;
  tiers?: PriceTierInput[];
}

export interface DeliveryAllocationInput {
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  street: string;
  city: string;
  state: string;
  stateCode?: string;
  pincode: string;
  department?: string;
  customGiftNote?: string;
  quantity: number;
  productId: string;
  variantId?: string;
  sku: string;
}

export interface CreateCorporateOrderGroupInput {
  quoteId: string;
  paymentMethod: string;
  paymentReference?: string;
  allocations: DeliveryAllocationInput[];
}

export interface CsvRowValidation {
  rowNumber: number;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  sku: string;
  quantity: number;
  street: string;
  street2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  department?: string;
  personalizationNote?: string;
  isValid: boolean;
  errors: string[];
  productName?: string;
  productId?: string;
}

export interface CsvValidationSummary {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  rows: CsvRowValidation[];
  skuBreakdown: Record<string, { quantity: number; productName: string }>;
  errors: string[];
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class CorporateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorporateValidationError';
  }
}

export class CorporatePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorporatePermissionError';
  }
}

export class CorporateNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorporateNotFoundError';
  }
}

export class CorporateStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorporateStateError';
  }
}

// ============================================================================
// IN-MEMORY DEVELOPMENT STORES (Fallback when PostgreSQL is unreachable)
// ============================================================================

export const DEV_ORGANIZATIONS_STORE: Map<string, any> = new Map();
export const DEV_CORPORATE_MEMBERS_STORE: Map<string, any[]> = new Map(); // orgId -> members[]
export const DEV_CORPORATE_ADDRESSES_STORE: Map<string, any[]> = new Map(); // orgId -> addresses[]
export const DEV_CORPORATE_RFQS_STORE: Map<string, any> = new Map(); // rfqId -> rfq
export const DEV_CORPORATE_QUOTES_STORE: Map<string, any> = new Map(); // quoteId -> quote
export const DEV_CORPORATE_PRICE_AGREEMENTS_STORE: Map<string, any[]> = new Map(); // orgId -> agreements[]
export const DEV_CORPORATE_ORDER_GROUPS_STORE: Map<string, any> = new Map(); // groupId -> orderGroup

export function resetCorporateDevStores() {
  DEV_ORGANIZATIONS_STORE.clear();
  DEV_CORPORATE_MEMBERS_STORE.clear();
  DEV_CORPORATE_ADDRESSES_STORE.clear();
  DEV_CORPORATE_RFQS_STORE.clear();
  DEV_CORPORATE_QUOTES_STORE.clear();
  DEV_CORPORATE_PRICE_AGREEMENTS_STORE.clear();
  DEV_CORPORATE_ORDER_GROUPS_STORE.clear();
}

// ============================================================================
// BIGINT SERIALIZATION HELPER
// ============================================================================

export function serializeBigInts<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return Number(data) as any;
  if (Array.isArray(data)) return data.map(serializeBigInts) as any;
  if (typeof data === 'object' && !(data instanceof Date)) {
    const res: any = {};
    for (const [key, val] of Object.entries(data)) {
      res[key] = serializeBigInts(val);
    }
    return res;
  }
  return data;
}

// ============================================================================
// CSV FORMULA INJECTION & SANITIZATION DEFENSE
// ============================================================================

const DANGEROUS_CSV_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeCsvField(val: string): string {
  if (!val) return '';
  let cleaned = val.trim();
  // If the cell begins with dangerous formula trigger characters, prefix with single quote to neutralize
  while (cleaned.length > 0 && DANGEROUS_CSV_PREFIXES.includes(cleaned[0])) {
    cleaned = cleaned.substring(1).trim();
  }
  return cleaned;
}

// ============================================================================
// CORPORATE ONBOARDING & ACCOUNT ADMINISTRATION
// ============================================================================

export async function registerCorporateAccount(
  userId: string,
  userEmail: string,
  userName: string,
  input: CorporateRegistrationInput
): Promise<any> {
  if (!userId) throw new CorporateValidationError('User ID is required to register corporate account.');
  if (!input.legalName || input.legalName.trim().length < 2) {
    throw new CorporateValidationError('Legal company name must be at least 2 characters.');
  }
  if (!input.displayName || input.displayName.trim().length < 2) {
    throw new CorporateValidationError('Display company name must be at least 2 characters.');
  }
  if (!input.companyEmail || !input.companyEmail.includes('@')) {
    throw new CorporateValidationError('A valid company email address is required.');
  }
  if (!input.contactPerson || input.contactPerson.trim().length < 2) {
    throw new CorporateValidationError('Contact person name is required.');
  }
  if (!input.contactPhone || input.contactPhone.replace(/\D/g, '').length < 10) {
    throw new CorporateValidationError('A valid 10-digit contact phone number is required.');
  }
  if (!input.registeredAddress || !input.registeredAddress.street || !input.registeredAddress.pincode) {
    throw new CorporateValidationError('Complete registered address with pincode is required.');
  }
  if (!isValidIndianPincode(input.registeredAddress.pincode)) {
    throw new CorporateValidationError('Invalid 6-digit Indian PIN code provided for registered address.');
  }

  const orgId = `org_${crypto.randomUUID()}`;
  const now = new Date();

  const organizationRecord = {
    id: orgId,
    name: input.displayName.trim(),
    companyName: input.displayName.trim(),
    legalName: input.legalName.trim(),
    displayName: input.displayName.trim(),
    businessEmail: input.companyEmail.trim().toLowerCase(),
    companyEmail: input.companyEmail.trim().toLowerCase(),
    contactPerson: input.contactPerson.trim(),
    phone: input.contactPhone.trim(),
    contactPhone: input.contactPhone.trim(),
    registeredAddress: input.registeredAddress,
    gstin: input.gstin?.trim() || null,
    businessDetails: input.businessDetails?.trim() || null,
    status: 'PENDING_APPROVAL' as CorporateAccountStatus,
    rejectionReason: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const ownerMembership = {
    id: `cmem_${crypto.randomUUID()}`,
    organizationId: orgId,
    userId,
    userEmail,
    userName,
    role: 'OWNER' as CorporateRole,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const createdOrg = await prisma.organization.create({
      data: {
        id: orgId,
        companyName: organizationRecord.companyName,
        legalName: organizationRecord.legalName,
        displayName: organizationRecord.displayName,
        businessEmail: organizationRecord.businessEmail,
        companyEmail: organizationRecord.companyEmail,
        contactPerson: organizationRecord.contactPerson,
        phone: organizationRecord.phone,
        contactPhone: organizationRecord.contactPhone,
        registeredAddress: organizationRecord.registeredAddress,
        gstin: organizationRecord.gstin,
        businessDetails: organizationRecord.businessDetails,
        status: organizationRecord.status,
        memberships: {
          create: {
            id: ownerMembership.id,
            userId,
            role: 'OWNER',
            isActive: true,
          },
        },
      },
      include: {
        memberships: true,
      },
    });
    return createdOrg;
  } catch (err) {
    // Database fallback
    DEV_ORGANIZATIONS_STORE.set(orgId, organizationRecord);
    DEV_CORPORATE_MEMBERS_STORE.set(orgId, [ownerMembership]);
    return {
      ...organizationRecord,
      memberships: [ownerMembership],
    };
  }
}

export async function getCorporateAccount(orgId: string): Promise<any> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        corporateAddresses: true,
      },
    });
    if (org) return org;
  } catch {
    // DB fallback
  }

  const inMem = DEV_ORGANIZATIONS_STORE.get(orgId);
  if (!inMem) throw new CorporateNotFoundError(`Corporate organization "${orgId}" not found.`);

  return {
    ...inMem,
    memberships: DEV_CORPORATE_MEMBERS_STORE.get(orgId) || [],
    corporateAddresses: DEV_CORPORATE_ADDRESSES_STORE.get(orgId) || [],
  };
}

export async function getCorporateAccountForUser(userId: string): Promise<any | null> {
  try {
    const membership = await prisma.corporateMembership.findFirst({
      where: { userId, isActive: true },
      include: {
        organization: {
          include: {
            memberships: true,
            corporateAddresses: true,
          },
        },
      },
    });
    if (membership?.organization) {
      return {
        ...membership.organization,
        currentUserRole: membership.role,
      };
    }
  } catch {
    // DB fallback
  }

  for (const [orgId, members] of DEV_CORPORATE_MEMBERS_STORE.entries()) {
    const mem = members.find((m) => m.userId === userId && m.isActive);
    if (mem) {
      const org = DEV_ORGANIZATIONS_STORE.get(orgId);
      if (org) {
        return {
          ...org,
          currentUserRole: mem.role,
          memberships: members,
          corporateAddresses: DEV_CORPORATE_ADDRESSES_STORE.get(orgId) || [],
        };
      }
    }
  }
  return null;
}

export async function listCorporateAccounts(statusFilter?: CorporateAccountStatus): Promise<any[]> {
  try {
    const where: any = {};
    if (statusFilter) where.status = statusFilter;
    const orgs = await prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (orgs && orgs.length > 0) return orgs;
  } catch {
    // DB fallback
  }

  let list = Array.from(DEV_ORGANIZATIONS_STORE.values());
  if (statusFilter) {
    list = list.filter((o) => o.status === statusFilter);
  }
  return list.map((org) => ({
    ...org,
    memberships: DEV_CORPORATE_MEMBERS_STORE.get(org.id) || [],
  }));
}

export async function reviewCorporateAccount(
  orgId: string,
  adminUserId: string,
  action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE',
  reason?: string
): Promise<any> {
  const account = await getCorporateAccount(orgId);
  const now = new Date();

  let newStatus: CorporateAccountStatus;
  switch (action) {
    case 'APPROVE':
      newStatus = 'APPROVED';
      break;
    case 'REJECT':
      if (!reason || reason.trim().length < 5) {
        throw new CorporateValidationError('A clear rejection reason of at least 5 characters is required.');
      }
      newStatus = 'REJECTED';
      break;
    case 'SUSPEND':
      newStatus = 'SUSPENDED';
      break;
    case 'REACTIVATE':
      newStatus = 'APPROVED';
      break;
    default:
      throw new CorporateValidationError(`Invalid review action: ${action}`);
  }

  try {
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        status: newStatus,
        reviewedBy: adminUserId,
        reviewedAt: now,
        rejectionReason: action === 'REJECT' ? reason?.trim() : null,
      },
    });
    return updated;
  } catch {
    // DB fallback
  }

  const existing = DEV_ORGANIZATIONS_STORE.get(orgId);
  if (!existing) throw new CorporateNotFoundError(`Corporate account "${orgId}" not found.`);

  existing.status = newStatus;
  existing.reviewedBy = adminUserId;
  existing.reviewedAt = now;
  existing.rejectionReason = action === 'REJECT' ? reason?.trim() : null;
  existing.updatedAt = now;
  DEV_ORGANIZATIONS_STORE.set(orgId, existing);

  return existing;
}

// ============================================================================
// MEMBERSHIP & PERMISSIONS ENFORCEMENT
// ============================================================================

export async function verifyCorporatePermission(
  orgId: string,
  userId: string,
  allowedRoles: CorporateRole[]
): Promise<{ org: any; membership: any }> {
  const org = await getCorporateAccount(orgId);

  if (org.status === 'SUSPENDED') {
    throw new CorporatePermissionError('Corporate account is currently SUSPENDED. Actions are restricted.');
  }

  let membership: any = null;
  try {
    membership = await prisma.corporateMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });
  } catch {
    // DB fallback
  }

  if (!membership) {
    const members = DEV_CORPORATE_MEMBERS_STORE.get(orgId) || [];
    membership = members.find((m) => m.userId === userId && m.isActive);
  }

  if (!membership || !membership.isActive) {
    throw new CorporatePermissionError('Access denied: User is not an active member of this corporate account.');
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new CorporatePermissionError(
      `Permission denied: Role "${membership.role}" does not have required privileges [${allowedRoles.join(', ')}].`
    );
  }

  return { org, membership };
}

export async function addCorporateMember(
  orgId: string,
  requesterUserId: string,
  targetUserId: string,
  targetEmail: string,
  targetName: string,
  role: CorporateRole
): Promise<any> {
  // Only OWNER can add members
  await verifyCorporatePermission(orgId, requesterUserId, ['OWNER']);

  if (!['OWNER', 'REQUESTER', 'APPROVER', 'FINANCE'].includes(role)) {
    throw new CorporateValidationError(`Invalid corporate role: ${role}`);
  }

  const now = new Date();
  const newMember = {
    id: `cmem_${crypto.randomUUID()}`,
    organizationId: orgId,
    userId: targetUserId,
    userEmail: targetEmail,
    userName: targetName,
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const created = await prisma.corporateMembership.create({
      data: {
        id: newMember.id,
        organizationId: orgId,
        userId: targetUserId,
        role,
        isActive: true,
      },
    });
    return created;
  } catch {
    // DB fallback
  }

  const members = DEV_CORPORATE_MEMBERS_STORE.get(orgId) || [];
  const existing = members.find((m) => m.userId === targetUserId);
  if (existing) {
    existing.role = role;
    existing.isActive = true;
    existing.updatedAt = now;
    return existing;
  }

  members.push(newMember);
  DEV_CORPORATE_MEMBERS_STORE.set(orgId, members);
  return newMember;
}

export async function updateCorporateMemberRole(
  orgId: string,
  requesterUserId: string,
  targetUserId: string,
  newRole: CorporateRole
): Promise<any> {
  await verifyCorporatePermission(orgId, requesterUserId, ['OWNER']);

  try {
    const updated = await prisma.corporateMembership.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
      data: { role: newRole },
    });
    return updated;
  } catch {
    // DB fallback
  }

  const members = DEV_CORPORATE_MEMBERS_STORE.get(orgId) || [];
  const member = members.find((m) => m.userId === targetUserId);
  if (!member) throw new CorporateNotFoundError('Corporate member not found.');
  member.role = newRole;
  member.updatedAt = new Date();
  return member;
}

export async function removeCorporateMember(
  orgId: string,
  requesterUserId: string,
  targetUserId: string
): Promise<void> {
  await verifyCorporatePermission(orgId, requesterUserId, ['OWNER']);

  // Check that this is not the last OWNER
  const members = DEV_CORPORATE_MEMBERS_STORE.get(orgId) || [];
  const owners = members.filter((m) => m.role === 'OWNER' && m.isActive);
  if (owners.length <= 1 && owners[0]?.userId === targetUserId) {
    throw new CorporateValidationError('Cannot remove the sole OWNER of the corporate account.');
  }

  try {
    await prisma.corporateMembership.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId,
        },
      },
      data: { isActive: false },
    });
    return;
  } catch {
    // DB fallback
  }

  const member = members.find((m) => m.userId === targetUserId);
  if (member) member.isActive = false;
}

// ============================================================================
// CORPORATE SAVED ADDRESSES
// ============================================================================

export async function createCorporateAddress(
  orgId: string,
  userId: string,
  input: CorporateAddressInput
): Promise<any> {
  await verifyCorporatePermission(orgId, userId, ['OWNER', 'REQUESTER', 'APPROVER']);

  if (!input.label || input.label.trim().length < 2) {
    throw new CorporateValidationError('Address label (e.g. "HQ", "Branch") is required.');
  }
  if (!input.recipientName || input.recipientName.trim().length < 2) {
    throw new CorporateValidationError('Recipient name is required.');
  }
  if (!input.recipientPhone || input.recipientPhone.replace(/\D/g, '').length < 10) {
    throw new CorporateValidationError('A valid 10-digit recipient phone number is required.');
  }
  if (!input.street || input.street.trim().length < 5) {
    throw new CorporateValidationError('Complete street address is required.');
  }
  if (!isValidIndianPincode(input.pincode)) {
    throw new CorporateValidationError('Invalid 6-digit Indian PIN code.');
  }

  const stateCode = resolveStateCode(input.state) || input.stateCode || '08';
  const now = new Date();
  const addressRecord = {
    id: `caddr_${crypto.randomUUID()}`,
    organizationId: orgId,
    label: input.label.trim(),
    recipientName: input.recipientName.trim(),
    recipientPhone: input.recipientPhone.trim(),
    recipientEmail: input.recipientEmail?.trim() || null,
    street: input.street.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    stateCode,
    pincode: input.pincode.trim(),
    department: input.department?.trim() || null,
    isDefault: input.isDefault ?? false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const created = await prisma.corporateAddress.create({
      data: addressRecord,
    });
    return created;
  } catch {
    // DB fallback
  }

  const addresses = DEV_CORPORATE_ADDRESSES_STORE.get(orgId) || [];
  addresses.push(addressRecord);
  DEV_CORPORATE_ADDRESSES_STORE.set(orgId, addresses);
  return addressRecord;
}

export async function listCorporateAddresses(orgId: string, userId: string): Promise<any[]> {
  await verifyCorporatePermission(orgId, userId, ['OWNER', 'REQUESTER', 'APPROVER', 'FINANCE']);

  try {
    const list = await prisma.corporateAddress.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    });
    if (list && list.length > 0) return list;
  } catch {
    // DB fallback
  }

  return DEV_CORPORATE_ADDRESSES_STORE.get(orgId) || [];
}

// ============================================================================
// REQUEST FOR QUOTATION (RFQ) WORKFLOW
// ============================================================================

export async function createCorporateRFQ(
  orgId: string,
  userId: string,
  input: CreateRFQInput
): Promise<any> {
  // REQUESTER, APPROVER, or OWNER can submit RFQ
  const { org } = await verifyCorporatePermission(orgId, userId, ['OWNER', 'REQUESTER', 'APPROVER']);

  if (org.status !== 'APPROVED') {
    throw new CorporateValidationError('Corporate account must be APPROVED before submitting RFQs.');
  }

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    throw new CorporateValidationError('RFQ must contain at least one product item.');
  }

  const rfqNumber = `RFQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const rfqId = `rfq_${crypto.randomUUID()}`;

  const validatedItems: any[] = [];
  for (const item of input.items) {
    if (!item.productId) throw new CorporateValidationError('Product ID is required for each RFQ item.');
    const qty = Math.floor(item.quantity);
    if (qty < 1) throw new CorporateValidationError(`Quantity for item must be at least 1 unit.`);

    // Verify product exists in catalog
    const product = INITIAL_PRODUCTS.find((p) => p.id === item.productId);
    if (!product) {
      throw new CorporateValidationError(`Product with ID "${item.productId}" was not found in catalog.`);
    }

    validatedItems.push({
      id: `rfqi_${crypto.randomUUID()}`,
      rfqId,
      productId: item.productId,
      variantId: item.variantId || null,
      productName: product.name,
      variantName: item.variantId ? 'Corporate Custom Variant' : null,
      sku: product.sku || `SKU-${product.id}`,
      requestedQuantity: qty,
      personalizationNote: item.personalizationNote?.trim() || null,
      logoUrl: item.logoUrl?.trim() || null,
      estimatedUnitBudgetPaise: item.estimatedUnitBudgetPaise ? BigInt(item.estimatedUnitBudgetPaise) : null,
    });
  }

  const rfqRecord = {
    id: rfqId,
    rfqNumber,
    organizationId: orgId,
    createdById: userId,
    title: `Corporate RFQ for ${validatedItems.length} item(s)`,
    status: 'SUBMITTED' as RFQStatus,
    requiredDeliveryDate: input.requiredDeliveryDate ? new Date(input.requiredDeliveryDate) : null,
    numberOfLocations: input.deliveryLocationsCount || 1,
    brandingRequirements: input.brandingLogoRequired ? 'Branding/Logo required' : null,
    packagingRequirements: input.customPackagingRequired ? 'Custom corporate packaging required' : null,
    estimatedBudgetPaise: input.estimatedBudgetPaise ? BigInt(input.estimatedBudgetPaise) : null,
    additionalInstructions: input.additionalInstructions?.trim() || null,
    internalAdminNotes: null,
    customerNotes: null,
    reviewedById: null,
    reviewedAt: null,
    quotedAt: null,
    items: validatedItems,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const created = await prisma.corporateRFQ.create({
      data: {
        id: rfqRecord.id,
        rfqNumber: rfqRecord.rfqNumber,
        organizationId: rfqRecord.organizationId,
        createdById: rfqRecord.createdById,
        title: rfqRecord.title,
        status: rfqRecord.status,
        requiredDeliveryDate: rfqRecord.requiredDeliveryDate,
        numberOfLocations: rfqRecord.numberOfLocations,
        brandingRequirements: rfqRecord.brandingRequirements,
        packagingRequirements: rfqRecord.packagingRequirements,
        estimatedBudgetPaise: rfqRecord.estimatedBudgetPaise,
        additionalInstructions: rfqRecord.additionalInstructions,
        items: {
          create: validatedItems.map((vi) => ({
            id: vi.id,
            productId: vi.productId,
            variantId: vi.variantId,
            productName: vi.productName,
            variantName: vi.variantName,
            sku: vi.sku,
            requestedQuantity: vi.requestedQuantity,
            personalizationNote: vi.personalizationNote,
            logoUrl: vi.logoUrl,
            estimatedUnitBudgetPaise: vi.estimatedUnitBudgetPaise,
          })),
        },
      },
      include: { items: true },
    });
    return created;
  } catch {
    // DB fallback
  }

  DEV_CORPORATE_RFQS_STORE.set(rfqId, rfqRecord);
  return rfqRecord;
}

export async function getCorporateRFQ(
  rfqId: string,
  userOrgId?: string,
  isStaff: boolean = false
): Promise<any> {
  let rfq: any = null;
  try {
    rfq = await prisma.corporateRFQ.findUnique({
      where: { id: rfqId },
      include: {
        items: true,
        organization: true,
      },
    });
  } catch {
    // DB fallback
  }

  if (!rfq) {
    rfq = DEV_CORPORATE_RFQS_STORE.get(rfqId);
  }

  if (!rfq) throw new CorporateNotFoundError(`RFQ "${rfqId}" not found.`);

  // Tenant isolation: if not staff, must strictly match organization
  if (!isStaff) {
    if (!userOrgId || rfq.organizationId !== userOrgId) {
      throw new CorporatePermissionError('Access denied: RFQ does not belong to your organization.');
    }
  }

  // Sanitize internal admin notes for corporate customers
  if (!isStaff) {
    const { internalAdminNotes, ...sanitized } = rfq;
    return sanitized;
  }

  return rfq;
}

export async function listCorporateRFQs(
  orgId?: string,
  isStaff: boolean = false,
  statusFilter?: RFQStatus
): Promise<any[]> {
  try {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (statusFilter) where.status = statusFilter;

    const list = await prisma.corporateRFQ.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true, organization: true },
    });
    if (list && list.length > 0) {
      if (!isStaff) {
        return list.map(({ internalAdminNotes, ...rest }) => rest);
      }
      return list;
    }
  } catch {
    // DB fallback
  }

  let list = Array.from(DEV_CORPORATE_RFQS_STORE.values());
  if (orgId) list = list.filter((r) => r.organizationId === orgId);
  if (statusFilter) list = list.filter((r) => r.status === statusFilter);

  if (!isStaff) {
    return list.map(({ internalAdminNotes, ...rest }) => rest);
  }
  return list;
}

export async function updateCorporateRFQStatus(
  rfqId: string,
  newStatus: RFQStatus,
  adminUserId?: string,
  notes?: { internalNotes?: string; customerNotes?: string }
): Promise<any> {
  const rfq = await getCorporateRFQ(rfqId, undefined, true);
  const now = new Date();

  // Valid state transitions
  const validTransitions: Record<RFQStatus, RFQStatus[]> = {
    DRAFT: ['SUBMITTED', 'CANCELLED'],
    SUBMITTED: ['UNDER_REVIEW', 'QUOTED', 'REJECTED', 'CANCELLED'],
    UNDER_REVIEW: ['QUOTED', 'REJECTED', 'CANCELLED'],
    QUOTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
    ACCEPTED: [],
    REJECTED: [],
    CANCELLED: [],
    EXPIRED: [],
  };

  const allowed = validTransitions[rfq.status as RFQStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new CorporateStateError(
      `Invalid RFQ state transition from "${rfq.status}" to "${newStatus}". Allowed: [${allowed.join(', ')}].`
    );
  }

  try {
    const updated = await prisma.corporateRFQ.update({
      where: { id: rfqId },
      data: {
        status: newStatus,
        reviewedById: adminUserId || rfq.reviewedById,
        reviewedAt: now,
        quotedAt: newStatus === 'QUOTED' ? now : rfq.quotedAt,
        internalAdminNotes: notes?.internalNotes ?? rfq.internalAdminNotes,
        customerNotes: notes?.customerNotes ?? rfq.customerNotes,
      },
      include: { items: true },
    });
    return updated;
  } catch {
    // DB fallback
  }

  rfq.status = newStatus;
  rfq.reviewedById = adminUserId || rfq.reviewedById;
  rfq.reviewedAt = now;
  if (newStatus === 'QUOTED') rfq.quotedAt = now;
  if (notes?.internalNotes !== undefined) rfq.internalAdminNotes = notes.internalNotes;
  if (notes?.customerNotes !== undefined) rfq.customerNotes = notes.customerNotes;
  rfq.updatedAt = now;

  DEV_CORPORATE_RFQS_STORE.set(rfqId, rfq);
  return rfq;
}

// ============================================================================
// CORPORATE PRICING & AGREEMENTS ENGINE
// Priority:
// 1. Approved Quote Price (Immutable Snapshot)
// 2. Active Corporate Price Agreement (+ Tiers)
// 3. Product Quantity Bulk Tier
// 4. Base Product Price
// ============================================================================

export async function createPriceAgreement(
  input: CreatePriceAgreementInput,
  adminUserId: string
): Promise<any> {
  if (!input.organizationId) throw new CorporateValidationError('Organization ID is required.');
  if (!input.productId) throw new CorporateValidationError('Product ID is required.');
  if (!input.agreementName || input.agreementName.trim().length < 2) {
    throw new CorporateValidationError('Agreement name is required.');
  }
  if (!input.unitPricePaise || input.unitPricePaise <= 0) {
    throw new CorporateValidationError('Unit price in integer paise must be greater than 0.');
  }

  const effectiveFrom = new Date(input.effectiveFrom);
  const effectiveTo = new Date(input.effectiveTo);
  if (isNaN(effectiveFrom.getTime()) || isNaN(effectiveTo.getTime())) {
    throw new CorporateValidationError('Valid effectiveFrom and effectiveTo dates are required.');
  }
  if (effectiveTo <= effectiveFrom) {
    throw new CorporateValidationError('effectiveTo date must be strictly after effectiveFrom date.');
  }

  const agreementId = `cpa_${crypto.randomUUID()}`;
  const now = new Date();

  const tiers = (input.tiers || []).map((t) => ({
    id: `cpt_${crypto.randomUUID()}`,
    agreementId,
    minQuantity: t.minQuantity,
    maxQuantity: t.maxQuantity ?? null,
    unitPricePaise: t.unitPricePaise,
  }));

  const agreementRecord = {
    id: agreementId,
    organizationId: input.organizationId,
    productId: input.productId,
    variantId: input.variantId || null,
    agreementName: input.agreementName.trim(),
    unitPricePaise: input.unitPricePaise,
    effectiveFrom,
    effectiveTo,
    isActive: true,
    negotiatedBy: adminUserId,
    negotiationReason: input.negotiationReason?.trim() || null,
    tiers,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const created = await prisma.corporatePriceAgreement.create({
      data: {
        id: agreementRecord.id,
        organizationId: agreementRecord.organizationId,
        productId: agreementRecord.productId,
        variantId: agreementRecord.variantId,
        agreementName: agreementRecord.agreementName,
        unitPricePaise: agreementRecord.unitPricePaise,
        effectiveFrom: agreementRecord.effectiveFrom,
        effectiveTo: agreementRecord.effectiveTo,
        isActive: true,
        negotiatedBy: adminUserId,
        negotiationReason: agreementRecord.negotiationReason,
        tiers: {
          create: tiers.map((t) => ({
            id: t.id,
            minQuantity: t.minQuantity,
            maxQuantity: t.maxQuantity,
            unitPricePaise: t.unitPricePaise,
          })),
        },
      },
      include: { tiers: true },
    });
    return created;
  } catch {
    // DB fallback
  }

  const list = DEV_CORPORATE_PRICE_AGREEMENTS_STORE.get(input.organizationId) || [];
  list.push(agreementRecord);
  DEV_CORPORATE_PRICE_AGREEMENTS_STORE.set(input.organizationId, list);
  return agreementRecord;
}

export async function listPriceAgreements(orgId?: string, productId?: string): Promise<any[]> {
  try {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (productId) where.productId = productId;
    const list = await prisma.corporatePriceAgreement.findMany({
      where,
      include: { tiers: true, product: { select: { id: true, name: true, basePricePaise: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (list && list.length > 0) return list;
  } catch {
    // DB fallback
  }

  let list: any[] = [];
  if (orgId) {
    list = DEV_CORPORATE_PRICE_AGREEMENTS_STORE.get(orgId) || [];
  } else {
    for (const agreements of DEV_CORPORATE_PRICE_AGREEMENTS_STORE.values()) {
      list.push(...agreements);
    }
  }

  if (productId) {
    list = list.filter((a) => a.productId === productId);
  }
  return list;
}

export async function resolveCorporateUnitPrice(
  productId: string,
  variantId: string | undefined,
  quantity: number,
  orgId?: string
): Promise<{ unitPricePaise: number; pricingSource: 'CORPORATE_AGREEMENT' | 'BULK_TIER' | 'BASE_PRICE' }> {
  const qty = Math.max(1, Math.floor(quantity));
  const now = new Date();

  // 1. Check active Corporate Price Agreement for org
  if (orgId) {
    const agreements = await listPriceAgreements(orgId, productId);
    const activeAgreement = agreements.find(
      (a) =>
        a.isActive &&
        new Date(a.effectiveFrom) <= now &&
        new Date(a.effectiveTo) >= now &&
        (!a.variantId || a.variantId === variantId)
    );

    if (activeAgreement) {
      // Check if there are quantity tiers in the agreement
      if (activeAgreement.tiers && activeAgreement.tiers.length > 0) {
        const matchingTier = activeAgreement.tiers.find(
          (t: any) => qty >= t.minQuantity && (t.maxQuantity === null || qty <= t.maxQuantity)
        );
        if (matchingTier) {
          return {
            unitPricePaise: matchingTier.unitPricePaise,
            pricingSource: 'CORPORATE_AGREEMENT',
          };
        }
      }
      return {
        unitPricePaise: activeAgreement.unitPricePaise,
        pricingSource: 'CORPORATE_AGREEMENT',
      };
    }
  }

  // 2. Fallback to Product Quantity BulkTier or Base Price
  const product = INITIAL_PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    throw new CorporateValidationError(`Product "${productId}" not found in catalog.`);
  }

  const basePricePaise = product.basePrice * 100;

  // If product has bulk tiers (e.g., 50+ units = 10% off, 100+ units = 15% off)
  if (qty >= 200) {
    return { unitPricePaise: Math.round(basePricePaise * 0.8), pricingSource: 'BULK_TIER' }; // 20% discount
  } else if (qty >= 100) {
    return { unitPricePaise: Math.round(basePricePaise * 0.85), pricingSource: 'BULK_TIER' }; // 15% discount
  } else if (qty >= 50) {
    return { unitPricePaise: Math.round(basePricePaise * 0.9), pricingSource: 'BULK_TIER' }; // 10% discount
  }

  return { unitPricePaise: basePricePaise, pricingSource: 'BASE_PRICE' };
}

// ============================================================================
// QUOTATION MANAGEMENT & REVISIONS
// ============================================================================

export async function createCorporateQuote(
  input: CreateQuoteInput,
  adminUserId: string
): Promise<any> {
  if (!input.organizationId) throw new CorporateValidationError('Organization ID is required.');
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    throw new CorporateValidationError('Quotation must contain at least one item.');
  }

  const validUntil = new Date(input.validUntil);
  if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
    throw new CorporateValidationError('validUntil date must be a valid future date.');
  }

  const quoteId = `quote_${crypto.randomUUID()}`;
  const quoteNumber = `QT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const revision = 1;
  const now = new Date();

  // Authoritatively calculate quote items and taxes
  let itemsSubtotalPaise = 0;
  let customizationTotalPaise = 0;
  let lineTaxTotalAggregatePaise = 0;

  const quoteItems: any[] = [];

  for (const item of input.items) {
    const product = INITIAL_PRODUCTS.find((p) => p.id === item.productId);
    if (!product) {
      throw new CorporateValidationError(`Product "${item.productId}" not found.`);
    }

    const qty = Math.floor(item.quantity);
    if (qty < 1) throw new CorporateValidationError('Item quantity must be at least 1.');

    // Determine unit price: Admin override if specified, else corporate pricing engine
    let unitPricePaise = item.unitPricePaise;
    if (!unitPricePaise || unitPricePaise <= 0) {
      const resolved = await resolveCorporateUnitPrice(
        item.productId,
        item.variantId,
        qty,
        input.organizationId
      );
      unitPricePaise = resolved.unitPricePaise;
    }

    const customizationFeePaise = item.customizationFeePaise || 0;
    const discountPercent = Math.min(100, Math.max(0, item.discountPercent || 0));

    const grossSubtotal = unitPricePaise * qty;
    const discountAmount = Math.round((grossSubtotal * discountPercent) / 100);
    const lineSubtotalPaise = grossSubtotal - discountAmount;
    const lineCustomizationPaise = customizationFeePaise * qty;
    const lineTaxablePaise = lineSubtotalPaise + lineCustomizationPaise;

    const taxRate = product.taxRate || 18;
    const lineTaxPaise = Math.round((lineTaxablePaise * taxRate) / 100);
    const lineTotalPaise = lineTaxablePaise + lineTaxPaise;

    itemsSubtotalPaise += lineSubtotalPaise;
    customizationTotalPaise += lineCustomizationPaise;
    lineTaxTotalAggregatePaise += lineTaxPaise;

    quoteItems.push({
      id: `qitem_${crypto.randomUUID()}`,
      quoteId,
      productId: item.productId,
      variantId: item.variantId || null,
      productName: product.name,
      variantName: item.variantId ? 'Custom Corporate Edition' : null,
      sku: item.sku || product.sku || `SKU-${product.id}`,
      hsnCode: product.hsnCode || '69120010',
      taxRatePercent: taxRate,
      quantity: qty,
      unitPricePaise,
      customizationFeePaise,
      discountPercent,
      lineSubtotalPaise: BigInt(lineSubtotalPaise),
      lineTaxPaise: BigInt(lineTaxPaise),
      lineTotalPaise: BigInt(lineTotalPaise),
      personalizationDetails: item.personalizationDetails || null,
    });
  }

  const discountTotalPaise = 0;
  const taxableAmountPaise = itemsSubtotalPaise + customizationTotalPaise - discountTotalPaise;
  const shippingTotalPaise = input.shippingTotalPaise || 0;
  const taxTotalPaise = lineTaxTotalAggregatePaise;
  const grandTotalPaise = taxableAmountPaise + taxTotalPaise + shippingTotalPaise;

  // Split IGST vs Intra-state (assume IGST for B2B inter-state default or split 50/50)
  const igstPaise = taxTotalPaise;
  const cgstPaise = 0;
  const sgstPaise = 0;

  const quoteRecord = {
    id: quoteId,
    quoteNumber,
    revision,
    isLatestRevision: true,
    rfqId: input.rfqId || null,
    organizationId: input.organizationId,
    createdById: adminUserId,
    status: 'ISSUED' as QuoteStatus,
    validUntil,
    itemsSubtotalPaise: BigInt(itemsSubtotalPaise),
    customizationTotalPaise: BigInt(customizationTotalPaise),
    discountTotalPaise: BigInt(discountTotalPaise),
    taxableAmountPaise: BigInt(taxableAmountPaise),
    taxTotalPaise: BigInt(taxTotalPaise),
    cgstPaise: BigInt(cgstPaise),
    sgstPaise: BigInt(sgstPaise),
    igstPaise: BigInt(igstPaise),
    shippingTotalPaise: BigInt(shippingTotalPaise),
    grandTotalPaise: BigInt(grandTotalPaise),
    commercialTerms: input.commercialTerms?.trim() || 'Payment: 100% advance. Delivery: 7-10 business days.',
    customerNotes: input.customerNotes?.trim() || null,
    internalAdminNotes: input.internalAdminNotes?.trim() || null,
    approvedById: null,
    approvedAt: null,
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    items: quoteItems,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const created = await prisma.corporateQuote.create({
      data: {
        id: quoteRecord.id,
        quoteNumber: quoteRecord.quoteNumber,
        revision: quoteRecord.revision,
        isLatestRevision: true,
        rfqId: quoteRecord.rfqId,
        organizationId: quoteRecord.organizationId,
        createdById: adminUserId,
        status: quoteRecord.status,
        validUntil: quoteRecord.validUntil,
        itemsSubtotalPaise: quoteRecord.itemsSubtotalPaise,
        customizationTotalPaise: quoteRecord.customizationTotalPaise,
        discountTotalPaise: quoteRecord.discountTotalPaise,
        taxableAmountPaise: quoteRecord.taxableAmountPaise,
        taxTotalPaise: quoteRecord.taxTotalPaise,
        cgstPaise: quoteRecord.cgstPaise,
        sgstPaise: quoteRecord.sgstPaise,
        igstPaise: quoteRecord.igstPaise,
        shippingTotalPaise: quoteRecord.shippingTotalPaise,
        grandTotalPaise: quoteRecord.grandTotalPaise,
        commercialTerms: quoteRecord.commercialTerms,
        customerNotes: quoteRecord.customerNotes,
        internalAdminNotes: quoteRecord.internalAdminNotes,
        items: {
          create: quoteItems.map((qi) => ({
            id: qi.id,
            productId: qi.productId,
            variantId: qi.variantId,
            productName: qi.productName,
            variantName: qi.variantName,
            sku: qi.sku,
            hsnCode: qi.hsnCode,
            taxRatePercent: qi.taxRatePercent,
            quantity: qi.quantity,
            unitPricePaise: qi.unitPricePaise,
            customizationFeePaise: qi.customizationFeePaise,
            discountPercent: qi.discountPercent,
            lineSubtotalPaise: qi.lineSubtotalPaise,
            lineTaxPaise: qi.lineTaxPaise,
            lineTotalPaise: qi.lineTotalPaise,
            personalizationDetails: qi.personalizationDetails,
          })),
        },
      },
      include: { items: true },
    });

    if (input.rfqId) {
      await updateCorporateRFQStatus(input.rfqId, 'QUOTED', adminUserId);
    }

    return created;
  } catch {
    // DB fallback
  }

  DEV_CORPORATE_QUOTES_STORE.set(quoteId, quoteRecord);

  if (input.rfqId) {
    const rfq = DEV_CORPORATE_RFQS_STORE.get(input.rfqId);
    if (rfq) {
      rfq.status = 'QUOTED';
      rfq.quotedAt = now;
      rfq.reviewedById = adminUserId;
      DEV_CORPORATE_RFQS_STORE.set(input.rfqId, rfq);
    }
  }

  return quoteRecord;
}

export async function reviseCorporateQuote(
  quoteId: string,
  input: ReviseQuoteInput,
  adminUserId: string
): Promise<any> {
  const previousQuote = await getCorporateQuote(quoteId, undefined, true);

  if (previousQuote.status === 'ACCEPTED') {
    throw new CorporateValidationError(
      'Cannot revise an already ACCEPTED quotation. Accepted quotations are legally locked.'
    );
  }

  // Mark previous quote as superseded
  previousQuote.isLatestRevision = false;
  previousQuote.status = 'SUPERSEDED';

  const newRevisionNumber = previousQuote.revision + 1;
  const newQuoteId = `quote_${crypto.randomUUID()}`;
  const now = new Date();

  const itemsToUse: QuoteItemInput[] = input.items || previousQuote.items.map((i: any) => ({
    productId: i.productId,
    variantId: i.variantId,
    sku: i.sku,
    quantity: i.quantity,
    unitPricePaise: i.unitPricePaise,
    customizationFeePaise: i.customizationFeePaise,
    discountPercent: i.discountPercent,
    personalizationDetails: i.personalizationDetails,
  }));

  const validUntil = input.validUntil ? new Date(input.validUntil) : previousQuote.validUntil;

  // Create new revision using createCorporateQuote logic with same quoteNumber
  const newQuote = await createCorporateQuote(
    {
      rfqId: previousQuote.rfqId,
      organizationId: previousQuote.organizationId,
      validUntil: validUntil.toISOString(),
      commercialTerms: input.commercialTerms ?? previousQuote.commercialTerms,
      customerNotes: input.customerNotes ?? previousQuote.customerNotes,
      internalAdminNotes: input.internalAdminNotes ?? previousQuote.internalAdminNotes,
      shippingTotalPaise: input.shippingTotalPaise ?? Number(previousQuote.shippingTotalPaise),
      items: itemsToUse,
    },
    adminUserId
  );

  // Preserve same quoteNumber and increment revision number
  newQuote.quoteNumber = previousQuote.quoteNumber;
  newQuote.revision = newRevisionNumber;

  DEV_CORPORATE_QUOTES_STORE.set(quoteId, previousQuote);
  DEV_CORPORATE_QUOTES_STORE.set(newQuote.id, newQuote);

  return newQuote;
}

export async function getCorporateQuote(
  quoteId: string,
  userOrgId?: string,
  isStaff: boolean = false
): Promise<any> {
  let quote: any = null;
  try {
    quote = await prisma.corporateQuote.findUnique({
      where: { id: quoteId },
      include: {
        items: true,
        organization: true,
        rfq: true,
      },
    });
  } catch {
    // DB fallback
  }

  if (!quote) {
    quote = DEV_CORPORATE_QUOTES_STORE.get(quoteId);
  }

  if (!quote) throw new CorporateNotFoundError(`Quotation "${quoteId}" not found.`);

  // Tenant isolation: if not staff, must strictly match organization
  if (!isStaff) {
    if (!userOrgId || quote.organizationId !== userOrgId) {
      throw new CorporatePermissionError('Access denied: Quotation does not belong to your organization.');
    }
  }

  // Strip internal notes if not staff
  if (!isStaff) {
    const { internalAdminNotes, ...sanitized } = quote;
    return sanitized;
  }

  return quote;
}

export async function listCorporateQuotes(
  orgId?: string,
  isStaff: boolean = false,
  statusFilter?: QuoteStatus
): Promise<any[]> {
  try {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (statusFilter) where.status = statusFilter;
    const list = await prisma.corporateQuote.findMany({
      where,
      orderBy: [{ quoteNumber: 'desc' }, { revision: 'desc' }],
      include: { items: true, organization: true },
    });
    if (list && list.length > 0) {
      if (!isStaff) {
        return list.map(({ internalAdminNotes, ...rest }) => rest);
      }
      return list;
    }
  } catch {
    // DB fallback
  }

  let list = Array.from(DEV_CORPORATE_QUOTES_STORE.values());
  if (orgId) list = list.filter((q) => q.organizationId === orgId);
  if (statusFilter) list = list.filter((q) => q.status === statusFilter);

  if (!isStaff) {
    return list.map(({ internalAdminNotes, ...rest }) => rest);
  }
  return list;
}

export async function respondToCorporateQuote(
  quoteId: string,
  orgId: string,
  userId: string,
  decision: 'ACCEPT' | 'REJECT',
  comments?: string
): Promise<any> {
  // APPROVAL WORKFLOW: Only APPROVER or OWNER can accept or reject
  const { org, membership } = await verifyCorporatePermission(orgId, userId, ['OWNER', 'APPROVER']);

  if (org.status !== 'APPROVED') {
    throw new CorporatePermissionError('Corporate account is not APPROVED. Cannot accept quotations.');
  }

  const quote = await getCorporateQuote(quoteId, orgId, false);

  if (!quote.isLatestRevision) {
    throw new CorporateValidationError(
      'Cannot act on a superseded quotation revision. Please review the latest active revision.'
    );
  }

  if (quote.status === 'ACCEPTED') {
    return quote; // Idempotent acceptance
  }

  if (quote.status === 'REJECTED') {
    throw new CorporateStateError('This quotation has already been rejected.');
  }

  if (quote.status !== 'ISSUED') {
    throw new CorporateStateError(`Quotation in status "${quote.status}" is not eligible for response.`);
  }

  const now = new Date();
  if (new Date(quote.validUntil) < now) {
    quote.status = 'EXPIRED';
    DEV_CORPORATE_QUOTES_STORE.set(quoteId, quote);
    throw new CorporateValidationError('This quotation has expired and can no longer be accepted.');
  }

  if (decision === 'ACCEPT') {
    quote.status = 'ACCEPTED';
    quote.approvedById = userId;
    quote.approvedAt = now;
    quote.rejectionReason = null;

    if (quote.rfqId) {
      try {
        await updateCorporateRFQStatus(quote.rfqId, 'ACCEPTED', undefined, {
          customerNotes: `Accepted by ${membership.role} (${userId})`,
        });
      } catch {
        const rfq = DEV_CORPORATE_RFQS_STORE.get(quote.rfqId);
        if (rfq) rfq.status = 'ACCEPTED';
      }
    }
  } else {
    if (!comments || comments.trim().length < 5) {
      throw new CorporateValidationError('A rejection reason of at least 5 characters is required.');
    }
    quote.status = 'REJECTED';
    quote.rejectedById = userId;
    quote.rejectedAt = now;
    quote.rejectionReason = comments.trim();
  }

  quote.updatedAt = now;

  try {
    const updated = await prisma.corporateQuote.update({
      where: { id: quoteId },
      data: {
        status: quote.status,
        approvedById: quote.approvedById,
        approvedAt: quote.approvedAt,
        rejectedById: quote.rejectedById,
        rejectedAt: quote.rejectedAt,
        rejectionReason: quote.rejectionReason,
      },
      include: { items: true },
    });
    return updated;
  } catch {
    // DB fallback
  }

  DEV_CORPORATE_QUOTES_STORE.set(quoteId, quote);
  return quote;
}

// ============================================================================
// CSV BULK ORDERING PARSER & VALIDATOR
// ============================================================================

export const MAX_CSV_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_CSV_ROW_COUNT = 500;

export function parseAndValidateCorporateCsv(csvContent: string): CsvValidationSummary {
  if (!csvContent || typeof csvContent !== 'string') {
    throw new CorporateValidationError('CSV content cannot be empty.');
  }

  if (Buffer.byteLength(csvContent, 'utf-8') > MAX_CSV_FILE_SIZE_BYTES) {
    throw new CorporateValidationError(
      `CSV file exceeds maximum allowable size of ${MAX_CSV_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
    );
  }

  const rawLines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length < 2) {
    throw new CorporateValidationError('CSV file must contain a header row and at least one data row.');
  }

  // Parse Header
  const headerRow = rawLines[0];
  const headers = headerRow
    .split(',')
    .map((h) => sanitizeCsvField(h.replace(/^["']|["']$/g, '')).toLowerCase());

  const requiredHeaders = [
    'recipient name',
    'recipient phone',
    'product sku',
    'quantity',
    'address line 1',
    'city',
    'state',
    'pin code',
  ];

  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      throw new CorporateValidationError(
        `Missing required CSV header: "${req}". Provided headers: [${headers.join(', ')}].`
      );
    }
  }

  const nameIdx = headers.indexOf('recipient name');
  const phoneIdx = headers.indexOf('recipient phone');
  const emailIdx = headers.indexOf('recipient email');
  const skuIdx = headers.indexOf('product sku');
  const qtyIdx = headers.indexOf('quantity');
  const addr1Idx = headers.indexOf('address line 1');
  const addr2Idx = headers.indexOf('address line 2');
  const cityIdx = headers.indexOf('city');
  const stateIdx = headers.indexOf('state');
  const pinIdx = headers.indexOf('pin code');
  const deptIdx = headers.indexOf('department');
  const noteIdx = headers.indexOf('personalization note');

  const dataLines = rawLines.slice(1);
  if (dataLines.length > MAX_CSV_ROW_COUNT) {
    throw new CorporateValidationError(
      `CSV file contains ${dataLines.length} rows, which exceeds the limit of ${MAX_CSV_ROW_COUNT} rows.`
    );
  }

  const validatedRows: CsvRowValidation[] = [];
  const skuBreakdown: Record<string, { quantity: number; productName: string }> = {};
  const duplicateMap = new Set<string>();

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2; // 1-indexed, accounting for header
    const cols = dataLines[i].split(',').map((c) => sanitizeCsvField(c.replace(/^["']|["']$/g, '')));

    const errors: string[] = [];
    const recipientName = cols[nameIdx] || '';
    const recipientPhone = (cols[phoneIdx] || '').replace(/\D/g, '');
    const recipientEmail = emailIdx !== -1 ? cols[emailIdx] : '';
    const sku = (cols[skuIdx] || '').toUpperCase();
    const qtyParsed = parseInt(cols[qtyIdx] || '0', 10);
    const street = cols[addr1Idx] || '';
    const street2 = addr2Idx !== -1 ? cols[addr2Idx] : '';
    const city = cols[cityIdx] || '';
    const state = cols[stateIdx] || '';
    const pincode = cols[pinIdx] || '';
    const department = deptIdx !== -1 ? cols[deptIdx] : '';
    const personalizationNote = noteIdx !== -1 ? cols[noteIdx] : '';

    if (!recipientName || recipientName.length < 2) {
      errors.push('Recipient name must be at least 2 characters.');
    }

    if (!recipientPhone || recipientPhone.length < 10) {
      errors.push('Recipient phone must be a valid 10-digit number.');
    }

    if (recipientEmail && !recipientEmail.includes('@')) {
      errors.push('Recipient email is invalid.');
    }

    if (!sku) {
      errors.push('Product SKU is required.');
    }

    let foundProduct: any = null;
    if (sku) {
      foundProduct = INITIAL_PRODUCTS.find(
        (p) =>
          (p.sku && p.sku.toUpperCase() === sku) ||
          p.id.toUpperCase() === sku ||
          `SKU-${p.id}`.toUpperCase() === sku
      );
      if (!foundProduct) {
        errors.push(`SKU "${sku}" does not match any valid catalog product.`);
      }
    }

    if (isNaN(qtyParsed) || qtyParsed < 1) {
      errors.push('Quantity must be an integer greater than 0.');
    }

    if (!street || street.length < 5) {
      errors.push('Address Line 1 must be at least 5 characters.');
    }

    if (!city || city.length < 2) {
      errors.push('City is required.');
    }

    if (!state || state.length < 2) {
      errors.push('State is required.');
    }

    const stateCode = resolveStateCode(state) || '08';

    if (!isValidIndianPincode(pincode)) {
      errors.push(`Invalid 6-digit PIN code: "${pincode}".`);
    }

    // Duplicate detection based on phone + SKU + address
    const dupKey = `${recipientPhone}_${sku}_${pincode}`.toLowerCase();
    if (duplicateMap.has(dupKey)) {
      errors.push('Duplicate row detected: Identical recipient phone, SKU, and PIN code.');
    } else {
      duplicateMap.add(dupKey);
    }

    const isValid = errors.length === 0;

    if (isValid && foundProduct) {
      if (!skuBreakdown[sku]) {
        skuBreakdown[sku] = { quantity: 0, productName: foundProduct.name };
      }
      skuBreakdown[sku].quantity += qtyParsed;
    }

    validatedRows.push({
      rowNumber: rowNum,
      recipientName,
      recipientPhone,
      recipientEmail: recipientEmail || undefined,
      sku,
      quantity: qtyParsed,
      street,
      street2: street2 || undefined,
      city,
      state,
      stateCode,
      pincode,
      department: department || undefined,
      personalizationNote: personalizationNote || undefined,
      isValid,
      errors,
      productName: foundProduct?.name,
      productId: foundProduct?.id,
    });
  }

  const validRowsCount = validatedRows.filter((r) => r.isValid).length;
  const invalidRowsCount = validatedRows.length - validRowsCount;

  return {
    totalRows: validatedRows.length,
    validRowsCount,
    invalidRowsCount,
    rows: validatedRows,
    skuBreakdown,
    errors: validatedRows.flatMap((r) => r.errors.map((e) => `Row ${r.rowNumber}: ${e}`)),
  };
}

// ============================================================================
// MULTI-ADDRESS CORPORATE ORDER GROUP CREATION
// ============================================================================

export async function createCorporateOrderGroup(
  orgId: string,
  userId: string,
  input: CreateCorporateOrderGroupInput
): Promise<any> {
  const { org } = await verifyCorporatePermission(orgId, userId, ['OWNER', 'REQUESTER', 'APPROVER']);

  if (org.status !== 'APPROVED') {
    throw new CorporatePermissionError('Corporate account is not APPROVED.');
  }

  const quote = await getCorporateQuote(input.quoteId, orgId, false);

  if (quote.status !== 'ACCEPTED') {
    throw new CorporateValidationError(
      `Quotation "${quote.quoteNumber}" must be in ACCEPTED status to generate orders. Current status: ${quote.status}.`
    );
  }

  // Prevent duplicate order generation for same quote
  if (DEV_CORPORATE_ORDER_GROUPS_STORE.has(quote.id)) {
    throw new CorporateValidationError(
      `An order group has already been created for quotation "${quote.quoteNumber}".`
    );
  }

  if (!input.allocations || !Array.isArray(input.allocations) || input.allocations.length === 0) {
    throw new CorporateValidationError('At least one delivery allocation is required.');
  }

  // RECONCILIATION: Check that total allocated quantity matches quote items exactly
  const quoteQuantityMap: Record<string, number> = {};
  for (const qItem of quote.items) {
    quoteQuantityMap[qItem.productId] = (quoteQuantityMap[qItem.productId] || 0) + qItem.quantity;
  }

  const allocatedQuantityMap: Record<string, number> = {};
  for (const alloc of input.allocations) {
    if (!alloc.recipientName || alloc.recipientName.length < 2) {
      throw new CorporateValidationError('Recipient name is required in all delivery allocations.');
    }
    if (!alloc.recipientPhone || alloc.recipientPhone.replace(/\D/g, '').length < 10) {
      throw new CorporateValidationError('Valid 10-digit phone number is required in all delivery allocations.');
    }
    if (!isValidIndianPincode(alloc.pincode)) {
      throw new CorporateValidationError(`Invalid PIN code "${alloc.pincode}" in delivery allocation.`);
    }
    if (alloc.quantity < 1) {
      throw new CorporateValidationError('Allocation quantity must be at least 1 unit.');
    }

    allocatedQuantityMap[alloc.productId] =
      (allocatedQuantityMap[alloc.productId] || 0) + alloc.quantity;
  }

  for (const [prodId, qQty] of Object.entries(quoteQuantityMap)) {
    const aQty = allocatedQuantityMap[prodId] || 0;
    if (aQty !== qQty) {
      throw new CorporateValidationError(
        `Quantity mismatch for product "${prodId}": Quote has ${qQty} units, but allocations sum to ${aQty} units.`
      );
    }
  }

  const groupOrderNumber = `CORP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const groupId = `cgrp_${crypto.randomUUID()}`;
  const now = new Date();

  // Create child orders for each unique delivery allocation
  const childOrders: any[] = [];
  const createdAllocations: any[] = [];

  let destIndex = 1;
  for (const alloc of input.allocations) {
    const destStateCode = alloc.stateCode || resolveStateCode(alloc.state) || '08';

    // Find quote item for pricing snapshot
    const matchedQuoteItem = quote.items.find((qi: any) => qi.productId === alloc.productId);
    const unitPricePaise = matchedQuoteItem ? matchedQuoteItem.unitPricePaise : 100000;
    const taxRate = matchedQuoteItem ? matchedQuoteItem.taxRatePercent : 18;

    const lineSubtotalPaise = unitPricePaise * alloc.quantity;
    const lineTaxPaise = Math.round((lineSubtotalPaise * taxRate) / 100);
    const allocatedTotalPaise = lineSubtotalPaise + lineTaxPaise;

    const childOrderId = `order_${crypto.randomUUID()}`;
    const childOrderNumber = `${groupOrderNumber}-${String(destIndex).padStart(2, '0')}`;

    const childOrder: SanitizedOrderResult = {
      id: childOrderId,
      orderNumber: childOrderNumber,
      userId,
      type: 'B2B',
      gstin: org.gstin || null,
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID', // Linked to corporate group payment
      paymentMethod: input.paymentMethod || 'CORPORATE_BILLING',
      customerName: alloc.recipientName,
      customerEmail: alloc.recipientEmail || org.companyEmail,
      customerPhone: alloc.recipientPhone,
      destinationStateCode: destStateCode,
      items: [
        {
          id: `item_${crypto.randomUUID()}`,
          productName: matchedQuoteItem?.productName || 'Corporate Gift Item',
          sku: alloc.sku,
          hsnCode: matchedQuoteItem?.hsnCode || '69120010',
          taxRatePercent: taxRate,
          unitPricePaise,
          quantity: alloc.quantity,
          subtotalPaise: lineSubtotalPaise,
          customizationNote: alloc.customGiftNote || null,
          proofImageUrl: null,
          customizationMeta: null,
          personalization: null,
        },
      ],
      itemsSubtotalPaise: lineSubtotalPaise,
      taxTotalPaise: lineTaxPaise,
      cgstPaise: destStateCode === RAJASTHAN_STATE_CODE ? Math.floor(lineTaxPaise / 2) : 0,
      sgstPaise:
        destStateCode === RAJASTHAN_STATE_CODE
          ? lineTaxPaise - Math.floor(lineTaxPaise / 2)
          : 0,
      igstPaise: destStateCode === RAJASTHAN_STATE_CODE ? 0 : lineTaxPaise,
      shippingTotalPaise: 0,
      grandTotalPaise: allocatedTotalPaise,
      reservationExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      guestLookupToken: crypto.randomBytes(16).toString('hex'),
      createdAt: now.toISOString(),
      shipment: {
        carrierPartner: 'Delhivery B2B Corporate',
        awbNumber: `AWB${Math.floor(100000000 + Math.random() * 900000000)}`,
        trackingUrl: 'https://www.delhivery.com/track/package',
        dispatchStatus: 'MANIFEST_GENERATED',
        dispatchedAt: null,
        deliveredAt: null,
      },
    };

    DEV_ORDERS_STORE.set(childOrderId, childOrder);
    childOrders.push(childOrder);

    createdAllocations.push({
      id: `calloc_${crypto.randomUUID()}`,
      orderGroupId: groupId,
      childOrderId,
      recipientName: alloc.recipientName,
      recipientPhone: alloc.recipientPhone,
      recipientEmail: alloc.recipientEmail || null,
      street: alloc.street,
      city: alloc.city,
      state: alloc.state,
      stateCode: destStateCode,
      pincode: alloc.pincode,
      department: alloc.department || null,
      customGiftNote: alloc.customGiftNote || null,
      quantity: alloc.quantity,
      productId: alloc.productId,
      variantId: alloc.variantId || null,
      sku: alloc.sku,
      allocatedTotalPaise: BigInt(allocatedTotalPaise),
      shipmentStatus: 'MANIFEST_GENERATED',
      createdAt: now,
      updatedAt: now,
    });

    destIndex++;
  }

  const groupRecord = {
    id: groupId,
    groupOrderNumber,
    organizationId: orgId,
    quoteId: quote.id,
    createdById: userId,
    totalDestinations: input.allocations.length,
    totalQuantity: input.allocations.reduce((acc, a) => acc + a.quantity, 0),
    grandTotalPaise: quote.grandTotalPaise,
    paymentStatus: 'PAID',
    paymentMethod: input.paymentMethod || 'ONLINE_UPI',
    paymentReference: input.paymentReference || `PAY-CORP-${Date.now()}`,
    orders: childOrders,
    deliveryAllocations: createdAllocations,
    createdAt: now,
    updatedAt: now,
  };

  DEV_CORPORATE_ORDER_GROUPS_STORE.set(groupId, groupRecord);
  DEV_CORPORATE_ORDER_GROUPS_STORE.set(quote.id, groupRecord); // for quick lookup by quoteId

  return groupRecord;
}

export async function getCorporateOrderGroup(
  groupId: string,
  userOrgId?: string,
  isStaff: boolean = false
): Promise<any> {
  let group: any = null;
  try {
    group = await prisma.corporateOrderGroup.findUnique({
      where: { id: groupId },
      include: {
        deliveryAllocations: { include: { childOrder: true } },
        organization: true,
        quote: true,
      },
    });
  } catch {
    // DB fallback
  }

  if (!group) {
    group = DEV_CORPORATE_ORDER_GROUPS_STORE.get(groupId);
  }

  if (!group) {
    throw new CorporateNotFoundError(`Corporate order group "${groupId}" not found.`);
  }

  // Tenant isolation: if not staff, must strictly match organization
  if (!isStaff) {
    if (!userOrgId || group.organizationId !== userOrgId) {
      throw new CorporatePermissionError('Access denied: Order group does not belong to your organization.');
    }
  }

  return group;
}

export async function listCorporateOrderGroups(
  orgId?: string,
  isStaff: boolean = false
): Promise<any[]> {
  try {
    const where: any = {};
    if (orgId) where.organizationId = orgId;
    const list = await prisma.corporateOrderGroup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { deliveryAllocations: true, quote: true, organization: true },
    });
    if (list && list.length > 0) return list;
  } catch {
    // DB fallback
  }

  let list = Array.from(DEV_CORPORATE_ORDER_GROUPS_STORE.values());
  // Deduplicate if keyed by both groupId and quoteId
  const uniqueMap = new Map<string, any>();
  for (const g of list) {
    uniqueMap.set(g.id, g);
  }
  list = Array.from(uniqueMap.values());

  if (orgId) {
    list = list.filter((g) => g.organizationId === orgId);
  }

  return list;
}
