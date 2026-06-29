'use client';

import React, { useState, useEffect } from 'react';
import { usePwa } from '../providers/PwaProvider';
import { Download, X } from 'lucide-react';
import AdminButton from './AdminButton';

export default function PwaInstallBanner() {
  const { isInstallable, isInstalled, isIOS, installPwa } = usePwa();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('growlic_pwa_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('growlic_pwa_dismissed', 'true');
    setDismissed(true);
  };

  const handleInstall = async () => {
    await installPwa();
  };

  const shouldShow = (isInstallable || isIOS) && !isInstalled && !dismissed;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md bg-white border border-[#E2E6EA] rounded-xl p-4 shadow-xl z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex gap-3 items-start">
        <div className="bg-[#FEF2F2] p-2.5 rounded-lg border border-[#C0181A]/10 text-[#C0181A] flex-shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-[#111827]">Add Growlic to Home Screen</h4>
          {isIOS ? (
            <div className="text-[12px] text-[#6B7280] mt-1.5 leading-relaxed space-y-1.5">
              <p>Install this app on your iPhone for fast, full-screen tracking:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#374151] font-medium">
                <li>Tap the <span className="font-bold text-[#C0181A]">Share</span> button in Safari (square with up arrow).</li>
                <li>Scroll down and tap <span className="font-bold text-[#C0181A]">Add to Home Screen</span>.</li>
              </ol>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-[#6B7280] mt-0.5 leading-relaxed">
                Install the app on your home screen or desktop for fast, offline-ready order and kitchen tracking.
              </p>
              <div className="flex gap-2 mt-3">
                <AdminButton size="sm" onClick={handleInstall}>
                  Install App
                </AdminButton>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-[#F4F6F9] rounded-lg transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#9CA3AF] hover:text-[#111827] p-0.5 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
