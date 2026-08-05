import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'conf-001',
    name: 'Lekker Bek Lek Biscuits (Original Butter Pack 500g)',
    price: 65,
    category: 'Biscuits',
    stock: 50,
    description: 'Crispy, melt-in-your-mouth artisanal Cape butter biscuits baked to perfection. A delicious signature Lekker Bek Lek staple.',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-002',
    name: 'Lekker Bek Lek Chocolate Chip Crunchies (Pack of 12)',
    price: 75,
    category: 'Biscuits',
    stock: 45,
    description: 'Golden oat crunchies layered with rich Belgian chocolate chips and caramelized coconut bits.',
    image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-003',
    name: 'Lekker Bek Lek Vanilla Shortbread Biscuits (400g)',
    price: 60,
    category: 'Biscuits',
    stock: 40,
    description: 'Rich, crumbly vanilla shortbread fingers infused with pure Madagascar vanilla extract.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-004',
    name: 'Lekker Bek Lek Caramel Oats & Coconut Biscuits (Pack of 10)',
    price: 55,
    category: 'Biscuits',
    stock: 60,
    description: 'Home-style chewy oat biscuits packed with toasted coconut flakes and sweet golden syrup.',
    image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-005',
    name: 'Lekker Bek Lek Chocolate Dipped Butter Biscuits (350g)',
    price: 70,
    category: 'Biscuits',
    stock: 35,
    description: 'Crisp butter ring biscuits half-dipped in smooth dark cocoa couverture chocolate.',
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-006',
    name: 'Lekker Bek Lek Custard Cream Biscuits (Pack of 12)',
    price: 50,
    category: 'Biscuits',
    stock: 50,
    description: 'Classic double-biscuit sandwich filled with silky vanilla custard cream.',
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-007',
    name: 'Lekker Bek Lek Ginger Snap Spiced Biscuits (400g)',
    price: 55,
    category: 'Biscuits',
    stock: 40,
    description: 'Crunchy, golden spiced biscuits baked with real ground ginger and nutmeg.',
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-008',
    name: 'Lekker Bek Lek Jam Heart Shortbread Biscuits (Pack of 8)',
    price: 65,
    category: 'Biscuits',
    stock: 30,
    description: 'Golden shortbread rounds with a cutout heart filled with sweet apricot jam.',
    image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  }
];

/**
 * Archived/Hidden non-biscuit confectionery and luxury products held safely for later stage reactivation
 */
export const HIDDEN_LUXURY_PRODUCTS: Product[] = [
  {
    id: 'conf-archive-001',
    name: 'Traditional Cape Jam Squares (6 Pack)',
    price: 55,
    category: 'Traditional Bakes',
    stock: 40,
    description: 'Soft shortbread base generously layered with homemade apricot jam and topped with a toasted coconut lattice.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-archive-002',
    name: 'Handcrafted Creamy Butter Fudge (250g Slab)',
    price: 45,
    category: 'Fudge & Sweets',
    stock: 60,
    description: 'Rich, smooth, homemade vanilla butter fudge cooked slow in copper kettles for an authentic Cape flavor.',
    image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-archive-003',
    name: 'Cape Hertzoggies Coconut & Jam Tartlets (Box of 8)',
    price: 70,
    category: 'Traditional Bakes',
    stock: 35,
    description: 'Crispy pastry cups filled with fine apricot jam and capped with a fluffy light coconut meringue top.',
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-archive-004',
    name: 'Lekker Bek Lek Assorted Biscuit Tin (1kg Deluxe Gift)',
    price: 180,
    category: 'Gift Tins',
    stock: 25,
    description: 'A decorative tin containing our finest selection of Lekker Bek Lek butter cookies, jam pinwheels, and choc dipped rings.',
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'conf-archive-005',
    name: 'Toasted Coconut Marshmallow Squares (Pack of 10)',
    price: 50,
    category: 'Confectionery',
    stock: 30,
    description: 'Soft pillow marshmallow squares rolled in freshly toasted golden coconut flakes.',
    image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    isConfectionery: true
  },
  {
    id: 'prod-001',
    name: 'MerLiz Sovereign Gold Watch (18K Chronograph)',
    price: 18500,
    category: 'Timepieces',
    stock: 8,
    description: 'Precision Swiss movement wrapped in 18K solid gold casing with sapphire crystal glass and genuine alligator leather strap.',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop',
    createdAt: new Date().toISOString()
  }
];
