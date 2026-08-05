import React, { useState, useEffect } from 'react';
import { Download, Sparkles, X, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => console.log('[SW] Service Worker registered:', reg.scope))
        .catch((err) => console.error('[SW] Service worker registration failed:', err));
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner if not dismissed before
      if (!localStorage.getItem('merliz_pwa_dismissed')) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('merliz_pwa_dismissed', 'true');
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 bg-[#141419] border border-[#d4af37]/60 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3 animate-slide-up no-print">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gold-gradient p-0.5 shrink-0">
          <div className="w-full h-full bg-[#0b0b0e] rounded-[10px] flex items-center justify-center text-[#d4af37]">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>
        <div>
          <h4 className="font-cinzel font-bold text-sm text-gold-gradient flex items-center gap-1">
            <span>Install MerLiz App</span>
            <Sparkles className="w-3.5 h-3.5" />
          </h4>
          <p className="text-xs text-gray-300">
            Install on home screen for full-screen offline access & POS.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-gold-gradient text-[#0b0b0e] font-bold px-3 py-1.5 rounded-xl text-xs shadow hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-300 p-1 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
