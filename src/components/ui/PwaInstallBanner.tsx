'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { usePwa } from '../providers/PwaProvider';
import { Download, X, Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import AdminButton from './AdminButton';
import ConsultationModal from './ConsultationModal';

export default function PwaInstallBanner() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  const { isInstallable, isInstalled, isIOS, installPwa } = usePwa();
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const [promoDismissed, setPromoDismissed] = useState(false);
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPwaDismissed = sessionStorage.getItem('growlic_pwa_dismissed') === 'true';
      if (isPwaDismissed) setPwaDismissed(true);

      const isPromoDismissed = sessionStorage.getItem('growlic_dev_promo_dismissed') === 'true';
      if (isPromoDismissed) setPromoDismissed(true);
    }
  }, []);

  const handleDismissPwa = () => {
    sessionStorage.setItem('growlic_pwa_dismissed', 'true');
    setPwaDismissed(true);
  };

  const handleDismissPromo = () => {
    sessionStorage.setItem('growlic_dev_promo_dismissed', 'true');
    setPromoDismissed(true);
  };

  const handleInstallPwa = async () => {
    await installPwa();
  };

  // 1. ADMIN ROUTE: Show Admin PWA Install Banner ONLY
  if (isAdminRoute) {
    const shouldShowPwa = (isInstallable || isIOS) && !isInstalled && !pwaDismissed;
    if (!shouldShowPwa) return null;

    return (
      <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-white border border-[#E2E6EA] rounded-2xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex gap-3 items-start">
          <div className="bg-[#FEF2F2] p-2.5 rounded-xl border border-[#C0181A]/10 text-[#C0181A] flex-shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase text-[#C0181A] tracking-wider bg-red-50 px-2 py-0.5 rounded-full border border-red-100 inline-block mb-1">
              ADMIN CONTROL APP
            </span>
            <h4 className="text-sm font-bold text-[#111827]">Install Growlic Admin PWA</h4>
            {isIOS ? (
              <div className="text-[12px] text-[#6B7280] mt-1.5 leading-relaxed space-y-1.5">
                <p>Install this app on your phone for fast admin management (asks for login):</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#374151] font-medium">
                  <li>Tap <span className="font-bold text-[#C0181A]">Share</span> in Safari (square with up arrow).</li>
                  <li>Tap <span className="font-bold text-[#C0181A]">Add to Home Screen</span>.</li>
                </ol>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-[#6B7280] mt-0.5 leading-relaxed">
                  Install the Growlic Admin App for instant kitchen, menu & order management. Requires admin login.
                </p>
                <div className="flex gap-2 mt-3">
                  <AdminButton size="sm" onClick={handleInstallPwa}>
                    Install Admin App
                  </AdminButton>
                  <button
                    onClick={handleDismissPwa}
                    className="px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F6F9] rounded-lg transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleDismissPwa}
            className="text-[#9CA3AF] hover:text-[#111827] p-0.5 rounded transition-colors flex-shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 2. USER / CUSTOMER QR ROUTE: No PWA popup! Show Developer Software Ad Popup instead!
  if (promoDismissed) return null;

  return (
    <>
      <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 max-w-md mx-auto bg-white/95 backdrop-blur-md border border-[#C0181A]/15 text-gray-900 rounded-2xl p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex gap-3 items-start">
          <div className="bg-[#C0181A]/5 text-[#C0181A] p-2.5 rounded-xl border border-[#C0181A]/15 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#C0181A]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-black uppercase text-[#C0181A] tracking-wider bg-[#C0181A]/10 border border-[#C0181A]/20 px-2 py-0.5 rounded-full inline-block mb-1.5">
              SOFTWARE & DIGITAL SOLUTIONS
            </span>
            <h4 className="text-sm font-extrabold text-gray-900 leading-snug">
              Your Business Deserves Better Software
            </h4>
            <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
              Custom websites, web portals, mobile apps & AI automation built to grow your business.
            </p>

            <div className="flex items-center gap-2 mt-3 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setConsultationModalOpen(true)}
                className="bg-[#C0181A] hover:bg-[#A01012] text-white text-xs font-bold px-3.5 py-2 rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Interested? Book Free Consultation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDismissPromo}
                className="px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>

          <button
            onClick={handleDismissPromo}
            className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors flex-shrink-0"
            aria-label="Dismiss advertisement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Qualification & Scope Questionnaire Consultation Modal */}
      <ConsultationModal
        isOpen={consultationModalOpen}
        onClose={() => setConsultationModalOpen(false)}
      />
    </>
  );
}
