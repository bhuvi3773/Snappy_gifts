'use client';

import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, ShieldCheck, KeyRound, ArrowRight, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'otp' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<'CUSTOMER' | 'B2B_CLIENT'>('CUSTOMER');
  
  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      fetch('/api/auth/me')
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          } else {
            setCurrentUser(null);
          }
        })
        .catch(() => setCurrentUser(null));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in.');
      }

      setCurrentUser(data.user);
      setSuccessMsg('Successfully signed in! Welcome back.');
      if (onAuthSuccess) onAuthSuccess(data.user);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role: accountType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setCurrentUser(data.user);
      setSuccessMsg('Account created successfully! Welcome to Snappy Gifts.');
      if (onAuthSuccess) onAuthSuccess(data.user);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'LOGIN' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      setOtpSent(true);
      setSuccessMsg(data.message || 'Verification code sent to your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode, purpose: 'LOGIN' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify code.');
      }

      setCurrentUser(data.user);
      setSuccessMsg('Code verified! You are now logged in.');
      if (onAuthSuccess) onAuthSuccess(data.user);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setSuccessMsg('You have been logged out.');
      setTimeout(() => onClose(), 1000);
    } catch {
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2F0B10] via-[#4A0E17] to-[#2F0B10] text-white p-6 relative">
          <button
            onClick={onClose}
            aria-label="Close authentication modal"
            className="absolute top-5 right-5 p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest font-mono">
              SECURE ACCESS
            </span>
          </div>
          <h3 id="auth-modal-title" className="font-serif text-2xl font-bold tracking-tight text-white">
            {currentUser ? 'Your Snappy Account' : 'Welcome to Snappy Gifts'}
          </h3>
          <p className="text-xs text-rose-200/80 mt-1">
            {currentUser 
              ? 'Manage your active session and role permissions.' 
              : 'Sign in to access corporate orders, order tracking, and bespoke personalization.'}
          </p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div role="alert" className="m-4 mb-0 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div role="alert" className="m-4 mb-0 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">
          {currentUser ? (
            /* Logged-In Account Info */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FCF9F6] border border-[#EADBCE] space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Name:</span>
                  <span className="font-bold text-slate-800">{currentUser.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Email:</span>
                  <span className="font-mono text-slate-800">{currentUser.email}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Assigned Role:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A21D32] text-white uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Email Status:</span>
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${currentUser.isEmailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {currentUser.isEmailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Snappy Gifts</span>
              </button>
            </div>
          ) : (
            /* Guest Auth Tabs */
            <div>
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 mb-5 text-xs font-semibold">
                <button
                  onClick={() => { setTab('login'); setErrorMsg(null); }}
                  className={`flex-1 pb-2.5 text-center transition-all ${
                    tab === 'login' ? 'border-b-2 border-[#A21D32] text-[#A21D32]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Password Login
                </button>
                <button
                  onClick={() => { setTab('otp'); setErrorMsg(null); }}
                  className={`flex-1 pb-2.5 text-center transition-all ${
                    tab === 'otp' ? 'border-b-2 border-[#A21D32] text-[#A21D32]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Email OTP
                </button>
                <button
                  onClick={() => { setTab('register'); setErrorMsg(null); }}
                  className={`flex-1 pb-2.5 text-center transition-all ${
                    tab === 'register' ? 'border-b-2 border-[#A21D32] text-[#A21D32]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Tab 1: Password Login */}
              {tab === 'login' && (
                <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#A21D32]/20 focus:border-[#A21D32] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#A21D32]/20 focus:border-[#A21D32] outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 rounded-xl bg-[#A21D32] text-white text-xs font-semibold hover:bg-[#851627] transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>{isLoading ? 'Authenticating...' : 'Sign In Securely'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Tab 2: OTP Login */}
              {tab === 'otp' && (
                <div className="space-y-3.5">
                  {!otpSent ? (
                    <form onSubmit={handleSendOtp} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Email Address for Code
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#A21D32]/20 focus:border-[#A21D32] outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 py-2.5 rounded-xl bg-[#A21D32] text-white text-xs font-semibold hover:bg-[#851627] transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'Sending...' : 'Send 6-Digit Code'}</span>
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Enter 6-Digit Code
                          </label>
                          <button
                            type="button"
                            onClick={() => setOtpSent(false)}
                            className="text-[10px] text-[#A21D32] hover:underline"
                          >
                            Change Email
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="w-full tracking-[8px] text-center font-mono font-bold text-lg py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#A21D32]/20 focus:border-[#A21D32] outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-2 py-2.5 rounded-xl bg-[#A21D32] text-white text-xs font-semibold hover:bg-[#851627] transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isLoading ? 'Verifying...' : 'Verify & Sign In'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Tab 3: Register */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#A21D32]/20 focus:border-[#A21D32] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#A21D32]/20 focus:border-[#A21D32] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Password (min 8 chars, 1 letter, 1 number)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#A21D32]/20 focus:border-[#A21D32] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Account Type
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setAccountType('CUSTOMER')}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          accountType === 'CUSTOMER' ? 'border-[#A21D32] bg-rose-50 text-[#A21D32] font-bold' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Individual (B2C)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('B2B_CLIENT')}
                        className={`p-2 rounded-xl border text-center font-medium transition-all ${
                          accountType === 'B2B_CLIENT' ? 'border-[#A21D32] bg-rose-50 text-[#A21D32] font-bold' : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Corporate (B2B)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 rounded-xl bg-[#A21D32] text-white text-xs font-semibold hover:bg-[#851627] transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
