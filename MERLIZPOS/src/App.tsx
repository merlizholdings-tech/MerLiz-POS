import React, { useState, useEffect } from 'react';
import { ViewMode, Product, CartItem, Invoice } from './types';
import { getProducts, getCart, saveCart, clearCart as clearStorageCart } from './utils/storage';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ProductList } from './components/ProductList';
import { CartView } from './components/CartView';
import { CheckoutView } from './components/CheckoutView';
import { InvoiceView } from './components/InvoiceView';
import { AdminView } from './components/AdminView';
import { CommissionDashboard } from './components/CommissionDashboard';
import { DailySalesReportView } from './components/DailySalesReportView';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<Invoice | null>(null);

  // PWA Install Prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Load initial products and cart on mount
  useEffect(() => {
    const loadedProducts = getProducts();
    setProducts(loadedProducts);
    const loadedCart = getCart();
    setCart(loadedCart);

    // Sync with hash route if present (#cart, #checkout, #invoices, #admin, #daily_sales, #commission)
    const hash = window.location.hash.replace('#', '') as ViewMode;
    if (['products', 'cart', 'checkout', 'invoices', 'admin', 'daily_sales', 'commission'].includes(hash)) {
      setActiveView(hash);
    }

    // Check display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Sync hash when view changes
  const handleViewChange = (view: ViewMode) => {
    setActiveView(view);
    window.location.hash = view;
  };

  // Cart Management
  const handleAddToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(i => i.product.id === product.id);
      let updated: CartItem[];
      if (existing) {
        updated = prevCart.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        updated = [...prevCart, { product, quantity: 1 }];
      }
      saveCart(updated);
      return updated;
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      const updated = prevCart
        .map(i => {
          if (i.product.id === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];

      saveCart(updated);
      return updated;
    });
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart(prevCart => {
      const updated = prevCart.filter(i => i.product.id !== productId);
      saveCart(updated);
      return updated;
    });
  };

  const handleClearCart = () => {
    setCart([]);
    clearStorageCart();
  };

  const handleInvoiceCreated = (newInvoice: Invoice) => {
    setSelectedInvoiceForDetail(newInvoice);
    setCart([]);
    handleViewChange('invoices');
  };

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    } else {
      alert('To install MerLiz PWA, tap your browser menu and choose "Add to Home Screen" or "Install App".');
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-[#e2e2e8] flex flex-col font-sans">
      
      {/* Top Bar */}
      <Navbar
        activeView={activeView}
        setActiveView={handleViewChange}
        cartCount={totalCartCount}
        onInstallPWA={handleInstallPWA}
        canInstallPWA={!!deferredPrompt}
        isStandalone={isStandalone}
      />

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeView === 'products' && (
          <ProductList
            products={products}
            cart={cart}
            onAddToCart={handleAddToCart}
            onGoToCart={() => handleViewChange('cart')}
          />
        )}

        {activeView === 'cart' && (
          <CartView
            cart={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onProceedToCheckout={() => handleViewChange('checkout')}
            onContinueShopping={() => handleViewChange('products')}
          />
        )}

        {activeView === 'checkout' && (
          <CheckoutView
            cart={cart}
            onInvoiceCreated={handleInvoiceCreated}
            onGoToProducts={() => handleViewChange('products')}
          />
        )}

        {activeView === 'invoices' && (
          <InvoiceView
            initialSelectedInvoice={selectedInvoiceForDetail}
          />
        )}

        {activeView === 'commission' && (
          <CommissionDashboard
            onSelectInvoice={(inv) => {
              setSelectedInvoiceForDetail(inv);
              handleViewChange('invoices');
            }}
          />
        )}

        {activeView === 'daily_sales' && (
          <DailySalesReportView />
        )}

        {activeView === 'admin' && (
          <AdminView />
        )}
      </main>

      {/* PWA Floating Install Banner */}
      <PWAInstallPrompt />

      {/* Sticky Bottom Navigation for Mobile / Standalone PWA */}
      <BottomNav
        activeView={activeView}
        setActiveView={handleViewChange}
        cartCount={totalCartCount}
      />
    </div>
  );
}
