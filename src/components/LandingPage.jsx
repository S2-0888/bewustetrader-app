import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const LandingPage = ({ onSignIn }) => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [pricingData, setPricingData] = useState([]);
  const [faqData, setFaqData] = useState([]);
  const [activeFaq, setActiveFaq] = useState(null);

  // --- EFFECT 1: Scroll Blokkade Fix ---
  useEffect(() => {
    // Forceer scrollen op de body en html bij laden
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    document.body.style.height = 'auto';

    return () => {
      // Reset naar 'geen scroll' wanneer je naar de login of dashboard gaat
      document.documentElement.style.overflowY = 'hidden';
      document.body.style.overflowY = 'hidden';
    };
  }, []);

  // --- EFFECT 2: Back to Top Button ---
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- EFFECT 3: Live Data uit Firestore ---
  useEffect(() => {
    // Haal Pricing op
    const unsubPricing = onSnapshot(collection(db, "site_content", "pricing", "plans"), (snap) => {
      const plans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPricingData(plans.length > 0 ? plans : [
        { id: 'default', name: "Founding Member", price: 12.50, oldPrice: 24.99, features: ["Unlimited Account Vaults", "TCT Shadow Sync", "Lifetime Status"] }
      ]);
    });

    // Haal FAQ op (gesorteerd op volgorde)
    const qFaq = query(collection(db, "site_content", "faq", "entries"), orderBy("order", "asc"));
    const unsubFaq = onSnapshot(qFaq, (snap) => {
      const faqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFaqData(faqs.length > 0 ? faqs : [
        { id: 'default', question: "Is this a Trade Copier?", answer: "No. Propfolio only reads history via secure scripts." }
      ]);
    });

    return () => { unsubPricing(); unsubFaq(); };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-green-500/30 overflow-x-hidden scroll-smooth">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/70 backdrop-blur-xl border-b border-white/5 px-8 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={scrollToTop}>
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_#22c55e]"></div>
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">Propfolio</span>
          </div>
          {/* AANPASSING: Gebruik onSignIn voor de login knop */}
          <button onClick={onSignIn} className="text-[10px] font-bold uppercase tracking-widest border border-white/20 px-6 py-2 rounded-lg hover:bg-white hover:text-black transition-all">
            Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-32 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1)_0%,rgba(0,0,0,0)_70%)]">
        <div className="text-center max-w-5xl mb-16">
          <div className="inline-block px-4 py-1.5 mb-8 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            Monitoring Active.
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.95]">
            Master Your <br />
            <span className="text-white/30 italic text-5xl md:text-7xl leading-tight">Trading Shadow.</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            We don't manage your trades; we manage the trader behind them. Unmask the behavioral truths you've been ignoring.
          </p>
          {/* AANPASSING: Gebruik onSignIn voor de grote CTA knop */}
          <button onClick={onSignIn} className="inline-block bg-white text-black px-12 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.15)]">
            Start Journaling Your Journey
          </button>
        </div>

        {/* Central HUD Preview */}
        <div className="w-full max-w-5xl px-4 mb-24 relative group">
          <div className="relative rounded-[40px] border border-white/10 bg-zinc-900/60 overflow-hidden shadow-2xl">
            <img src="/Cockpit Datas insight.png" alt="Cockpit" className="w-full h-auto block opacity-40 transition-opacity group-hover:opacity-50" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-10 rounded-[32px] text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                  <div className="w-6 h-6 bg-green-500 rounded-full animate-[pulse_3s_infinite_ease-in-out] shadow-[0_0_20px_#22c55e]"></div>
                </div>
                <div className="text-green-500 font-mono text-[10px] tracking-[0.5em] uppercase mb-2">TCT Shadow Sync</div>
                <div className="text-white/60 font-mono text-xs uppercase tracking-widest animate-pulse italic">Identifying Blind Spots...</div>
              </div>
            </div>

            <div className="absolute top-8 left-8 flex gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500/40"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/40"></div>
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
            </div>
            
            <div className="absolute bottom-8 left-8 hidden md:block">
              <div className="text-[10px] font-mono text-white/30 tracking-tighter uppercase">Propfolio Terminal v2.6 // Session: 06-01-2026</div>
            </div>
          </div>
        </div>
      </header>

      {/* The Hard Truth Section */}
      <section className="py-32 px-6 bg-zinc-950/40 border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-10 tracking-tighter">
            Stop trading in the dark.<br /><span className="text-green-500">Turn on the lights.</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-12 text-left mt-16">
            <div className="p-8 bg-zinc-900/60 border border-white/5 border-l-4 border-l-red-500/50 rounded-3xl hover:bg-zinc-900 transition-colors">
              <h4 className="text-red-500 font-bold uppercase text-xs tracking-widest mb-4">The Shadow</h4>
              <p className="text-gray-400 leading-relaxed">
                Most traders repeat the same emotional mistakes, hoping for a different result. They know what's wrong, but they can't see the pattern.
              </p>
            </div>
            <div className="p-8 bg-zinc-900/60 border border-white/5 border-l-4 border-l-green-500/50 rounded-3xl hover:bg-zinc-900 transition-colors">
              <h4 className="text-green-500 font-bold uppercase text-xs tracking-widest mb-4">The Lens</h4>
              <p className="text-gray-400 leading-relaxed">
                TCT identifies exactly where your shadow takes the wheel. It forces plan adherence by telling you what you don't want to hear.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-48 px-6 max-w-7xl mx-auto space-y-48">
        {/* Vault */}
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-green-500/10 blur-[60px] rounded-full group-hover:bg-green-500/15 transition-all"></div>
            <div className="relative bg-zinc-900/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all group-hover:scale-[1.01]">
              <img src="/Vault create your account.png" alt="Vault" className="w-full h-auto block opacity-90" />
            </div>
          </div>
          <div>
            <div className="text-green-500 font-black text-6xl mb-6 opacity-10 uppercase italic">Vault</div>
            <h3 className="text-4xl font-bold mb-6 tracking-tight uppercase italic">The Account Vault</h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Manage every prop firm account from initial purchase to final payout. Consolidate FTMO and other firm data in one strategic command center.
            </p>
          </div>
        </div>

        {/* Trade Lab */}
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div className="md:order-last relative group">
            <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-full group-hover:bg-blue-500/15 transition-all"></div>
            <div className="relative bg-zinc-900/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all group-hover:scale-[1.01]">
              <img src="/Tradelab Plan your trade.png" alt="Lab" className="w-full h-auto block opacity-90" />
            </div>
          </div>
          <div>
            <div className="text-blue-500 font-black text-6xl mb-6 opacity-10 uppercase italic">Lab</div>
            <h3 className="text-4xl font-bold mb-6 tracking-tight uppercase italic">The Trade Lab</h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Execute with plan adherence. Sync MT5/cTrader executions and use protocol checklists to eliminate emotional "shadow" trades before they happen.
            </p>
          </div>
        </div>

        {/* Finance */}
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-purple-500/10 blur-[60px] rounded-full group-hover:bg-purple-500/15 transition-all"></div>
            <div className="relative bg-zinc-900/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all group-hover:scale-[1.01]">
              <img src="/Finance Control.png" alt="Finance" className="w-full h-auto block opacity-90" />
            </div>
          </div>
          <div>
            <div className="text-purple-500 font-black text-6xl mb-6 opacity-10 uppercase italic">Control</div>
            <h3 className="text-4xl font-bold mb-6 tracking-tight uppercase italic">Capital Harvest</h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              Visualize your realized profit, total harvest, and yearly momentum. Transform your trading income into strategic wealth management.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 bg-black border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter italic">Join the Inner Circle</h2>
          <p className="text-gray-500 mb-16 text-sm">Support development and master your shadow at a fraction of the cost.</p>
          
          <div className="grid md:grid-cols-1 max-w-md mx-auto gap-8">
            {pricingData.map((plan) => (
              <div key={plan.id} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-[32px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                <div className="relative bg-zinc-900/60 p-12 rounded-[32px] border border-white/10 text-center">
                  <div className="text-green-500 font-bold uppercase text-[10px] tracking-[0.3em] mb-4">{plan.name}</div>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    {plan.oldPrice && <span className="text-gray-600 text-xl line-through font-bold">${plan.oldPrice}</span>}
                    <span className="text-5xl font-black tracking-tighter">${plan.price}</span>
                    <span className="text-gray-500 text-sm">/mo</span>
                  </div>
                  <ul className="text-left space-y-4 mb-10">
                    {plan.features?.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={onSignIn} className="block w-full bg-white text-black py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all">
                    Join BETA Phase
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 border-t border-white/5 bg-zinc-950/20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black mb-12 tracking-tighter uppercase italic text-center">
            Frequently Asked <span className="text-white/30 text-2xl">Questions</span>
          </h2>
          <div className="space-y-4">
            {faqData.map((faq, index) => (
              <div key={faq.id} className="bg-zinc-900/40 rounded-2xl border border-white/5 overflow-hidden">
                <button 
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full p-6 flex justify-between items-center text-left"
                >
                  <span className="font-bold text-sm uppercase tracking-widest">{faq.question}</span>
                  <svg className={`w-4 h-4 transition-transform ${activeFaq === index ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out ${activeFaq === index ? 'max-h-96 opacity-100 p-6 pt-0' : 'max-h-0 opacity-0'}`}>
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 border-t border-white/5 text-center bg-black">
        <div className="text-[9px] font-bold tracking-[0.5em] uppercase text-gray-700">
          Propfolio.app &copy; 2026 — Start Journaling Your Journey
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button 
          onClick={scrollToTop} 
          className="fixed bottom-8 right-8 z-[60] p-4 bg-white/10 border border-white/10 rounded-full backdrop-blur-lg text-white hover:bg-white/20 hover:scale-110 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
            <path d="M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"></path>
          </svg>
        </button>
      )}
    </div>
  );
};

export default LandingPage;