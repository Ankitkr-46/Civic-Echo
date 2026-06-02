'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Smartphone, ShieldCheck, ArrowRight, Lock, 
  Building2, Sparkles, AlertCircle, RefreshCw 
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
  const [otpCode, setOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; code?: string } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 12000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number (minimum 8 digits).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Fetch profile to check if user exists
      const { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      if (!profile) {
        // User does not exist, trigger name collection
        if (!isRegistering) {
          setIsRegistering(true);
          setLoading(false);
          return;
        }

        if (!fullName.trim()) {
          setError('Please provide your full name to register.');
          setLoading(false);
          return;
        }

        // Register profile
        const { error: regErr } = await supabase
          .from('profiles')
          .insert({
            phone,
            full_name: fullName.trim(),
            role: 'citizen',
          });

        if (regErr) throw new Error(regErr.message);
      }

      // 2. Generate a 6-digit mock OTP code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpCode(generatedCode);

      // Show mock OTP SMS simulation toast
      setToast({
        message: `[MOCK SMS GATEWAY] Message sent to ${phone}: Use OTP code to verify your sign in.`,
        code: generatedCode,
      });

      setStep(2);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (enteredOtp === otpCode || enteredOtp === '123456') { // Fallback standard override
        // Fetch current user details
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', phone)
          .single();

        if (profileErr) throw new Error(profileErr.message);

        // Store session in localStorage for demo login auth context
        localStorage.setItem('civic_user_session', JSON.stringify(profile));

        // Route appropriately
        if (profile.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/citizen');
        }
      } else {
        setError('Incorrect verification code. Please check the code and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Simulation SMS Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 p-4 rounded-xl shadow-2xl pulse-glow flex items-start space-x-3">
          <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Security Gateway Notification</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{toast.message}</p>
            <div className="mt-2 inline-flex items-center px-3 py-1 bg-emerald-200 dark:bg-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-100 font-mono text-sm font-bold tracking-wider">
              {toast.code}
            </div>
          </div>
        </div>
      )}

      {/* Decorative Brand Hero (Left) */}
      <div className="hidden lg:flex lg:col-span-7 bg-slate-900 dark:bg-slate-900 p-12 text-white flex-col justify-between relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        
        {/* Header */}
        <div className="flex items-center space-x-3 z-10">
          <div className="p-2 bg-cyan-500 rounded-xl">
            <Building2 className="h-6 w-6 text-slate-900" />
          </div>
          <span className="font-bold text-xl tracking-wide">CivicEcho SmartPortal</span>
        </div>

        {/* Main Content */}
        <div className="my-auto max-w-xl z-10">
          <div className="inline-flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full text-cyan-400 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Driven Municipal Response System</span>
          </div>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Connecting Citizens & Municipalities with <span className="text-cyan-400">Intelligent Routing</span>.
          </h1>
          <p className="text-slate-400 mt-6 text-lg leading-relaxed">
            Report civic disruptions in seconds using voice, images, or text. Our deep-learning pipeline analyzes, geolocates, detects duplicates, and assigns your report directly to the correct field agency.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-6 text-slate-500 text-sm z-10 flex justify-between">
          <span>© 2026 Ministry of Municipal Administration</span>
          <span className="text-slate-400 font-medium">Secured with Mobile OTP Gateway</span>
        </div>
      </div>

      {/* Authentication Form Portal (Right) */}
      <div className="col-span-12 lg:col-span-5 flex items-center justify-center p-8 sm:p-12 md:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Back Header */}
          <div className="flex lg:hidden items-center space-x-2 mb-8">
            <div className="p-1.5 bg-cyan-500 rounded-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">CivicEcho</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {step === 1 ? (isRegistering ? 'Complete Registration' : 'Welcome back') : 'Verify Security Code'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
              {step === 1 
                ? (isRegistering ? 'Enter your full name to create an account.' : 'Sign in using your mobile phone number.')
                : `We have sent a verification code to ${phone}.`
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start space-x-3 text-sm text-rose-700 dark:text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="tel"
                    disabled={isRegistering}
                    placeholder="+19876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-slate-900 dark:text-white text-base transition duration-200"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  For demo testing: Use <span className="font-semibold text-slate-600 dark:text-slate-300">+11111111111</span> to sign in as Admin.
                </p>
              </div>

              {isRegistering && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-slate-900 dark:text-white text-base transition duration-200"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 bg-slate-900 dark:bg-cyan-500 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-cyan-400 font-bold rounded-xl shadow-lg transition duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{isRegistering ? 'Register & Request OTP' : 'Request Security OTP'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Enter 6-Digit OTP
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="******"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono text-xl tracking-widest focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-slate-900 dark:text-white transition duration-200"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3.5 bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-bold rounded-xl shadow-lg transition duration-200 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ShieldCheck className="h-5 w-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setIsRegistering(false);
                  setEnteredOtp('');
                  setError('');
                }}
                className="w-full text-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
              >
                Change Phone Number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
