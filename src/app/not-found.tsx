import Link from 'next/link';
import { Gift } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCF9F6] text-slate-800 p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-50 text-[#A21D32] flex items-center justify-center mb-4 border border-rose-200 shadow-sm">
        <Gift className="w-8 h-8" />
      </div>
      <span className="text-[11px] font-bold text-[#A21D32] uppercase tracking-[0.25em] mb-1">
        404 — PAGE NOT FOUND
      </span>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2F0B10]">
        Treasure Not Found
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 mb-6">
        The curated gifting page or product you are looking for may have been moved, archived, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-[#2F0B10] text-amber-200 text-xs font-semibold hover:bg-[#4A0E17] transition-all shadow-sm"
      >
        Return to Snappy Gifts Catalog
      </Link>
    </div>
  );
}
