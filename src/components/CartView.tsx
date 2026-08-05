import React from 'react';
import { CartItem } from '../types';
import { formatCurrency } from '../utils/whatsapp';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';

interface CartViewProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  onContinueShopping
}) => {
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center bg-[#14141a] border border-[#2a2a35] rounded-2xl p-8 shadow-2xl space-y-4">
        <div className="w-16 h-16 bg-[#1f1f2a] rounded-full flex items-center justify-center mx-auto text-[#d4af37]">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h3 className="font-cinzel text-xl font-bold text-gray-200">Your Shopping Cart is Empty</h3>
        <p className="text-gray-400 text-sm max-w-sm mx-auto">
          Explore our dark gold luxury collection and add exquisite pieces to your shopping cart.
        </p>
        <button
          onClick={onContinueShopping}
          className="inline-flex items-center gap-2 bg-gold-gradient text-[#0b0b0e] font-bold px-6 py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse Collection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a35] pb-4">
        <div>
          <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
            Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Review items before proceeding to customer checkout</p>
        </div>
        <button
          onClick={onClearCart}
          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-800/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Cart</span>
        </button>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
        {cart.map((item) => {
          const itemTotal = item.product.price * item.quantity;

          return (
            <div
              key={item.product.id}
              className="bg-[#141419] border border-[#282834] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-[#d4af37]/30"
            >
              {/* Product Info */}
              <div className="flex items-center gap-3">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-lg bg-[#1a1a22] shrink-0 border border-[#2a2a35]"
                />
                <div>
                  <span className="text-[10px] text-[#d4af37] font-semibold uppercase">
                    {item.product.category}
                  </span>
                  <h4 className="font-cinzel font-semibold text-gray-100 text-sm line-clamp-1">
                    {item.product.name}
                  </h4>
                  <p className="text-xs text-gold-gradient font-bold mt-0.5">
                    {formatCurrency(item.product.price)} each
                  </p>
                </div>
              </div>

              {/* Quantity Controls & Line Total */}
              <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-[#22222d]">
                <div className="flex items-center gap-1.5 bg-[#0b0b0e] border border-[#2a2a35] rounded-lg p-1">
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, -1)}
                    className="p-1 hover:bg-[#22222d] text-gray-300 rounded transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold text-gray-100">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.product.id, 1)}
                    className="p-1 hover:bg-[#22222d] text-gray-300 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-400 block">Total</span>
                  <span className="font-bold text-sm text-gray-100">
                    {formatCurrency(itemTotal)}
                  </span>
                </div>

                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  className="p-2 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Summary & Checkout Bar */}
      <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Items</span>
          <span className="font-bold text-gray-200">{totalItems}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#22222d] pt-3">
          <span className="text-base font-bold text-gray-100">Subtotal</span>
          <span className="text-2xl font-bold text-gold-gradient">
            {formatCurrency(subtotal)}
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onContinueShopping}
            className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-300 bg-[#1e1e26] border border-[#2a2a35] hover:bg-[#252530] transition-colors text-center"
          >
            Add More Items
          </button>
          <button
            onClick={onProceedToCheckout}
            className="flex-1 flex items-center justify-center gap-2 bg-gold-gradient text-[#0b0b0e] font-bold py-3 px-4 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-sm"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
