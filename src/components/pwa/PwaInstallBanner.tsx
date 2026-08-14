'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';

interface PwaInstallBannerProps {
  appName: string;
  manifestPath: string;
  themeColor?: string;
}

export default function PwaInstallBanner({
  appName,
  manifestPath,
  themeColor = '#10B981',
}: PwaInstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. Inject dynamic manifest link if not present
    if (typeof document !== 'undefined' && manifestPath) {
      let existingManifest = document.querySelector('link[rel="manifest"]');
      if (!existingManifest) {
        existingManifest = document.createElement('link');
        existingManifest.setAttribute('rel', 'manifest');
        document.head.appendChild(existingManifest);
      }
      existingManifest.setAttribute('href', manifestPath);
    }

    // 2. Check if already running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua) && !(/crios|fxios/i.test(ua));
    setIsIos(isIosDevice);

    // 4. Capture beforeinstallprompt for Android/Chrome/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [manifestPath]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-white/10 px-4 py-2.5 text-white flex items-center justify-between shadow-md relative z-40 transition-all">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-inner"
          style={{ backgroundColor: themeColor }}
        >
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs sm:text-sm text-white truncate">{appName}</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-400 shrink-0">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-gray-300 truncate">
            {isIos
              ? 'Tap Share ➔ "Add to Home Screen" to install app'
              : 'Install to home screen for 1-tap daily access'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg transition-transform active:scale-95 hover:opacity-90"
            style={{ backgroundColor: themeColor }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        )}

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
