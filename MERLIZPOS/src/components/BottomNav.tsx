import React from 'react';
import { ViewMode } from '../types';
import { ShoppingBag, ShoppingCart, CreditCard, FileText, Settings, Award, TrendingUp } from 'lucide-react';

interface BottomNavProps {
  activeView: ViewMode;
  setActiveView: (view: ViewMode) => void;
  cartCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  setActiveView,
  cartCount
}) => {
  const navItems = [
    { id: 'products' as ViewMode, label: 'Products', icon: ShoppingBag },
    { id: 'cart' as ViewMode, label: 'Cart', icon: ShoppingCart, badge: cartCount },
    { id: 'daily_sales' as ViewMode, label: 'Sales', icon: TrendingUp },
    { id: 'invoices' as ViewMode, label: 'Invoices', icon: FileText },
    { id: 'admin' as ViewMode, label: 'Admin', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0e13]/95 backdrop-blur-xl border-t border-[#2a2a35] pb-safe pt-2 px-2 shadow-2xl no-print">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex flex-col items-center py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#d4af37]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0b0b0e] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-bounce">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium tracking-wider ${isActive ? 'font-bold text-[#d4af37]' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-5 h-0.5 bg-gold-gradient rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
