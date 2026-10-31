'use client';

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Gift,
  Heart,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Send,
  Building2,
  Sparkles,
  Crown
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setMode, setActiveModal, showToast } = useApp();
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      showToast('Welcome to the Ajmer Royal Circle! Your ₹100 welcome gift code is WELCOME100 🎉');
      setEmail('');
    }
  };

  return (
    <footer className="bg-gradient-to-b from-[#FCF9F6] via-[#FAF4EE] to-[#F5ECE5] border-t border-[#EADBCE] text-slate-700 text-xs">
      
      {/* Upper Main Footer Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4A0E17] via-[#881337] to-[#A21D32] flex items-center justify-center text-white shadow-md shadow-rose-950/20 border border-amber-300/40">
                <Crown className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-serif font-black text-xl text-[#2F0B10] tracking-tight">AJMER</span>
                  <span className="font-serif italic font-bold text-xl text-[#A21D32]">GIFT CHARM</span>
                </div>
                <div className="text-[9px] tracking-[0.2em] text-[#8C6D68] uppercase font-bold mt-1">
                  Royal Rajasthan Gifting Atelier
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
              Ajmer's premier luxury online gift studio and corporate bulk gifting house. We craft 24K gold-rim ceramic drinkware, laser-etched keepsakes, soy candles, brass lattice lanterns, festive hampers, and day-one employee onboarding kits with pan-India insured express logistics.
            </p>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#A21D32] shrink-0 mt-0.5" />
                <span>Atelier: 14, Ana Sagar Circular Road, Civil Lines, Ajmer, Rajasthan - 305001</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#A21D32] shrink-0" />
                <span>Corporate Desk: <strong>+91 98290 84721</strong> | Toll-Free: <strong>1800-202-GIFT</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#A21D32] shrink-0" />
                <span>concierge@ajmergiftcharm.com | corporate@ajmergiftcharm.com</span>
              </div>
            </div>
          </div>

          {/* Col 2: Occasion Gifting */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#2F0B10] uppercase tracking-wider">
              Bespoke Occasions
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li><button onClick={() => setMode('b2c')} className="hover:text-[#A21D32] transition-colors">Birthday Gifts & Decors</button></li>
              <li><button onClick={() => setMode('b2c')} className="hover:text-[#A21D32] transition-colors">Anniversary & Love Keepsakes</button></li>
              <li><button onClick={() => setMode('b2c')} className="hover:text-[#A21D32] transition-colors">Wedding & Engagement Hampers</button></li>
              <li><button onClick={() => setMode('b2c')} className="hover:text-[#A21D32] transition-colors">Diwali & Festive Baskets</button></li>
              <li><button onClick={() => setMode('b2c')} className="hover:text-[#A21D32] transition-colors">Housewarming & Pooja Diya Sets</button></li>
              <li><button onClick={() => setMode('b2c')} className="hover:text-[#A21D32] transition-colors">Farewell & Milestone Awards</button></li>
            </ul>
          </div>

          {/* Col 3: B2B Corporate Gifting */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#2F0B10] uppercase tracking-wider">
              Corporate Solutions
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li><button onClick={() => setMode('b2b')} className="hover:text-[#A21D32] font-bold text-[#4A0E17] transition-colors">Day-One Welcome Kits</button></li>
              <li><button onClick={() => setMode('b2b')} className="hover:text-[#A21D32] transition-colors">Custom Logo Merchandise</button></li>
              <li><button onClick={() => setMode('b2b')} className="hover:text-[#A21D32] transition-colors">Multi-Address Split Dispatch (CSV)</button></li>
              <li><button onClick={() => setMode('b2b')} className="hover:text-[#A21D32] transition-colors">Corporate Quotation (RFQ)</button></li>
              <li><button onClick={() => setMode('b2b')} className="hover:text-[#A21D32] transition-colors">GST Input Tax Credit (ITC)</button></li>
              <li><button onClick={() => setMode('b2b')} className="hover:text-[#A21D32] transition-colors">Approved Net-30 Corporate Credit</button></li>
            </ul>
          </div>

          {/* Col 4: Newsletter & Exclusive Perks */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-[#2F0B10] uppercase tracking-wider">
              The Royal Circle
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Join our private list for early access to Diwali catalogues, artisan releases, and an immediate ₹100 welcome voucher.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCC7BE] text-xs bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A21D32] pr-10"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 p-1.5 rounded-lg bg-[#2F0B10] hover:bg-[#4A0E17] text-amber-200 transition-colors shadow-2xs"
                  title="Subscribe"
                  aria-label="Subscribe to VIP atelier circle"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            <div className="pt-2">
              <span className="text-[10px] text-slate-400 block font-mono">
                GSTIN: 08AAACA9921M1Z3 • MSME Certified Udyam-RJ-01-XXXX
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Signature Pink Ribbon Banner matching inspiration screenshot */}
      <div className="bg-gradient-to-r from-[#991B1B] via-[#BE123C] to-[#881337] text-white text-xs sm:text-sm py-3.5 px-4 font-semibold shadow-inner border-y border-amber-300/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center">
          <div className="flex items-center gap-2 text-xs sm:text-sm tracking-widest uppercase font-medium">
            <Crown className="w-4 h-4 text-amber-300" />
            <span>GIFT MORE, WORRY LESS</span>
            <Heart className="w-3.5 h-3.5 fill-rose-200 text-rose-200" />
          </div>

          <div className="font-serif font-black tracking-[0.2em] text-sm sm:text-base text-amber-100 drop-shadow-xs">
            AJMERGIFTCHARM.COM
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm tracking-widest uppercase font-medium">
            <Heart className="w-3.5 h-3.5 fill-rose-200 text-rose-200" />
            <span>BECAUSE MEMORIES DESERVE THE BEST</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
        </div>
      </div>

      {/* Copyright row */}
      <div className="bg-[#FAF4EE] py-4 px-4 text-center text-[11.5px] text-slate-600 border-t border-[#EADBCE]">
        © 2026 Ajmer Gift Charm. All rights reserved. Handcrafted with royal pride in Ajmer, Rajasthan, India.
      </div>
    </footer>
  );
};
