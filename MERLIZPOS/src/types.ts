export type DeliveryOption = 'delivery' | 'pickup';

export type PaymentMethod = 'cash' | 'card_machine' | 'eft';

export type ClientPaymentType = 'end_of_month' | 'pay_on_delivery';

export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'refunded' | 'draft';

export type OrderProgressStatus = 'pending' | 'confirmed' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';

export type ViewMode = 'products' | 'cart' | 'checkout' | 'invoices' | 'admin' | 'commission' | 'invoice_detail' | 'daily_sales';

export interface Product {
  id: string; // Product ID (e.g. prod-001 or barcode)
  name: string;
  price: number; // Selling Price
  costPrice?: number; // Cost Price for profit margin calculation
  category: string;
  stock: number; // Current stock quantity
  lowStockThreshold?: number; // Threshold for low stock alert (default 10)
  barcode?: string;
  description: string;
  image: string; // Image URL
  createdAt: string;
  isConfectionery?: boolean;
}

export type StockAction = 'added' | 'edited' | 'deleted' | 'stock-in' | 'stock-out' | 'restored';

export interface StockLog {
  id: string;
  productId: string;
  productName: string;
  action: StockAction;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  timestamp: string;
  note?: string;
}

export interface StockReport {
  generatedAt: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockQuantity: number;
  totalInventoryValuationCost: number;
  totalInventoryValuationSelling: number;
  totalPotentialProfit: number;
  recentLogs: StockLog[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  deliveryOption: DeliveryOption;
  paymentType?: ClientPaymentType; // 'end_of_month' or 'pay_on_delivery'
  notes?: string;
  createdAt: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number;
  costPrice?: number;
  quantity: number;
  total: number;
}

export interface Invoice {
  id: string; // Internal unique ID
  invoiceNumber: string; // e.g. MERLIZ-00001
  date: string; // YYYY-MM-DD
  payDate: string; // Set pay date YYYY-MM-DD (Last day of month for EOM)
  customer: Customer;
  clientPaymentType?: ClientPaymentType; // 'end_of_month' or 'pay_on_delivery'
  items: InvoiceItem[];
  subtotal: number;
  paymentMethod: PaymentMethod;
  cardTransactionRef?: string; // Transaction reference for Card Machine
  isLatePayment: boolean; // Automatically calculated
  latePaymentFee: number; // 10% fee if payment > payDate + 2 days
  adjustment?: number; // Arbitrary adjustment amount (e.g. discount or extra fee)
  totalAmount: number; // subtotal + latePaymentFee + adjustment
  status: InvoiceStatus;
  paymentConfirmedAt?: string; // Date/time when payment was confirmed
  paymentLink?: string; // Online payment link for EFT/Pay
  remark?: string; // Admin remark visible to customers
  orderProgress: OrderProgressStatus; // Order fulfillment progress
  deliveryDate?: string; // Delivery date
  courierCompany?: string; // Delivery company name
  driverName?: string; // Driver name
  driverPhone?: string; // Driver phone
  consultantId?: string; // Consultant ID
  salesConsultantName?: string; // Sales Consultant name
  salesConsultantPhone?: string; // Sales Consultant contact number
  profitAmount?: number; // Total product profit = sum((selling_price - cost_price) * quantity)
  commissionAmount?: number; // 40% of profitAmount
  commissionStatus?: 'pending' | 'released'; // 'pending' or 'released'
  stock_restored?: boolean; // Flag preventing duplicate stock restoration on order cancellation
  stockRestored?: boolean; // Alias flag for camelCase usage
  createdAt: string;
  editedAt?: string; // Timestamp when invoice was last edited
  cancelledAt?: string; // Timestamp when invoice was cancelled
}

export interface SalesConsultant {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export interface MerLizBackupData {
  version: string;
  exportedAt: string;
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  salesConsultants?: SalesConsultant[];
}

export interface PrintOptions {
  preset: 'a4' | 'receipt';
  showBankDetails: boolean;
  showDeliveryAddress: boolean;
  showRemark: boolean;
  showPaymentLink: boolean;
  showDriverInfo: boolean;
  showSalesConsultant?: boolean;
  showLogo: boolean;
  customFooterText: string;
}

