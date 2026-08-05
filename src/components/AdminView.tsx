import React, { useState, useEffect } from 'react';
import { Product, Customer, Invoice, SalesConsultant, StockLog, ClientPaymentType } from '../types';
import { formatCurrency } from '../utils/whatsapp';
import { 
  getProducts, 
  saveProducts, 
  getCustomers, 
  saveCustomers, 
  getInvoices, 
  getSalesConsultants,
  saveSalesConsultants,
  addSalesConsultant,
  exportDataJSON, 
  importDataJSON 
} from '../utils/storage';
import { 
  getStockLogs, 
  addInventoryProduct, 
  editInventoryProduct, 
  deleteInventoryProduct, 
  stockIn, 
  stockOut, 
  calcProfitMargin, 
  generateStockReport, 
  exportStockReportJSON 
} from '../utils/inventoryModule';
import { 
  getMonthlyPaymentMetrics, 
  markInvoicePaid 
} from '../utils/paymentModule';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { PinModal } from './PinModal';
import { CommissionDashboard } from './CommissionDashboard';
import { DailySalesReportView } from './DailySalesReportView';
import { 
  Package, 
  Users, 
  Briefcase,
  BarChart3, 
  Download, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Sparkles, 
  X, 
  DollarSign, 
  TrendingUp,
  FileCheck,
  Camera,
  Image as ImageIcon,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  History,
  FileText,
  Copy,
  Check,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'stock_logs' | 'payment_behavior' | 'customers' | 'consultants' | 'daily_sales' | 'analytics' | 'backups'>('inventory');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [consultants, setConsultants] = useState<SalesConsultant[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);

  // Product Inventory Add / Edit Modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  
  // Form fields for product
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');

  // Stock In/Out Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustAction, setAdjustAction] = useState<'stock-in' | 'stock-out'>('stock-in');
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustNote, setAdjustNote] = useState<string>('');
  const [adjustError, setAdjustError] = useState<string>('');

  // Inventory Report Export Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTimeframe, setReportTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reportJSON, setReportJSON] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);

  // Filter for products tab
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sales Consultant Add Modal state
  const [isAddConsultantOpen, setIsAddConsultantOpen] = useState(false);
  const [consultantName, setConsultantName] = useState('');
  const [consultantPhone, setConsultantPhone] = useState('');
  const [consultantEmail, setConsultantEmail] = useState('');

  // Backup file import & PIN modal state
  const [importStatus, setImportStatus] = useState<{ success?: boolean; msg?: string }>({});
  const [pinAction, setPinAction] = useState<{
    type: 'delete_product' | 'delete_customer' | 'delete_consultant' | 'reset_products';
    targetId?: string;
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = () => {
    setProducts(getProducts());
    setCustomers(getCustomers());
    setInvoices(getInvoices());
    setConsultants(getSalesConsultants());
    setStockLogs(getStockLogs());
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setName('');
    setPrice(65);
    setCostPrice(40);
    setCategory('Biscuits');
    setStock(50);
    setLowStockThreshold(10);
    setBarcode('ML-' + Math.floor(100000 + Math.random() * 900000));
    setDescription('');
    setImage('https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=800');
    setIsAddProductOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price);
    setCostPrice(prod.costPrice || Math.round(prod.price * 0.65));
    setCategory(prod.category);
    setStock(prod.stock);
    setLowStockThreshold(prod.lowStockThreshold || 10);
    setBarcode(prod.barcode || 'ML-' + Math.floor(100000 + Math.random() * 900000));
    setDescription(prod.description);
    setImage(prod.image);
    setIsAddProductOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProduct) {
      editInventoryProduct(editingProduct.id, {
        name,
        price,
        costPrice,
        category: category || 'General',
        stock,
        lowStockThreshold,
        barcode,
        description,
        image: image || 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800'
      });
    } else {
      addInventoryProduct({
        name,
        price,
        costPrice,
        category: category || 'General',
        stock,
        lowStockThreshold,
        barcode,
        description,
        image: image || 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800'
      });
    }

    refreshAllData();
    setIsAddProductOpen(false);
  };

  const handleDeleteProduct = (productId: string) => {
    const item = products.find(p => p.id === productId);
    setPinAction({
      type: 'delete_product',
      targetId: productId,
      title: 'Delete Product Entry',
      description: `Security PIN code required to delete "${item?.name || 'this product'}" from inventory.`
    });
  };

  const handleOpenStockAdjust = (prod: Product, action: 'stock-in' | 'stock-out') => {
    setAdjustingProduct(prod);
    setAdjustAction(action);
    setAdjustQty(10);
    setAdjustNote(action === 'stock-in' ? 'Restock delivery arrival' : 'Inventory count adjustment');
    setAdjustError('');
  };

  const handleExecuteStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    setAdjustError('');

    if (adjustAction === 'stock-in') {
      stockIn(adjustingProduct.id, adjustQty, adjustNote);
      refreshAllData();
      setAdjustingProduct(null);
    } else {
      const res = stockOut(adjustingProduct.id, adjustQty, adjustNote);
      if (res.success) {
        refreshAllData();
        setAdjustingProduct(null);
      } else if (res.error) {
        setAdjustError(res.error);
      }
    }
  };

  const handleOpenReportModal = () => {
    const json = exportStockReportJSON(reportTimeframe);
    setReportJSON(json);
    setCopiedReport(false);
    setIsReportModalOpen(true);
  };

  const handleCopyReportJSON = () => {
    navigator.clipboard.writeText(reportJSON);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleDeleteCustomer = (custId: string) => {
    const cust = customers.find(c => c.id === custId);
    setPinAction({
      type: 'delete_customer',
      targetId: custId,
      title: 'Delete Customer Record',
      description: `Security PIN code required to delete customer record for "${cust?.fullName || 'customer'}".`
    });
  };

  const handleSaveConsultant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultantName.trim() || !consultantPhone.trim()) return;

    addSalesConsultant(consultantName, consultantPhone, consultantEmail);
    refreshAllData();
    setIsAddConsultantOpen(false);
    setConsultantName('');
    setConsultantPhone('');
    setConsultantEmail('');
  };

  const handleDeleteConsultant = (scId: string) => {
    const sc = consultants.find(item => item.id === scId);
    setPinAction({
      type: 'delete_consultant',
      targetId: scId,
      title: 'Delete Sales Consultant',
      description: `Security PIN code required to delete Sales Consultant record for "${sc?.name || 'Consultant'}".`
    });
  };

  const handleResetDefaults = () => {
    setPinAction({
      type: 'reset_products',
      title: 'Reset Store Product Catalog',
      description: 'Security PIN code required to restore store product catalog to defaults. This will reset the product list.'
    });
  };

  const executePinConfirmedAction = () => {
    if (!pinAction) return;

    if (pinAction.type === 'delete_product' && pinAction.targetId) {
      deleteInventoryProduct(pinAction.targetId);
      refreshAllData();
    } else if (pinAction.type === 'delete_customer' && pinAction.targetId) {
      const updated = customers.filter(c => c.id !== pinAction.targetId);
      setCustomers(updated);
      saveCustomers(updated);
    } else if (pinAction.type === 'delete_consultant' && pinAction.targetId) {
      const updated = consultants.filter(sc => sc.id !== pinAction.targetId);
      setConsultants(updated);
      saveSalesConsultants(updated);
    } else if (pinAction.type === 'reset_products') {
      saveProducts(INITIAL_PRODUCTS);
      refreshAllData();
      setImportStatus({ success: true, msg: 'Restored default biscuit products catalog!' });
    }

    setPinAction(null);
  };

  const handleExportJSON = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merliz-store-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importDataJSON(content);
      if (res.success) {
        setImportStatus({ success: true, msg: res.message });
        refreshAllData();
      } else {
        setImportStatus({ success: false, msg: res.message });
      }
    };
    reader.readAsText(file);
  };

  // Filtered Products for Inventory View
  const filteredProducts = products.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesQuery) return false;

    if (inventoryFilter === 'low_stock') {
      return p.stock <= (p.lowStockThreshold || 10) && p.stock > 0;
    }
    if (inventoryFilter === 'out_of_stock') {
      return p.stock === 0;
    }
    return true;
  });

  // Payment Behaviour Metrics
  const paymentMetrics = getMonthlyPaymentMetrics();

  // Analytics Metrics
  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const pendingRevenue = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalLateFeesCollected = invoices
    .filter(i => i.isLatePayment)
    .reduce((sum, i) => sum + i.latePaymentFee, 0);

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#2a2a35] pb-4">
        <div>
          <h2 className="font-cinzel text-2xl font-bold text-gold-gradient flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#d4af37]" />
            <span>MerLiz Admin & Inventory Control</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Full stock management, payment behavior tracking, customer directory, activity logs & reporting.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#141419] border border-[#2a2a35] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inventory' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('stock_logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stock_logs' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Stock Logs & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('payment_behavior')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'payment_behavior' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Payment Behaviour</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'customers' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Customers ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('consultants')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'consultants' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Consultants ({consultants.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('daily_sales')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'daily_sales' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Daily Sales Report</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'backups' ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backups</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INVENTORY & STOCK MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {/* Top Controls & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141419] p-4 rounded-2xl border border-[#2a2a35]">
            <div className="flex-1 flex items-center gap-2 bg-[#0b0b0e] border border-[#2a2a35] px-3 py-2 rounded-xl">
              <Package className="w-4 h-4 text-[#d4af37]" />
              <input
                type="text"
                placeholder="Search products by name, category, or barcode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-gray-100 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-[#0b0b0e] p-1 rounded-xl border border-[#2a2a35]">
              <button
                onClick={() => setInventoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inventoryFilter === 'all' ? 'bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37]' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                All Products
              </button>
              <button
                onClick={() => setInventoryFilter('low_stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inventoryFilter === 'low_stock' ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Low Stock
              </button>
              <button
                onClick={() => setInventoryFilter('out_of_stock')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  inventoryFilter === 'out_of_stock' ? 'bg-rose-950/80 border border-rose-500/50 text-rose-300' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Out of Stock
              </button>
            </div>

            <button
              onClick={handleOpenAddProduct}
              className="flex items-center justify-center gap-1.5 bg-gold-gradient text-[#0b0b0e] font-bold px-4 py-2.5 rounded-xl text-xs shadow hover:brightness-110 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          {/* Low Stock Alerts Banner if any */}
          {products.filter(p => p.stock <= (p.lowStockThreshold || 10)).length > 0 && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-3.5 rounded-xl flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Low Stock Alert:</strong> {products.filter(p => p.stock <= (p.lowStockThreshold || 10)).length} item(s) are at or below low stock threshold.
                </span>
              </div>
              <button
                onClick={() => setInventoryFilter('low_stock')}
                className="underline font-bold text-amber-300 hover:text-amber-100"
              >
                View Items
              </button>
            </div>
          )}

          {/* Product Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(prod => {
              const margin = calcProfitMargin(prod.price, prod.costPrice || Math.round(prod.price * 0.65));
              const isLowStock = prod.stock <= (prod.lowStockThreshold || 10) && prod.stock > 0;
              const isOutOfStock = prod.stock === 0;

              return (
                <div
                  key={prod.id}
                  className="bg-[#141419] border border-[#282834] hover:border-[#d4af37]/50 rounded-2xl p-4 space-y-3 flex flex-col justify-between transition-all relative overflow-hidden"
                >
                  {/* Stock Alert Badge */}
                  {isOutOfStock && (
                    <div className="absolute top-3 right-3 bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>OUT OF STOCK</span>
                    </div>
                  )}
                  {isLowStock && (
                    <div className="absolute top-3 right-3 bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>LOW STOCK</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-16 h-16 object-cover rounded-xl bg-[#0b0b0e] border border-[#2a2a35] shrink-0"
                    />
                    <div className="space-y-1 overflow-hidden pr-16">
                      <span className="text-[10px] text-[#d4af37] font-bold uppercase tracking-wider">{prod.category}</span>
                      <h4 className="font-cinzel font-bold text-sm text-gray-100 line-clamp-1">{prod.name}</h4>
                      <p className="text-[11px] text-gray-400">Barcode: {prod.barcode || prod.id}</p>
                    </div>
                  </div>

                  {/* Financials & Stock Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-[#0b0b0e] p-2.5 rounded-xl border border-[#22222d] text-center text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Selling Price</span>
                      <span className="font-bold text-gold-gradient">{formatCurrency(prod.price)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Cost Price</span>
                      <span className="font-bold text-gray-300">{formatCurrency(prod.costPrice || Math.round(prod.price * 0.65))}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Profit Margin</span>
                      <span className="font-bold text-emerald-400">+{margin.profitMarginPct}%</span>
                    </div>
                  </div>

                  {/* Stock Quantity Bar */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-400">Current Stock Quantity:</span>
                    <span className={`font-bold ${isOutOfStock ? 'text-rose-400' : isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {prod.stock} Units
                    </span>
                  </div>

                  {/* Stock Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#22222d]">
                    <button
                      onClick={() => handleOpenStockAdjust(prod, 'stock-in')}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 font-bold py-1.5 rounded-lg text-xs transition-all"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Stock-In (+)</span>
                    </button>

                    <button
                      onClick={() => handleOpenStockAdjust(prod, 'stock-out')}
                      className="flex-1 flex items-center justify-center gap-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 font-bold py-1.5 rounded-lg text-xs transition-all"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>Stock-Out (-)</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditProduct(prod)}
                      className="p-2 text-gray-300 hover:text-[#d4af37] bg-[#1c1c24] rounded-lg border border-[#2a2a35] transition-colors"
                      title="Edit Product Details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-2 text-gray-400 hover:text-rose-400 bg-[#1c1c24] rounded-lg border border-[#2a2a35] transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENT LOGS & JSON REPORTING */}
      {activeTab === 'stock_logs' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141419] p-4 rounded-2xl border border-[#2a2a35]">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-gray-100 flex items-center gap-2">
                <History className="w-5 h-5 text-[#d4af37]" />
                <span>Stock Activity Logs & Movement Reports</span>
              </h3>
              <p className="text-xs text-gray-400">Real-time audit log of all stock changes (additions, edits, sales, stock-ins, stock-outs).</p>
            </div>

            <button
              onClick={handleOpenReportModal}
              className="flex items-center justify-center gap-1.5 bg-gold-gradient text-[#0b0b0e] font-bold px-4 py-2.5 rounded-xl text-xs shadow hover:brightness-110 transition-all shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Stock Report (JSON)</span>
            </button>
          </div>

          {stockLogs.length === 0 ? (
            <div className="text-center py-12 bg-[#14141a] border border-[#2a2a35] rounded-xl p-6 space-y-2">
              <History className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm text-gray-400">No stock movement activity recorded yet.</p>
            </div>
          ) : (
            <div className="bg-[#141419] border border-[#282834] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0b0b0e] border-b border-[#2a2a35] text-gray-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Qty Change</th>
                      <th className="p-3">Prev → New</th>
                      <th className="p-3">Note / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22222d]">
                    {stockLogs.slice(0, 100).map(log => {
                      const isPositive = log.quantityChange > 0;
                      return (
                        <tr key={log.id} className="hover:bg-[#1c1c26] transition-colors text-gray-200">
                          <td className="p-3 text-gray-400 text-[11px] whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('en-ZA')}
                          </td>
                          <td className="p-3 font-bold text-gray-100">{log.productName}</td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                              log.action === 'restored'
                                ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/50'
                                : log.action === 'stock-in' || log.action === 'added'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                                : log.action === 'stock-out'
                                ? 'bg-rose-950 text-rose-300 border-rose-500/30'
                                : 'bg-amber-950 text-amber-300 border-amber-500/30'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className={`p-3 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? `+${log.quantityChange}` : log.quantityChange}
                          </td>
                          <td className="p-3 text-gray-400">
                            {log.previousStock} → <strong className="text-gray-100">{log.newStock}</strong>
                          </td>
                          <td className="p-3 text-gray-400 italic text-[11px]">{log.note || 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENT BEHAVIOUR & EOM DASHBOARD */}
      {activeTab === 'payment_behavior' && (
        <div className="space-y-6">
          <div className="bg-[#141419] p-5 rounded-2xl border border-[#2a2a35] space-y-2">
            <h3 className="font-cinzel font-bold text-lg text-gold-gradient flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#d4af37]" />
              <span>Payment Behaviour & Client Terms Module</span>
            </h3>
            <p className="text-xs text-gray-400">
              Manages client payment classification: End-of-Month account clients vs Pay-on-Delivery immediate clients.
            </p>
          </div>

          {/* Payment Behavior Dashboard Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">End-of-Month Total Purchases</span>
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(paymentMetrics.eom.totalPurchases)}</p>
              <p className="text-[11px] text-gray-500">{paymentMetrics.eom.count} invoice(s) on EOM terms</p>
            </div>

            <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Outstanding EOM Balance</span>
              <p className="text-2xl font-bold text-rose-400">{formatCurrency(paymentMetrics.eom.outstandingBalance)}</p>
              <p className="text-[11px] text-gray-500">Due by end of current month</p>
            </div>

            <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Late Fee Collections (10%)</span>
              <p className="text-2xl font-bold text-[#d4af37]">{formatCurrency(paymentMetrics.eom.lateFeeTotal)}</p>
              <p className="text-[11px] text-gray-500">{paymentMetrics.eom.lateCount} invoice(s) past grace period</p>
            </div>

            <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-gray-400 block">Pay-on-Delivery Sales</span>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(paymentMetrics.pod.totalSales)}</p>
              <p className="text-[11px] text-gray-500">Immediate cash/card/EFT sales</p>
            </div>
          </div>

          {/* Invoices by Payment Category */}
          <div className="bg-[#141419] border border-[#282834] rounded-2xl p-5 space-y-4">
            <h4 className="font-cinzel font-bold text-base text-gray-100 border-b border-[#22222d] pb-3">
              Client Payment Category Directory
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b0b0e] border-b border-[#2a2a35] text-gray-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Payment Category</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Late Fee (10%)</th>
                    <th className="p-3">Total Payable</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22222d]">
                  {invoices.map(inv => {
                    const isEOM = inv.clientPaymentType === 'end_of_month';
                    const isPaid = inv.status === 'paid';
                    const isLate = inv.isLatePayment && !isPaid;

                    return (
                      <tr key={inv.id} className="hover:bg-[#1c1c26] transition-colors text-gray-200">
                        <td className="p-3 font-bold text-gold-gradient">{inv.invoiceNumber}</td>
                        <td className="p-3 font-semibold text-gray-100">{inv.customer.fullName}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isEOM ? 'bg-amber-950 text-amber-300 border-amber-500/30' : 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {isEOM ? 'End-of-Month' : 'Pay-on-Delivery'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300">{inv.payDate}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isPaid
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                              : isLate
                              ? 'bg-rose-950 text-rose-300 border-rose-500/30'
                              : 'bg-amber-950 text-amber-300 border-amber-500/30'
                          }`}>
                            {isPaid ? 'Paid' : isLate ? 'Late (Fee Applied)' : 'Unpaid (Pending)'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-rose-400">
                          {inv.latePaymentFee > 0 ? `+${formatCurrency(inv.latePaymentFee)}` : 'R 0.00'}
                        </td>
                        <td className="p-3 font-bold text-gold-gradient">{formatCurrency(inv.totalAmount)}</td>
                        <td className="p-3">
                          {!isPaid && (
                            <button
                              onClick={() => {
                                markInvoicePaid(inv.id, inv.paymentMethod || 'cash');
                                refreshAllData();
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] transition-all"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER MANAGEMENT */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <h3 className="font-cinzel font-bold text-lg text-gray-200">Customer Directory</h3>
          
          {customers.length === 0 ? (
            <div className="text-center py-12 bg-[#14141a] border border-[#2a2a35] rounded-xl p-6">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No customer profiles saved yet. Checkout orders auto-save customers.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customers.map(cust => (
                <div
                  key={cust.id}
                  className="bg-[#141419] border border-[#282834] rounded-xl p-4 flex justify-between items-start"
                >
                  <div>
                    <h4 className="font-bold text-sm text-gray-100">{cust.fullName}</h4>
                    <p className="text-xs text-[#d4af37] font-medium">{cust.phone}</p>
                    <p className="text-xs text-gray-400 mt-1">{cust.address}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#1f1f2a] text-gray-300 border border-[#2a2a35]">
                        Option: {cust.deliveryOption}
                      </span>
                      <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-500/30">
                        Type: {cust.paymentType === 'end_of_month' ? 'End-of-Month' : 'Pay-on-Delivery'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteCustomer(cust.id)}
                    className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SALES CONSULTANTS MANAGEMENT */}
      {activeTab === 'consultants' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-gray-200">Sales Consultants Directory</h3>
              <p className="text-xs text-gray-400">Add sales consultants manually with contact details for invoice assignment and WhatsApp messages.</p>
            </div>
            <button
              onClick={() => {
                setConsultantName('');
                setConsultantPhone('');
                setConsultantEmail('');
                setIsAddConsultantOpen(true);
              }}
              className="flex items-center gap-1.5 bg-gold-gradient text-[#0b0b0e] font-bold px-4 py-2 rounded-xl text-xs shadow hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sales Consultant Manually</span>
            </button>
          </div>

          {consultants.length === 0 ? (
            <div className="text-center py-12 bg-[#14141a] border border-[#2a2a35] rounded-xl p-6 space-y-3">
              <UserCheck className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm text-gray-400">No Sales Consultants registered. Click button above to add sales staff manually.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {consultants.map(sc => (
                <div
                  key={sc.id}
                  className="bg-[#141419] border border-[#282834] rounded-xl p-4 flex justify-between items-center gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] font-bold">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-100">{sc.name}</h4>
                      <p className="text-xs text-gold-gradient font-medium">{sc.phone}</p>
                      {sc.email && <p className="text-[11px] text-gray-400">{sc.email}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteConsultant(sc.id)}
                    className="p-2 text-gray-500 hover:text-rose-400 bg-[#1c1c24] rounded-lg border border-[#2a2a35] transition-colors"
                    title="Delete Consultant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-6 border-t border-[#2a2a35]">
            <CommissionDashboard />
          </div>
        </div>
      )}

      {/* TAB: DAILY SALES REPORT */}
      {activeTab === 'daily_sales' && (
        <DailySalesReportView />
      )}

      {/* TAB 6: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Paid Revenue</span>
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalRevenue)}</p>
            <p className="text-[11px] text-gray-500">Collected from settled invoices</p>
          </div>

          <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Revenue</span>
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(pendingRevenue)}</p>
            <p className="text-[11px] text-gray-500">Outstanding invoice balances</p>
          </div>

          <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-[#d4af37]">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Late Fees Collected</span>
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gold-gradient">{formatCurrency(totalLateFeesCollected)}</p>
            <p className="text-[11px] text-gray-500">10% overdue fee collections</p>
          </div>

          <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Invoices</span>
              <FileCheck className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-100">{invoices.length}</p>
            <p className="text-[11px] text-gray-500">Total orders processed</p>
          </div>
        </div>
      )}

      {/* TAB 7: BACKUPS */}
      {activeTab === 'backups' && (
        <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-6 space-y-6 max-w-2xl">
          <div>
            <h3 className="font-cinzel font-bold text-lg text-gray-100">Database Backup & Export</h3>
            <p className="text-xs text-gray-400 mt-1">
              Export your entire MerLiz store database (products, customer profiles, invoices) to a backup JSON file, or restore from a previous backup.
            </p>
          </div>

          {importStatus.msg && (
            <div className={`p-3 rounded-xl text-xs font-bold border ${
              importStatus.success ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}>
              {importStatus.msg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 bg-gold-gradient text-[#0b0b0e] font-bold py-3 px-4 rounded-xl shadow hover:brightness-110 transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export Backup JSON</span>
            </button>

            <label className="flex items-center justify-center gap-2 bg-[#1c1c24] border border-[#2a2a35] hover:border-[#d4af37] text-gray-200 font-bold py-3 px-4 rounded-xl cursor-pointer transition-all text-sm">
              <Upload className="w-4 h-4" />
              <span>Import Backup JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-[#22222d]">
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Products to Default Confectionery Catalog (Lekker Bek Lek Biscuits)</span>
            </button>
          </div>
        </div>
      )}

      {/* Stock In / Out Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141a] border border-[#d4af37]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#2a2a35] pb-3">
              <h3 className="font-cinzel font-bold text-lg text-gold-gradient flex items-center gap-2">
                {adjustAction === 'stock-in' ? (
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 text-rose-400" />
                )}
                <span>{adjustAction === 'stock-in' ? 'Increase Stock (Stock-In)' : 'Decrease Stock (Stock-Out)'}</span>
              </h3>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0b0b0e] p-3 rounded-xl border border-[#2a2a35] flex items-center gap-3">
              <img src={adjustingProduct.image} alt={adjustingProduct.name} className="w-12 h-12 object-cover rounded-lg border border-[#3a3a4a]" />
              <div>
                <h4 className="font-bold text-xs text-gray-100">{adjustingProduct.name}</h4>
                <p className="text-[11px] text-gray-400">Current Stock: <strong className="text-gold-gradient">{adjustingProduct.stock} units</strong></p>
              </div>
            </div>

            {adjustError && (
              <div className="bg-rose-950/80 border border-rose-500/50 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{adjustError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteStockAdjust} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Quantity Adjustment *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={adjustQty}
                  onChange={e => setAdjustQty(Number(e.target.value))}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Audit Note / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Restock shipment delivery or damage audit"
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e1e26] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-[#0b0b0e] shadow hover:brightness-110 ${
                    adjustAction === 'stock-in' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                >
                  Confirm {adjustAction === 'stock-in' ? 'Stock-In' : 'Stock-Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Report JSON Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141a] border border-[#d4af37]/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#2a2a35] pb-3">
              <h3 className="font-cinzel font-bold text-lg text-gold-gradient flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#d4af37]" />
                <span>Stock Movement JSON Report</span>
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-[#0b0b0e] p-2 rounded-xl border border-[#2a2a35]">
              <span className="text-xs text-gray-400 pl-2">Timeframe:</span>
              {(['daily', 'weekly', 'monthly'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => {
                    setReportTimeframe(tf);
                    setReportJSON(exportStockReportJSON(tf));
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    reportTimeframe === tf ? 'bg-gold-gradient text-[#0b0b0e]' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                readOnly
                rows={12}
                value={reportJSON}
                className="w-full bg-[#0b0b0e] border border-[#2a2a35] text-xs font-mono text-emerald-400 p-3 rounded-xl focus:outline-none"
              />
              <button
                onClick={handleCopyReportJSON}
                className="absolute top-3 right-3 bg-[#1e1e28] hover:bg-[#282836] border border-[#3a3a4a] text-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#d4af37]" />}
                <span>{copiedReport ? 'Copied JSON!' : 'Copy JSON Text'}</span>
              </button>
            </div>

            <p className="text-[11px] text-gray-400">
              Report exported as raw JSON text string for stock auditing and integration. No file saved.
            </p>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1e1e26] text-gray-300 hover:text-white"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Sales Consultant Modal */}
      {isAddConsultantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141a] border border-[#d4af37]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#2a2a35] pb-3">
              <h3 className="font-cinzel font-bold text-lg text-gold-gradient flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#d4af37]" />
                <span>Add Sales Consultant Manually</span>
              </h3>
              <button
                onClick={() => setIsAddConsultantOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConsultant} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sipho Ndlovu"
                  value={consultantName}
                  onChange={e => setConsultantName(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">WhatsApp / Cell Contact Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +27 663 758 904"
                  value={consultantPhone}
                  onChange={e => setConsultantPhone(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. consultant@merliz.co.za"
                  value={consultantEmail}
                  onChange={e => setConsultantEmail(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddConsultantOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e1e26] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gold-gradient text-[#0b0b0e] shadow hover:brightness-110"
                >
                  Save Sales Consultant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141a] border border-[#d4af37]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2a2a35] pb-3">
              <h3 className="font-cinzel font-bold text-lg text-gold-gradient">
                {editingProduct ? 'Edit Product Item' : 'Add New Product Item'}
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Product Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Selling Price *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Cost Price *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={costPrice}
                    onChange={e => setCostPrice(Number(e.target.value))}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Stock Qty *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stock}
                    onChange={e => setStock(Number(e.target.value))}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Low Threshold</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(Number(e.target.value))}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Category *</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-300 font-semibold mb-1 block">Barcode Number</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Product Photo (Upload File or Enter Image Link)</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-[#1b1b24] hover:bg-[#252532] border border-[#2a2a35] hover:border-[#d4af37] text-gray-200 rounded-xl cursor-pointer text-xs font-bold transition-all shadow-sm">
                      <Camera className="w-4 h-4 text-[#d4af37]" />
                      <span>Upload Photo from Cellphone / Desktop</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Or enter image URL (https://...)"
                      value={image}
                      onChange={e => setImage(e.target.value)}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-xs focus:outline-none"
                    />
                  </div>

                  {image && (
                    <div className="mt-2 flex items-center gap-3 bg-[#0b0b0e] p-2.5 rounded-xl border border-[#2a2a35]">
                      <img src={image} alt="Product Preview" className="w-12 h-12 object-cover rounded-lg border border-[#3a3a4a] bg-[#141419]" />
                      <div className="text-[11px] text-gray-400 overflow-hidden">
                        <p className="font-bold text-gray-200 flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                          Photo Selected
                        </p>
                        <p className="truncate max-w-[200px] sm:max-w-xs">{image}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e1e26] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gold-gradient text-[#0b0b0e] shadow hover:brightness-110"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Security PIN Modal */}
      <PinModal
        isOpen={!!pinAction}
        title={pinAction?.title || 'Security PIN Verification'}
        description={pinAction?.description || 'Authorized PIN required to complete action.'}
        onConfirm={executePinConfirmedAction}
        onCancel={() => setPinAction(null)}
      />

    </div>
  );
};
