import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { formatCurrency } from '../utils/whatsapp';
import { Search, Plus, Check, ShoppingBag, Eye, Sparkles, Filter, PackageX } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onGoToCart: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  cart,
  onAddToCart,
  onGoToCart
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  // Extract categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = (product: Product) => {
    onAddToCart(product);
    setAddedAnimationId(product.id);
    setTimeout(() => setAddedAnimationId(null), 1000);
  };

  const getCartQuantity = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* Hero Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#181820] via-[#141419] to-[#0d0d10] border border-[#2d2d3a] p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold tracking-widest uppercase mb-1">
              <Sparkles className="w-4 h-4" />
              <span>MerLiz Confectionery Catalog</span>
            </div>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-gray-100">
              Lekker bek lek biscuits
            </h2>
            <p className="text-gray-400 text-sm mt-1 max-w-xl">
              Complete instant checkout offline or online.
            </p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onGoToCart}
              className="self-start md:self-auto flex items-center gap-2 bg-gold-gradient text-[#0b0b0e] font-bold px-4 py-2.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>View Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Category Filter Section */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items by title, category, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#14141a] border border-[#2a2a35] focus:border-[#d4af37] text-gray-200 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Filter className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                selectedCategory === cat
                  ? 'bg-gold-gradient text-[#0b0b0e] shadow-md'
                  : 'bg-[#181820] text-gray-400 border border-[#2a2a35] hover:text-gray-200 hover:border-[#3a3a4a]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-[#14141a] border border-[#2a2a35] rounded-2xl p-6">
          <PackageX className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-300">No Products Found</h3>
          <p className="text-sm text-gray-500 mt-1">
            Try resetting your search filter or add new products in the Admin panel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const inCartQty = getCartQuantity(product.id);
            const isOutOfStock = product.stock <= 0;
            const isJustAdded = addedAnimationId === product.id;

            return (
              <div
                key={product.id}
                className="group relative bg-[#141419] border border-[#282834] hover:border-[#d4af37]/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between"
              >
                {/* Image Container */}
                <div className="relative aspect-4/3 w-full bg-[#1a1a22] overflow-hidden">
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800';
                    }}
                  />
                  
                  {/* Category Tag */}
                  <span className="absolute top-3 left-3 bg-[#0b0b0e]/80 backdrop-blur-md border border-[#d4af37]/30 text-[#d4af37] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {product.category}
                  </span>

                  {/* Stock Badge */}
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isOutOfStock
                      ? 'bg-rose-950/80 text-rose-400 border-rose-800/40'
                      : product.stock < 5
                      ? 'bg-amber-950/80 text-amber-400 border-amber-800/40'
                      : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/40'
                  }`}>
                    {isOutOfStock ? 'Out of Stock' : `Stock: ${product.stock}`}
                  </span>

                  {/* Quick View Overlay Button */}
                  <button
                    onClick={() => setSelectedProductModal(product)}
                    className="absolute bottom-3 right-3 p-2 bg-[#0b0b0e]/80 text-gray-300 hover:text-[#d4af37] rounded-xl border border-[#2a2a35] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Quick Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Info Container */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-cinzel font-semibold text-gray-100 text-base line-clamp-1 group-hover:text-[#d4af37] transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-gray-400 text-xs line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  </div>

                  {/* Price and Cart Add */}
                  <div className="pt-2 border-t border-[#22222d] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 block">Price</span>
                      <span className="font-bold text-base text-gold-gradient">
                        {formatCurrency(product.price)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAdd(product)}
                      disabled={isOutOfStock}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        isOutOfStock
                          ? 'bg-[#22222b] text-gray-500 cursor-not-allowed'
                          : isJustAdded
                          ? 'bg-emerald-500 text-[#0b0b0e]'
                          : 'bg-gold-gradient text-[#0b0b0e] hover:brightness-110 active:scale-95 shadow-md'
                      }`}
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>{inCartQty > 0 ? `Add (${inCartQty})` : 'Add'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141a] border border-[#d4af37]/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setSelectedProductModal(null)}
              className="absolute top-3 right-3 z-10 bg-[#0b0b0e]/80 text-gray-400 hover:text-white p-2 rounded-full border border-[#2a2a35]"
            >
              ✕
            </button>

            <div className="relative aspect-video bg-[#1a1a22]">
              <img
                src={selectedProductModal.image}
                alt={selectedProductModal.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-[#d4af37]/20 text-[#d4af37] text-xs font-bold px-3 py-1 rounded-full border border-[#d4af37]/30">
                  {selectedProductModal.category}
                </span>
                <span className="text-xs text-gray-400">
                  In Stock: {selectedProductModal.stock} units
                </span>
              </div>

              <h3 className="font-cinzel text-xl font-bold text-gray-100">
                {selectedProductModal.name}
              </h3>

              <p className="text-sm text-gray-300 leading-relaxed">
                {selectedProductModal.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[#2a2a35]">
                <div>
                  <span className="text-xs text-gray-400 block">Unit Price</span>
                  <span className="text-xl font-bold text-gold-gradient">
                    {formatCurrency(selectedProductModal.price)}
                  </span>
                </div>

                <button
                  onClick={() => {
                    handleAdd(selectedProductModal);
                    setSelectedProductModal(null);
                  }}
                  disabled={selectedProductModal.stock <= 0}
                  className="bg-gold-gradient text-[#0b0b0e] font-bold px-5 py-2.5 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
