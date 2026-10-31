'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[NEXT_APP_ERROR]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCF9F6] text-slate-800 p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-50 text-[#A21D32] flex items-center justify-center mb-4 border border-rose-200 shadow-sm">
        <AlertCircle className="w-8 h-8" />
      </div>
      <span className="text-[11px] font-bold text-[#A21D32] uppercase tracking-[0.25em] mb-1">
        APPLICATION ERROR
      </span>
      <h1 className="font-serif text-3xl font-bold text-[#2F0B10]">
        Something Went Wrong
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-2 mb-6">
        An unexpected error occurred while loading this page. Our engineering team has been notified.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2.5 rounded-full bg-[#A21D32] text-white text-xs font-semibold hover:bg-[#851627] transition-all shadow-sm flex items-center gap-2 mx-auto"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try Again</span>
      </button>
    </div>
  );
}
