import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { Maximize, Minimize, Wifi, WifiOff, Download, Award, ShoppingBag, CreditCard, FileText, Settings, TrendingUp } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  cartCount: number;
  onInstallPWA: () => void;
  canInstallPWA: boolean;
  isStandalone: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  cartCount,
  onInstallPWA,
  canInstallPWA,
  isStandalone
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0d0d11]/90 backdrop-blur-md border-b border-[#2a2a35] px-4 py-3 shadow-xl no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => setActiveView('products')} 
          className="cursor-pointer group flex items-center shrink-0"
        >
          <Logo variant="full" />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#141419] p-1 rounded-xl border border-[#2a2a35]">
          <button
            onClick={() => setActiveView('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'products' ? 'bg-[#d4af37] text-black font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Catalog</span>
          </button>

          <button
            onClick={() => setActiveView('invoices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'invoices' ? 'bg-[#d4af37] text-black font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices</span>
          </button>

          <button
            onClick={() => setActiveView('daily_sales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'daily_sales' ? 'bg-[#d4af37] text-black font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Daily Sales</span>
          </button>

          <button
            onClick={() => setActiveView('commission')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'commission' ? 'bg-[#d4af37] text-black font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Commissions</span>
          </button>

          <button
            onClick={() => setActiveView('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeView === 'admin' ? 'bg-[#d4af37] text-black font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </nav>

        {/* Status & Actions Controls */}
        <div className="flex items-center gap-2">
          
          {/* Online / Offline Status Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
              : 'bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline Mode</span>
              </>
            )}
          </div>

          {/* Install PWA Button */}
          {canInstallPWA && !isStandalone && (
            <button
              onClick={onInstallPWA}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#d4af37] to-[#aa7c11] text-[#0b0b0e] px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Install App</span>
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Full-screen Mode"}
            className="p-2 rounded-lg bg-[#181820] text-gray-300 hover:text-[#d4af37] hover:bg-[#22222d] border border-[#2d2d3a] transition-colors"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>

      </div>
    </header>
  );
};

