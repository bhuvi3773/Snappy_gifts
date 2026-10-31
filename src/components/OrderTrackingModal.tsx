import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Order } from '../types';
import {
  X,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Sparkles,
  FileText,
  ShieldCheck,
  Search,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface OrderTrackingModalProps {
  onClose: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ onClose }) => {
  const { orders, selectedOrder, setSelectedOrder, setActiveModal } = useApp();

  const [activeTab, setActiveTab] = useState<'current' | 'lookup'>('current');
  const [lookupOrderNumber, setLookupOrderNumber] = useState('');
  const [lookupContact, setLookupContact] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookedUpOrder, setLookedUpOrder] = useState<any | null>(null);

  // Authenticated customer orders fetched from server
  const [serverCustomerOrders, setServerCustomerOrders] = useState<any[]>([]);
  const [fetchingCustomerOrders, setFetchingCustomerOrders] = useState(false);

  // Customer proof approval states
  const [consentChecked, setConsentChecked] = useState<Record<string, boolean>>({});
  const [approvingProof, setApprovingProof] = useState<Record<string, boolean>>({});
  const [approvalError, setApprovalError] = useState<Record<string, string | null>>({});
  const [approvalSuccess, setApprovalSuccess] = useState<Record<string, string | null>>({});

  // Secure proof preview object URLs and loading state
  const [proofObjectUrls, setProofObjectUrls] = useState<Record<string, string>>({});
  const [proofLoading, setProofLoading] = useState<Record<string, boolean>>({});
  const [proofErrors, setProofErrors] = useState<Record<string, boolean>>({});
  const objectUrlsRef = useRef<Record<string, string>>({});

  const handleApproveProof = async (orderItemId: string, proofVersion: number) => {
    const orderNum = displayOrder?.orderNumber;
    if (!orderNum) return;

    setApprovalError(prev => ({ ...prev, [orderItemId]: null }));
    setApprovalSuccess(prev => ({ ...prev, [orderItemId]: null }));
    setApprovingProof(prev => ({ ...prev, [orderItemId]: true }));

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (displayOrder.guestLookupToken) {
        headers['x-guest-token'] = displayOrder.guestLookupToken;
      }

      const res = await fetch(`/api/orders/${encodeURIComponent(orderNum)}/proofs/${encodeURIComponent(orderItemId)}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          proofVersion,
          consent: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApprovalError(prev => ({
          ...prev,
          [orderItemId]: data.error || 'Failed to approve proof.',
        }));
      } else {
        setApprovalSuccess(prev => ({
          ...prev,
          [orderItemId]: `Proof v${proofVersion} successfully approved for production!`,
        }));

        // Immediately update state in UI
        const updateItem = (item: any) => {
          if (item.id === orderItemId && item.personalization) {
            return {
              ...item,
              personalization: {
                ...item.personalization,
                customerApprovalStatus: 'APPROVED',
                customerApprovedAt: new Date().toISOString(),
              },
            };
          }
          return item;
        };

        if (lookedUpOrder && Array.isArray(lookedUpOrder.items)) {
          setLookedUpOrder((prev: any) => ({
            ...prev,
            items: prev.items.map(updateItem),
          }));
        }
        if (selectedOrder && Array.isArray((selectedOrder as any).items)) {
          setSelectedOrder({
            ...selectedOrder,
            items: (selectedOrder as any).items.map(updateItem),
          } as any);
        }
      }
    } catch {
      setApprovalError(prev => ({
        ...prev,
        [orderItemId]: 'Network error while submitting proof approval. Please try again.',
      }));
    } finally {
      setApprovingProof(prev => ({ ...prev, [orderItemId]: false }));
    }
  };

  useEffect(() => {
    // Attempt fetching customer's real orders from /api/orders
    setFetchingCustomerOrders(true);
    fetch('/api/orders')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data && data.success && Array.isArray(data.data)) {
          setServerCustomerOrders(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setFetchingCustomerOrders(false));
  }, []);

  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setLookedUpOrder(null);

    const cleanNum = lookupOrderNumber.trim();
    const cleanContact = lookupContact.trim();

    if (!cleanNum || !cleanContact) {
      setLookupError('Please enter both Order Number and your matching Email or Phone.');
      return;
    }

    setLookupLoading(true);
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: cleanNum,
          contact: cleanContact,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || 'Failed to locate order.');
      } else {
        setLookedUpOrder(data.data);
      }
    } catch {
      setLookupError('Network error while querying order. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Determine current active order to display
  const currentOrder: Order = selectedOrder || orders[0];
  const displayOrder: any = lookedUpOrder || currentOrder;

  // Fetch secure proof image previews via fetch with x-guest-token header and manage object URLs
  useEffect(() => {
    let isCancelled = false;
    const abortController = new AbortController();

    if (!displayOrder || !Array.isArray(displayOrder.items)) {
      return;
    }

    const itemsToFetch = displayOrder.items.filter(
      (it: any) => it.personalization?.proofImageUrl || it.proofImageUrl
    );

    itemsToFetch.forEach(async (item: any) => {
      const proofUrl = item.personalization?.proofImageUrl || item.proofImageUrl;
      if (!proofUrl) return;

      // Revoke any existing object URL when replacing proof
      if (objectUrlsRef.current[item.id]) {
        try {
          URL.revokeObjectURL(objectUrlsRef.current[item.id]);
        } catch {}
        delete objectUrlsRef.current[item.id];
      }

      setProofLoading(prev => ({ ...prev, [item.id]: true }));
      setProofErrors(prev => ({ ...prev, [item.id]: false }));

      try {
        const headers: Record<string, string> = {};
        if (displayOrder.guestLookupToken) {
          headers['x-guest-token'] = displayOrder.guestLookupToken;
        }

        const res = await fetch(proofUrl, {
          method: 'GET',
          headers,
          credentials: 'same-origin',
          signal: abortController.signal,
        });

        if (!res.ok) {
          if (!isCancelled) {
            setProofErrors(prev => ({ ...prev, [item.id]: true }));
          }
          return;
        }

        const blob = await res.blob();
        if (isCancelled) return;

        const objUrl = URL.createObjectURL(blob);
        objectUrlsRef.current[item.id] = objUrl;

        setProofObjectUrls(prev => ({ ...prev, [item.id]: objUrl }));
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        if (!isCancelled) {
          setProofErrors(prev => ({ ...prev, [item.id]: true }));
        }
      } finally {
        if (!isCancelled) {
          setProofLoading(prev => ({ ...prev, [item.id]: false }));
        }
      }
    });

    // Cleanup: revoke all active object URLs on unmount or before next run
    return () => {
      isCancelled = true;
      abortController.abort();
      Object.values(objectUrlsRef.current).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      objectUrlsRef.current = {};
      setProofObjectUrls({});
    };
  }, [
    displayOrder?.id,
    displayOrder?.orderNumber,
    displayOrder?.guestLookupToken,
    displayOrder?.items
      ? displayOrder.items
          .map((i: any) => `${i.id}:${i.personalization?.proofImageUrl || i.proofImageUrl}:${i.personalization?.proofVersion}`)
          .join('|')
      : '',
  ]);

  const steps = [
    { title: 'Order Placed', desc: 'Payment verified & order booked' },
    { title: 'Artwork Approval', desc: 'Laser typography preview verified' },
    { title: 'In Customization', desc: 'Laser etching / UV printing in Ajmer Craft Lab' },
    { title: 'Quality Check', desc: 'Tamper-proof gift packaging & wax seal' },
    { title: 'Dispatched', desc: 'Handed to express logistics courier' },
    { title: 'In Transit', desc: 'On route to destination delivery hub' },
    { title: 'Delivered', desc: 'Safely handed over to recipient' }
  ];

  const getStepIndex = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
      case 'ORDER PLACED':
        return 0;
      case 'CONFIRMED':
      case 'ARTWORK APPROVAL':
        return 1;
      case 'IN_CUSTOMIZATION':
      case 'IN CUSTOMIZATION':
        return 2;
      case 'QUALITY_CHECK':
      case 'QUALITY CHECK':
        return 3;
      case 'DISPATCHED':
        return 4;
      case 'IN TRANSIT':
        return 5;
      case 'DELIVERED':
        return 6;
      default:
        return 0;
    }
  };

  const statusString = displayOrder?.orderStatus || 'PENDING';
  const activeIdx = getStepIndex(statusString);
  const shipment = displayOrder?.shipment || null;
  const awb = shipment?.awbNumber || displayOrder?.awbNumber || null;
  const carrier = shipment?.carrierPartner || displayOrder?.courierPartner || null;
  const trackingUrl = shipment?.trackingUrl || displayOrder?.trackingUrl || null;
  const isDispatchedOrDelivered = activeIdx >= 4;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-700/60 flex items-center justify-center text-amber-300">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="tracking-modal-title" className="font-serif font-bold text-lg">Live Shipment Tracking</h3>
              <p className="text-xs text-rose-200">
                Courier Partner: <span className="text-white font-semibold">{carrier || (isDispatchedOrDelivered ? 'Express Logistics' : 'Assigned Upon Dispatch')}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close tracking modal"
            className="p-1 rounded-full text-rose-300 hover:text-white hover:bg-rose-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Active Order vs Search Lookup */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('current'); setLookedUpOrder(null); }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'current'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              Recent Orders {orders.length > 0 ? `(${orders.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'lookup'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Track with Order # & Phone/Email</span>
            </button>
          </div>
          {fetchingCustomerOrders && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Syncing...
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* LOOKUP FORM TAB */}
          {activeTab === 'lookup' && !lookedUpOrder && (
            <form onSubmit={handleGuestLookup} className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-4 text-xs">
              <div>
                <h4 className="font-serif font-bold text-slate-900 text-sm">Guest & Order Lookup</h4>
                <p className="text-[11px] text-slate-500">
                  Enter your Snappy Gifts Order Number and matching Email or Mobile Phone to check real-time progress.
                </p>
              </div>

              {lookupError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SG-2026-10492"
                    value={lookupOrderNumber}
                    onChange={(e) => setLookupOrderNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Matching Email or Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rahul@example.com or 9876543210"
                    value={lookupContact}
                    onChange={(e) => setLookupContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={lookupLoading}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Order...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Track Shipment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* If looking up succeeded, show 'Search Another' banner */}
          {activeTab === 'lookup' && lookedUpOrder && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <span>Showing verified shipment status for <strong>{lookedUpOrder.orderNumber}</strong>.</span>
              <button
                onClick={() => { setLookedUpOrder(null); setLookupOrderNumber(''); }}
                className="font-bold underline hover:text-emerald-950"
              >
                Track Another
              </button>
            </div>
          )}

          {/* Order Selector (if multiple exist in context or from server) */}
          {activeTab === 'current' && (orders.length > 1 || serverCustomerOrders.length > 0) && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 font-semibold shrink-0">Select Order:</span>
              {(serverCustomerOrders.length > 0 ? serverCustomerOrders : orders).map((o: any) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`px-3 py-1 rounded-full font-mono font-semibold transition-all shrink-0 ${
                    displayOrder?.id === o.id
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {o.orderNumber}
                </button>
              ))}
            </div>
          )}

          {/* Shipment Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <span className="text-slate-500">AWB Tracking #</span>
                <div className="font-mono font-bold text-sm text-slate-900">
                  {awb || (
                    <span className="text-amber-700 font-sans text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pending Dispatch Assignment
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Current Fulfillment Status</span>
                <div className="font-bold text-emerald-700 text-sm">
                  {statusString.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Destination info */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2 text-slate-600">
              <span>
                Destination: {displayOrder?.shippingAddress?.city || 'City'}, {displayOrder?.shippingAddress?.state || 'State'} ({displayOrder?.shippingAddress?.pincode || 'PIN'})
              </span>
              <span>
                Recipient: {displayOrder?.shippingAddress?.name || displayOrder?.customerName}
              </span>
            </div>

            {/* External Carrier Link if tracking URL exists */}
            {trackingUrl && (
              <div className="pt-2 border-t border-slate-200 flex justify-end">
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-rose-700 hover:text-rose-800 font-semibold underline text-[11px]"
                >
                  <span>Track on {carrier || 'Courier'} Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Banner when tracking is not yet assigned */}
            {!awb && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-xl">
                ℹ️ <strong>Crafting in Progress:</strong> Your gift is undergoing artisan customization or quality inspection. Courier tracking details and express delivery dispatch notice will be issued once packed.
              </div>
            )}
          </div>

          {/* Personalized Items Proof Review & Approval */}
          {Array.isArray(displayOrder?.items) && displayOrder.items.some((it: any) => it.personalization || it.proofImageUrl) && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <h4 className="font-serif font-bold text-slate-900 text-sm">
                    Artisan Personalization & Customer Proof Review
                  </h4>
                </div>
                <span className="text-[10px] text-amber-800 bg-amber-100 font-medium px-2 py-0.5 rounded-full">
                  Atelier Verification
                </span>
              </div>

              <div className="space-y-4">
                {displayOrder.items
                  .filter((it: any) => it.personalization || it.proofImageUrl)
                  .map((item: any) => {
                    const pers = item.personalization;
                    const proofUrl = pers?.proofImageUrl || item.proofImageUrl;
                    const proofVer = pers?.proofVersion || 1;
                    const isApproved = pers?.customerApprovalStatus === 'APPROVED';
                    const isRework = pers?.staffReviewStatus === 'REJECTED_FOR_REWORK';
                    const isRevisedPending = !isApproved && proofVer > 1;

                    const previewBlobUrl = proofObjectUrls[item.id];
                    const isProofLoading = proofLoading[item.id];
                    const isProofFailed = proofErrors[item.id];

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{item.productName}</div>
                            {item.sku && <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              Proof v{proofVer}
                            </span>
                            {isApproved ? (
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Customer Approved</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
                                <Clock className="w-3 h-3 text-rose-600" />
                                <span>Pending Customer Approval</span>
                              </span>
                            )}
                            {isRework && (
                              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                                Staff Rework Requested
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Revised Proof Invalidation Notice */}
                        {isRevisedPending && (
                          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong>Revised Proof Notice (v{proofVer}):</strong> An updated design proof has been created.
                              Any earlier customer approval has been invalidated. Please review the updated preview below and submit your approval to authorize engraving for production.
                            </div>
                          </div>
                        )}

                        {/* Inscription preview info */}
                        {pers?.engravedText && (
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex flex-wrap justify-between gap-1 text-slate-700">
                            <div>
                              <span className="text-slate-400">Inscription: </span>
                              <span className="font-semibold text-slate-900">&ldquo;{pers.engravedText}&rdquo;</span>
                            </div>
                            {pers.fontFamily && (
                              <div>
                                <span className="text-slate-400">Typography: </span>
                                <span className="font-mono text-slate-800">{pers.fontFamily}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Visual Proof Preview */}
                        {proofUrl && (
                          <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-900/5 aspect-video max-h-48 flex items-center justify-center">
                            {isProofLoading ? (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                <span>Loading verified proof preview...</span>
                              </div>
                            ) : previewBlobUrl ? (
                              <>
                                <img
                                  src={previewBlobUrl}
                                  alt={`${item.productName} Proof Preview v${proofVer}`}
                                  className="max-h-full max-w-full object-contain"
                                />
                                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px]">
                                  Proof v{proofVer}
                                </div>
                              </>
                            ) : isProofFailed ? (
                              <div className="p-3 text-center text-xs text-slate-500 flex flex-col items-center gap-1">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span>Proof preview unavailable. Please check authorization or network.</span>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Approval Controls */}
                        {!isApproved ? (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                            {approvalError[item.id] && (
                              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{approvalError[item.id]}</span>
                              </div>
                            )}
                            {approvalSuccess[item.id] && (
                              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>{approvalSuccess[item.id]}</span>
                              </div>
                            )}

                            <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-700 select-none">
                              <input
                                type="checkbox"
                                checked={!!consentChecked[item.id]}
                                onChange={(e) =>
                                  setConsentChecked((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 rounded text-rose-700 focus:ring-rose-500"
                              />
                              <span>
                                I have inspected this exact proof design (v{proofVer}) and grant my consent to proceed with artisan laser crafting.
                              </span>
                            </label>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={!consentChecked[item.id] || approvingProof[item.id]}
                                onClick={() => handleApproveProof(item.id, proofVer)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 text-xs shadow-2xs"
                              >
                                {approvingProof[item.id] ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Recording Approval...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve Proof v{proofVer} for Production</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              <span>Proof design verified and authorized by customer for production etching.</span>
                            </span>
                            {pers?.customerApprovedAt && (
                              <span className="text-[10px] text-emerald-600">
                                {new Date(pers.customerApprovedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Stepper Timeline */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {steps.map((st, idx) => {
              const isDone = idx <= activeIdx;
              const isCurrent = idx === activeIdx;

              return (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Step circle */}
                  <div className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100 animate-pulse'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold ${isCurrent ? 'text-rose-950 font-serif text-sm' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                      {st.title}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] bg-rose-100 text-rose-800 font-normal px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Current Stage
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs">
            <button
              onClick={() => {
                setSelectedOrder(displayOrder);
                onClose();
                setActiveModal('invoice_view');
              }}
              className="text-rose-700 font-semibold hover:underline flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Download Tax Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              Close
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
