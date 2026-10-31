'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  ShoppingCart,
  Heart,
  Award,
  Truck,
  Headphones,
  SlidersHorizontal,
  Gift,
  Building2,
  Settings,
  ChevronDown,
  Sparkles,
  Menu,
  X,
  MapPin,
  Clock,
  Package,
  User
} from 'lucide-react';
import { UserRole } from '../types';
import { AuthModal } from './AuthModal';

export const Header: React.FC = () => {
  const {
    mode,
    setMode,
    currentRole,
    setCurrentRole,
    cart,
    wishlist,
    setActiveModal,
    searchQuery,
    setSearchQuery,
    currentPincode,
    setActiveCategory
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setAuthenticatedUser(data.user);
        } else {
          setAuthenticatedUser(null);
        }
      })
      .catch(() => setAuthenticatedUser(null));
  }, []);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleRoleSelect = (role: UserRole) => {
    setCurrentRole(role);
    setRoleMenuOpen(false);
    if (role === 'admin' || role === 'warehouse_staff') {
      setMode('admin');
    } else if (role === 'b2b_client' || role === 'corporate_procurement') {
      setMode('b2b');
    } else {
      setMode('b2c');
    }
  };

  const trendingSearches = [
    'Personalized Gold Rim Mug',
    'Antique Brass Lantern',
    'Luxury Gift Hamper',
    'Soft Huggable Teddy Bear',
    'Designer Handbag & Watch',
    'Stationery & Planner Set'
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-[#F0E4DE] shadow-[0_4px_20px_rgba(180,60,80,0.03)] transition-all">
      
      {/* Top Utility Announcement & Mode Bar */}
      <div className="bg-[#FAF4F0] border-b border-[#F0E4DE] text-[11px] text-slate-600 py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[#A21D32] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Complimentary 24K Gold Hot-Foil Personalization & Pan-India Insured Express Shipping</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600">
              <MapPin className="w-3 h-3 text-[#A21D32]" />
              <span>Deliver to <strong>{currentPincode}</strong></span>
            </div>

            <span className="hidden md:inline text-slate-300">|</span>

            {/* Quick Mode & Role Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex p-0.5 rounded-full bg-white border border-[#E8D8D0] shadow-2xs text-[10.5px]">
                <button
                  onClick={() => setMode('b2c')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all ${
                    mode === 'b2c' ? 'bg-[#A21D32] text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  B2C Store
                </button>
                <button
                  onClick={() => setMode('b2b')}
                  className={`px-2.5 py-0.5 rounded-full font-semibold transition-all flex items-center gap-1 ${
                    mode === 'b2b' ? 'bg-[#2A080C] text-amber-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span>B2B Portal</span>
                </button>
                <button
                  onClick={() => setMode('admin')}
                  className={`px-2 py-0.5 rounded-full font-semibold transition-all ${
                    mode === 'admin' ? 'bg-amber-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Warehouse & Ops Portal"
                >
                  Ops
                </button>
              </div>

              {/* Role Simulation Pill */}
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[#E2D2CA] bg-white text-slate-700 text-[10.5px] font-medium hover:bg-slate-50 transition-colors"
                >
                  <SlidersHorizontal className="w-3 h-3 text-[#A21D32]" />
                  <span className="capitalize">{currentRole.replace('_', ' ')}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 mt-1 w-56 rounded-xl bg-white shadow-xl border border-rose-100 p-2 z-50 text-xs">
                    <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      Simulate Persona
                    </div>
                    <button
                      onClick={() => handleRoleSelect('b2c_customer')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                        currentRole === 'b2c_customer' ? 'bg-rose-50 text-[#881337] font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span>Individual Buyer</span>
                      <span className="text-[9px] bg-white border border-rose-200 px-1 rounded">B2C</span>
                    </button>
                    <button
                      onClick={() => handleRoleSelect('corporate_procurement')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                        currentRole === 'corporate_procurement' ? 'bg-rose-50 text-[#881337] font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span>Corporate Procurement</span>
                      <span className="text-[9px] bg-rose-100 text-rose-900 px-1 rounded font-bold">B2B</span>
                    </button>
                    <button
                      onClick={() => handleRoleSelect('admin')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                        currentRole === 'admin' ? 'bg-rose-50 text-[#881337] font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span>Super Administrator</span>
                      <span className="text-[9px] bg-amber-100 text-amber-900 px-1 rounded font-bold">HQ</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Container matching user's uploaded mockup */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-6">
          
          {/* 1. Left Logo with Pink Gift Box & Tagline */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => { setMode('b2c'); }}
              className="text-left group flex items-center gap-3 focus:outline-hidden"
            >
              {/* Pink Gift Box Icon */}
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#E25574] via-[#D1395E] to-[#B31D45] flex items-center justify-center text-white shadow-md shadow-rose-900/15 group-hover:scale-105 transition-all duration-300">
                <Gift className="w-5 h-5 text-white" />
                {/* Ribbon accents */}
                <div className="absolute -top-1 w-3 h-1.5 bg-amber-200 rounded-full opacity-80" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-serif font-black text-xl sm:text-2xl text-[#2F0B10] tracking-tight">
                    SNAPPY
                  </span>
                  <span className="font-serif font-black text-xl sm:text-2xl text-[#D1395E] tracking-tight">
                    GIFTS
                  </span>
                  <span className="text-[10px] bg-[#E8DDD8] text-[#55403B] font-bold px-1.5 py-0.5 rounded text-center leading-none tracking-wider ml-0.5">
                    .COM
                  </span>
                </div>
                <div className="text-[9px] tracking-[0.24em] text-[#8C6D68] font-bold uppercase mt-1 flex items-center gap-1">
                  <span>✦</span>
                  <span>GIFTS THAT CREATE MEMORIES</span>
                  <span>✦</span>
                </div>
              </div>
            </button>
          </div>

          {/* 2. Center Pill Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md lg:max-w-lg mx-2 relative">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for the perfect gift..."
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-5 pr-11 py-2.5 rounded-full border border-[#DFC9C0] bg-[#FAF6F4] hover:bg-white focus:bg-white text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D1395E]/20 focus:border-[#D1395E] text-slate-800 placeholder-[#9C827B] transition-all shadow-inner"
              />
              <button
                onClick={() => {
                  const el = document.getElementById('catalog-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="absolute right-3.5 top-2.5 text-[#55403B] hover:text-[#D1395E] transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-9 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Trending Suggestion Popover */}
            {searchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-rose-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Trending Bespoke Curations</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trendingSearches.map((term, i) => (
                    <button
                      key={i}
                      onMouseDown={() => {
                        setSearchQuery(term);
                        setSearchFocused(false);
                      }}
                      className="text-xs px-3 py-1 rounded-full bg-rose-50/80 hover:bg-rose-100/80 text-rose-950 border border-rose-200 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Right Trust Badges matching uploaded mockup */}
          <div className="flex items-center gap-5 lg:gap-7">
            
            {/* Feature 1: Premium Quality */}
            <div className="hidden lg:flex items-center gap-2 text-left">
              <div className="w-9 h-9 rounded-full bg-[#FAF3EC] text-amber-800 border border-amber-300/60 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-amber-700" />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-extrabold text-slate-900 uppercase tracking-tight font-sans">
                  PREMIUM
                </div>
                <div className="text-[10px] font-bold text-[#8C6D68] uppercase tracking-wider">
                  QUALITY
                </div>
              </div>
            </div>

            {/* Feature 2: Fast & Safe Delivery */}
            <div className="hidden lg:flex items-center gap-2 text-left">
              <div className="w-9 h-9 rounded-full bg-[#FAF3EC] text-amber-800 border border-amber-300/60 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 text-amber-800" />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-extrabold text-slate-900 uppercase tracking-tight font-sans">
                  FAST & SAFE
                </div>
                <div className="text-[10px] font-bold text-[#8C6D68] uppercase tracking-wider">
                  DELIVERY
                </div>
              </div>
            </div>

            {/* Feature 3: 24/7 Support */}
            <div className="hidden xl:flex items-center gap-2 text-left">
              <div className="w-9 h-9 rounded-full bg-[#FAF3EC] text-amber-800 border border-amber-300/60 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 text-amber-800" />
              </div>
              <div className="leading-tight">
                <div className="text-[11px] font-extrabold text-slate-900 uppercase tracking-tight font-sans">
                  24/7
                </div>
                <div className="text-[10px] font-bold text-[#8C6D68] uppercase tracking-wider">
                  SUPPORT
                </div>
              </div>
            </div>

            {/* Feature 4: Shop Now / Cart Bag Trigger */}
            <button
              onClick={() => setActiveModal('cart')}
              className="flex items-center gap-2.5 group focus:outline-hidden"
              title="View Shopping Bag"
              aria-label={`View shopping bag (${totalCartCount} items)`}
            >
              <div className="relative w-9 h-9 rounded-full bg-rose-50 border border-rose-200 text-[#D1395E] flex items-center justify-center group-hover:bg-[#D1395E] group-hover:text-white transition-all shadow-xs">
                <Gift className="w-5 h-5" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D1395E] group-hover:bg-[#2F0B10] text-white text-[9.5px] font-black rounded-full flex items-center justify-center shadow-xs">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <div className="text-[11px] font-extrabold text-[#D1395E] uppercase tracking-tight font-sans group-hover:text-[#B31D45]">
                  SHOP NOW
                </div>
                <div className="text-[10px] font-bold text-[#8C6D68] uppercase tracking-wider">
                  HAPPINESS
                </div>
              </div>
            </button>

            {/* Wishlist Icon */}
            <button
              onClick={() => { setMode('b2c'); }}
              className="relative p-2 text-slate-600 hover:text-[#D1395E] transition-colors"
              title="Wishlist"
              aria-label={`View wishlist (${wishlist.length} saved gifts)`}
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-[#D1395E] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Account / Auth Trigger */}
            <button
              onClick={() => setAuthModalOpen(true)}
              aria-label="Manage user account and active session"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-[#881337] text-xs font-semibold transition-all shadow-2xs"
              title="Account & Authentication"
            >
              <User className="w-4 h-4 text-[#A21D32]" />
              <span className="hidden md:inline">
                {authenticatedUser ? authenticatedUser.name.split(' ')[0] : 'Sign In'}
              </span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-rose-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search for the perfect gift..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-full border border-rose-200 bg-[#FAF6F4] text-xs focus:outline-hidden focus:bg-white text-slate-800"
            />
            <Search className="w-4 h-4 absolute right-3.5 top-2.5 text-[#D1395E]" />
          </div>
        </div>

      </div>

      {/* Quick Category Nav Strip */}
      <div className="bg-[#FAF2ED] border-t border-[#EBD6CC] text-xs px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-4 no-scrollbar">
          <div className="flex items-center gap-6 text-slate-700 font-semibold whitespace-nowrap text-[11.5px]">
            <button
              onClick={() => { setActiveCategory('Personalized Gifts'); setMode('b2c'); }}
              className="hover:text-[#D1395E] transition-colors flex items-center gap-1.5 text-[#4A0E17]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Personalized Keepsakes</span>
            </button>
            <button
              onClick={() => { setActiveCategory('Home Decor'); setMode('b2c'); }}
              className="hover:text-[#D1395E] transition-colors"
            >
              Home Decor & Lanterns
            </button>
            <button
              onClick={() => { setActiveCategory('Soft Toys'); setMode('b2c'); }}
              className="hover:text-[#D1395E] transition-colors"
            >
              Soft Plush Hugs
            </button>
            <button
              onClick={() => { setActiveCategory('Luxury Gifts'); setMode('b2c'); }}
              className="hover:text-[#D1395E] transition-colors"
            >
              Luxury Accessories
            </button>
            <button
              onClick={() => { setActiveCategory('Gift Hampers'); setMode('b2c'); }}
              className="hover:text-[#D1395E] transition-colors"
            >
              Curated Gift Hampers
            </button>
            <button
              onClick={() => { setActiveCategory('Stationery & Desk'); setMode('b2c'); }}
              className="hover:text-[#D1395E] transition-colors"
            >
              Stationery Essentials
            </button>
          </div>

          <div className="flex items-center gap-3 whitespace-nowrap text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-[#4A0E17]">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Same-Day Laser Dispatch from <strong>Ajmer Central</strong></span>
            </span>
            <span>•</span>
            <button 
              onClick={() => setActiveModal('order_track')}
              className="text-[#D1395E] font-bold hover:underline flex items-center gap-1"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Track Parcel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secure Auth & Persona Management Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => setAuthenticatedUser(user)}
      />

    </header>
  );
};
