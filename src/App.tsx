'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { PersonalizationStudio } from './components/PersonalizationStudio';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { CorporatePortal } from './components/b2b/CorporatePortal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { TaxInvoiceModal } from './components/TaxInvoiceModal';
import { Footer } from './components/Footer';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import {
  Sparkles,
  ChevronDown,
  Gift,
  Building2,
  Star,
  CheckCircle2,
  Clock,
  Heart,
  Crown,
  ShieldCheck,
  Award,
  Layers,
  Search,
  Filter
} from 'lucide-react';

const MainContent: React.FC = () => {
  const {
    mode,
    products,
    selectedProduct,
    setSelectedProduct,
    activeModal,
    setActiveModal,
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    activeOccasion,
    setActiveOccasion,
    toast,
    addToCart,
    showToast
  } = useApp();

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'newest'>('featured');
  const [visibleCount, setVisibleCount] = useState<number>(8);

  // Reset pagination when search or filters change
  React.useEffect(() => {
    setVisibleCount(8);
  }, [searchQuery, activeCategory, activeOccasion, sortBy]);

  // Filter products by category, occasion, and search query
  const filteredProducts = products.filter(p => {
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.occasion && p.occasion.some(o => o.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesOccasion = activeOccasion === 'All' || p.occasion.includes(activeOccasion);

    return matchesSearch && matchesCategory && matchesOccasion;
  });

  // Apply sorting
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') return a.basePrice - b.basePrice;
    if (sortBy === 'price_desc') return b.basePrice - a.basePrice;
    if (sortBy === 'newest') return b.id.localeCompare(a.id);
    return (b.isB2BRecommended ? 1 : 0) - (a.isB2BRecommended ? 1 : 0);
  });

  const displayedProducts = sortedProducts.slice(0, visibleCount);

  const categories = [
    'All',
    'Personalized Gifts',
    'Home Decor',
    'Soft Toys',
    'Luxury Gifts',
    'Gift Hampers',
    'Corporate Kits',
    'Stationery & Desk'
  ];

  const occasions = [
    'All',
    'Birthday',
    'Anniversary',
    'Corporate',
    'Diwali',
    'Wedding',
    'Valentine',
    'Farewell'
  ];

  const faqs = [
    {
      q: 'How does the laser engraving and hot-foil personalization process work?',
      a: 'Once you choose a personalized gift, you can type the recipient name or upload a company logo in our Live Personalization Studio. Our artisans in our Ajmer Craft Lab preview the digital proof and engrave it using fiber-laser precision with zero fading, followed by complimentary gold-foil gift wrapping.'
    },
    {
      q: 'Do you deliver across India with guaranteed damage-free packaging?',
      a: 'Yes! We ship to over 24,000 Indian PIN codes via BlueDart Air Express and Delhivery Logistics. Fragile items like ceramic mugs, scented candles, and hand-cast brass lanterns are cushioned in custom honeycomb shock-absorbing materials inside luxury keepsake boxes.'
    },
    {
      q: 'Can we order corporate welcome kits with custom company branding and split dispatches?',
      a: 'Absolutely! Our B2B Corporate Portal lets you upload company logos for debossing on drinkware, notebooks, and magnetic rigid boxes. You can also upload a recipient spreadsheet (CSV) to split-deliver gifts to 50 to 5,000 individual employee doorsteps across India with consolidated tracking.'
    },
    {
      q: 'Do you issue valid Indian GST Tax Invoices for corporate ITC tax credit?',
      a: 'Yes. Every corporate and B2C order receives an official GST Tax Invoice stating HSN codes, SAC, and CGST/SGST (intra-state Rajasthan) or IGST (inter-state). You can claim full Input Tax Credit (ITC).'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FCF9F6] text-slate-800 selection:bg-rose-200 selection:text-rose-950">
      
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === 'error'
            ? 'bg-[#4A0E17] text-white border border-rose-500/50'
            : toast.type === 'info'
            ? 'bg-slate-900 text-white border border-slate-700'
            : 'bg-[#2F0B10] text-amber-200 border border-amber-400/40'
        }`}>
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Persistent Global Header */}
      <Header />

      {/* Main Mode View Routing */}
      {mode === 'admin' ? (
        <AdminDashboard />
      ) : mode === 'b2b' ? (
        <CorporatePortal />
      ) : (
        /* B2C STOREFRONT */
        <main className="flex-1">
          {/* Hero Banner matching Ajmer Gift Charm visual inspiration */}
          <HeroBanner />

          {/* Catalog & Search Section */}
          <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
            
            {/* Filter Bar Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EADBCE] pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#A21D32]" />
                  <span className="text-[11px] font-bold text-[#A21D32] uppercase tracking-[0.2em] font-sans">
                    CURATED RAJASTHAN CATALOG
                  </span>
                </div>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2F0B10] tracking-tight">
                  Handcrafted with Love & Precision
                </h2>
              </div>

              {/* Filter Pills for Categories */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                      activeCategory === cat
                        ? 'bg-[#D1395E] text-white shadow-md'
                        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-[#FAF4EE] border border-[#EADBCE]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Occasion Filter Strip, Sort Control & Result Count */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs pb-1 text-slate-500">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="font-bold text-[#2F0B10] shrink-0 uppercase tracking-wider text-[10px]">
                  Occasion:
                </span>
                {occasions.map((occ) => (
                  <button
                    key={occ}
                    onClick={() => setActiveOccasion(occ)}
                    className={`px-3 py-1 rounded-full transition-all whitespace-nowrap text-xs ${
                      activeOccasion === occ
                        ? 'bg-[#D1395E] text-white font-bold shadow-xs'
                        : 'hover:text-[#D1395E] bg-white border border-[#EADBCE] text-slate-600'
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <label htmlFor="product-sort" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                    Sort:
                  </label>
                  <select
                    id="product-sort"
                    aria-label="Sort catalog products"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1 rounded-full border border-[#DFC9C0] bg-white text-xs font-semibold text-slate-700 hover:border-[#D1395E] focus:outline-hidden focus:ring-1 focus:ring-[#D1395E]"
                  >
                    <option value="featured">Featured Curations</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest Additions</option>
                  </select>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  Showing <strong>{Math.min(displayedProducts.length, sortedProducts.length)}</strong> of <strong>{sortedProducts.length}</strong> gifts
                  {searchQuery && <span> for "<strong>{searchQuery}</strong>"</span>}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {sortedProducts.length === 0 ? (
              <div className="text-center py-20 px-4 bg-white rounded-3xl border border-[#EADBCE] shadow-xs">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-[#A21D32] flex items-center justify-center mx-auto mb-3 border border-rose-200">
                  <Gift className="w-8 h-8" />
                </div>
                <h3 className="font-serif font-bold text-xl text-slate-900">
                  No matching treasures found
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-5">
                  Try adjusting your search terms or explore our popular personalized mugs and hampers.
                </p>
                <button
                  onClick={() => {
                    setActiveCategory('All');
                    setActiveOccasion('All');
                    setSearchQuery('');
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#2F0B10] text-amber-200 text-xs font-semibold hover:bg-[#4A0E17] transition-all shadow-xs"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayedProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenDetail={(prod) => {
                        setSelectedProduct(prod);
                        setActiveModal('product_detail');
                      }}
                      onOpenPersonalize={(prod) => {
                        setSelectedProduct(prod);
                        setActiveModal('personalize');
                      }}
                    />
                  ))}
                </div>

                {/* Pagination / Load More Button */}
                {visibleCount < sortedProducts.length && (
                  <div className="text-center pt-8">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 8)}
                      className="px-8 py-3 rounded-full bg-white border border-[#EADBCE] text-[#2F0B10] hover:border-[#D1395E] hover:bg-rose-50/50 text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
                    >
                      Load More Curated Gifts ({sortedProducts.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Artisan & Royal Heritage Featurette */}
          <section className="bg-gradient-to-r from-[#2A080C] via-[#481219] to-[#2A080C] text-white py-14 border-y border-amber-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/5 to-transparent animate-shimmer pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-300 text-xs font-mono uppercase tracking-wider">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>The Ajmer Artisan Charter</span>
                  </div>
                  <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                    Every Gift Has a Soul, <br />
                    <span className="italic font-script text-amber-300 text-4xl sm:text-5xl font-normal">
                      Every Box Tells a Story.
                    </span>
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                    Located in the heart of historical Ajmer, Rajasthan, our craft atelier fuses centuries-old regional metalwork and ceramic traditions with modern fiber-laser engraving technology. Whether it's a single mug for your soulmate or 2,000 corporate welcome kits, our master craftsmen hand-inspect each box before sealing.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/15 text-xs">
                    <div>
                      <div className="font-serif font-bold text-2xl text-amber-300">50K+</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">Delighted Givers</div>
                    </div>
                    <div>
                      <div className="font-serif font-bold text-2xl text-amber-300">450+</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">Enterprise Clients</div>
                    </div>
                    <div>
                      <div className="font-serif font-bold text-2xl text-amber-300">24K</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">PIN Codes Served</div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>The Ajmer Charm Quality Guarantee</span>
                  </div>

                  <ul className="space-y-3 text-xs text-slate-200">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Permanent Laser Engraving:</strong> Zero peeling or fading, lifetime readability.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Confidential Discreet Outer Boxes:</strong> Zero price tags or invoices visible to recipient.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Complete Transit Replacement:</strong> Instant dispatch if anything gets damaged in transit.</span>
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </section>

          {/* Customer Reviews & Social Proof */}
          <section className="bg-gradient-to-b from-[#FCF9F6] via-white to-[#FAF4EE] py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-[11px] font-bold text-[#A21D32] uppercase tracking-[0.25em]">
                  STORIES OF CELEBRATION
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2F0B10] mt-1">
                  Trusted by Over 50,000 Families & 450+ Corporates
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-7 rounded-3xl bg-white border border-[#EADBCE] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                  <div>
                    <div className="flex gap-1 text-amber-400 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                      "Ordered the Royale Gold-rim ceramic mug set with custom engraving for my parents' 30th anniversary. The gold detailing and electric warmer were exquisite! Delivered on time in Jaipur with zero breakage."
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-rose-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Dr. Meenakshi Rathore</div>
                      <div className="text-[11px] text-slate-400">Verified Gifting Buyer • Jaipur</div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                </div>

                <div className="p-7 rounded-3xl bg-white border border-[#EADBCE] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                  <div>
                    <div className="flex gap-1 text-amber-400 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                      "Ajmer Gift Charm handled our company's Diwali gifting for 320 employees across Delhi, Mumbai, and Bengaluru. The multi-address CSV dispatch and GST tax invoice made accounting seamless!"
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-rose-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Vikramaditya Roy</div>
                      <div className="text-[11px] text-slate-400">Head of People • Zephyr Cloud Labs</div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                      Corporate
                    </span>
                  </div>
                </div>

                <div className="p-7 rounded-3xl bg-white border border-[#EADBCE] shadow-sm flex flex-col justify-between hover:shadow-xl transition-all duration-300">
                  <div>
                    <div className="flex gap-1 text-amber-400 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                      "The brass lantern and soy candle hamper had the most divine rose aroma! The handwritten wax seal card made my best friend cry tears of joy. Truly Rajasthan's best gifting brand."
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-rose-50 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">Sneha Agarwal</div>
                      <div className="text-[11px] text-slate-400">Pune, Maharashtra</div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Frequently Asked Questions */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
            <div className="text-center mb-10">
              <span className="text-[11px] font-bold text-[#A21D32] uppercase tracking-[0.25em]">
                CONCIERGE ASSISTANCE
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2F0B10] mt-1">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3.5">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-[#EADBCE] bg-white overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between gap-4 font-serif font-bold text-sm sm:text-base text-slate-900 hover:text-[#A21D32] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-[#A21D32]' : ''}`} />
                  </button>
                  {activeFaq === idx && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-rose-50/70 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </main>
      )}

      {/* Global Modals Manager */}
      
      {/* 1. Cart Drawer */}
      {activeModal === 'cart' && (
        <CartDrawer
          onClose={() => setActiveModal('none')}
          onProceedToCheckout={() => setActiveModal('checkout')}
        />
      )}

      {/* 2. Checkout Modal */}
      {activeModal === 'checkout' && (
        <CheckoutModal
          onClose={() => setActiveModal('none')}
          onOrderSuccess={(ord) => {
            // Handled inside modal
          }}
        />
      )}

      {/* 3. Product Detail Modal */}
      {activeModal === 'product_detail' && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setActiveModal('none')}
          onOpenPersonalize={(prod) => {
            setSelectedProduct(prod);
            setActiveModal('personalize');
          }}
        />
      )}

      {/* 4. Live Personalization Studio */}
      {activeModal === 'personalize' && selectedProduct && (
        <PersonalizationStudio
          product={selectedProduct}
          onClose={() => setActiveModal('none')}
          onSave={(customization) => {
            addToCart(selectedProduct, 1, customization);
            setActiveModal('none');
            showToast('Personalized bespoke gift added to your bag! 🎁');
          }}
        />
      )}

      {/* 5. Order Tracking Modal */}
      {activeModal === 'order_track' && (
        <OrderTrackingModal
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 6. GST Tax Invoice Modal */}
      {activeModal === 'invoice_view' && (
        <TaxInvoiceModal
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Footer */}
      <Footer />

      {/* Floating WhatsApp Quick Contact Button */}
      <WhatsAppFloatingButton />

    </div>
  );
};

export { MainContent };

export default function App() {
  return <MainContent />;
}
