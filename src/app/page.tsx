import React from 'react';
import Link from 'next/link';
import { 
  Building2, Sparkles, Smartphone, ShieldCheck, 
  MapPin, MessageSquare, ArrowRight, Activity, Zap, CheckCircle2
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl z-0" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex justify-between items-center relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-cyan-500 rounded-xl">
            <Building2 className="h-6 w-6 text-slate-950" />
          </div>
          <span className="font-extrabold text-xl tracking-wide text-white">CivicEcho</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline text-xs text-slate-400 font-semibold tracking-wider uppercase bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">Command Center Online</span>
          <Link 
            href="/auth" 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-700 transition"
          >
            Access Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 md:py-24 grid lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left: Text & CTA */}
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          
          <div className="inline-flex items-center space-x-2 bg-slate-800/60 border border-slate-700/85 px-4 py-1.5 rounded-full text-cyan-400 text-xs font-bold">
            <Sparkles className="h-4 w-4" />
            <span>AI-Driven Public Administration Ecosystem</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-none text-white">
            Voice your disruptions. <br className="hidden sm:inline" />
            Accelerate <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">municipal action</span>.
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            CivicEcho is a state-of-the-art citizen response dashboard. Submit issues via voice dictation, upload media, drag pins, and watch our deep learning pipeline instantly categorize, prioritize, and dispatch reports directly to field agencies.
          </p>

          {/* Action portals */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <Link
              href="/auth"
              className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-2xl shadow-xl hover:shadow-cyan-500/20 hover:scale-[1.02] transition duration-200 flex items-center justify-center space-x-2 text-sm"
            >
              <span>Submit A Complaint</span>
              <Smartphone className="h-5 w-5" />
            </Link>

            <Link
              href="/auth"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition flex items-center justify-center space-x-2 text-sm"
            >
              <span>Command Console</span>
              <ArrowRight className="h-5 w-5 text-slate-500" />
            </Link>
          </div>

          {/* Mini Trust Badges */}
          <div className="pt-6 border-t border-slate-800/60 max-w-xl mx-auto lg:mx-0 grid grid-cols-3 gap-4 text-xs text-slate-500 font-semibold">
            <div className="flex items-center space-x-1.5 justify-center lg:justify-start">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
              <span>SLA Compliant</span>
            </div>
            <div className="flex items-center space-x-1.5 justify-center lg:justify-start">
              <ShieldCheck className="h-4.5 w-4.5 text-cyan-500 shrink-0" />
              <span>OTP Secured</span>
            </div>
            <div className="flex items-center space-x-1.5 justify-center lg:justify-start">
              <Activity className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
              <span>94% SLA Adhered</span>
            </div>
          </div>

        </div>

        {/* Right: Immersive Tech Feature Showcase Dashboard */}
        <div className="lg:col-span-5 relative">
          
          <div className="bg-slate-850/80 border border-slate-850/80 p-6 rounded-3xl shadow-2xl relative z-10 glassmorphism space-y-6">
            
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-4">
              <div className="flex items-center space-x-2">
                <span className="h-2.5 w-2.5 bg-rose-500 rounded-full animate-ping"></span>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-400">Live AI Routing Loop</span>
              </div>
              <span className="text-[10px] bg-cyan-500/10 px-2 py-0.5 rounded font-bold text-cyan-400">Incident active</span>
            </div>

            {/* Simulated AI card */}
            <div className="space-y-4 text-xs">
              <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Citizen Report:</span>
                  <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.2 rounded text-[9px] uppercase">Dictated</span>
                </div>
                <p className="italic text-slate-300">"Pothole causing near crashes on sector 2 highway..."</p>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-slate-300">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">1</div>
                  <span className="flex-1">Category match: <strong>Road Issues</strong></span>
                  <span className="text-slate-500 text-[10px]">98% Confidence</span>
                </div>

                <div className="flex items-center space-x-3 text-slate-300">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">2</div>
                  <span className="flex-1">Priority predict: <strong className="text-rose-400">High</strong></span>
                  <span className="text-slate-500 text-[10px]">Traffic disruption risk</span>
                </div>

                <div className="flex items-center space-x-3 text-slate-300">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">3</div>
                  <span className="flex-1">Geo match check: <strong>No duplicates found</strong></span>
                  <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] uppercase">Cleared</span>
                </div>
              </div>

              {/* Action output */}
              <div className="bg-cyan-500/10 p-4 border border-cyan-500/20 rounded-2xl space-y-1">
                <span className="text-cyan-400 font-bold uppercase tracking-wider block text-[10px]">Routed Destination:</span>
                <p className="font-bold text-white text-sm">Public Works Department (PWD)</p>
                <p className="text-[10px] text-slate-400 mt-1">Status changed: Under Review → Assigned</p>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-slate-800/80 text-center text-xs text-slate-600 font-semibold relative z-10 flex flex-col sm:flex-row sm:justify-between gap-2">
        <span>© 2026 Ministry of Municipal Administration & Digital Governance</span>
        <div className="flex items-center justify-center space-x-4">
          <Link href="/auth" className="hover:text-slate-400">Citizen Auth</Link>
          <span>•</span>
          <Link href="/auth" className="hover:text-slate-400">Admin Command</Link>
        </div>
      </footer>

    </div>
  );
}
