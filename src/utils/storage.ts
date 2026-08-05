import { Product, Customer, CartItem, Invoice, InvoiceStatus, MerLizBackupData, SalesConsultant } from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

const KEYS = {
  PRODUCTS: 'merliz_products',
  CUSTOMERS: 'merliz_customers',
  CART: 'merliz_cart',
  INVOICES: 'merliz_invoices',
  COUNTER: 'merliz_invoice_counter',
  SALES_CONSULTANTS: 'merliz_sales_consultants'
};

const DEFAULT_SALES_CONSULTANTS: SalesConsultant[] = [
  {
    id: 'sc-1',
    name: 'MerLiz Sales Team',
    phone: '+27 663 758 904',
    email: 'merlizholdings@gmail.com',
    createdAt: new Date().toISOString()
  },
  {
    id: 'sc-2',
    name: 'Sipho Ndlovu',
    phone: '+27 82 987 6543',
    createdAt: new Date().toISOString()
  }
];

// --- PRODUCTS ---
export function getProducts(): Product[] {
  try {
    const data = localStorage.getItem(KEYS.PRODUCTS);
    if (!data) {
      const formattedInitial = INITIAL_PRODUCTS.map(p => ({
        ...p,
        costPrice: p.costPrice || Math.round(p.price * 0.65),
        lowStockThreshold: p.lowStockThreshold || 10
      }));
      saveProducts(formattedInitial);
      return formattedInitial;
    }
    const parsed: Product[] = JSON.parse(data);
    const withDefaults = parsed.map(p => ({
      ...p,
      costPrice: p.costPrice || Math.round(p.price * 0.65),
      lowStockThreshold: p.lowStockThreshold || 10
    }));
    return withDefaults;
  } catch (err) {
    console.error('Error reading products from localStorage', err);
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
}

// --- CUSTOMERS ---
export function getCustomers(): Customer[] {
  try {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading customers from localStorage', err);
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(customers));
}

export function saveCustomerProfile(profile: Omit<Customer, 'id' | 'createdAt'>): Customer {
  const customers = getCustomers();
  const existingIndex = customers.findIndex(
    c => c.phone === profile.phone || (c.fullName.toLowerCase() === profile.fullName.toLowerCase() && profile.fullName.trim() !== '')
  );

  if (existingIndex >= 0) {
    const updated: Customer = {
      ...customers[existingIndex],
      ...profile
    };
    customers[existingIndex] = updated;
    saveCustomers(customers);
    return updated;
  } else {
    const newCustomer: Customer = {
      ...profile,
      id: 'cust-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    customers.push(newCustomer);
    saveCustomers(customers);
    return newCustomer;
  }
}

// --- CART ---
export function getCart(): CartItem[] {
  try {
    const data = localStorage.getItem(KEYS.CART);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading cart from localStorage', err);
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(KEYS.CART, JSON.stringify(cart));
}

export function clearCart(): void {
  localStorage.removeItem(KEYS.CART);
}

// --- LATE PAYMENT LOGIC ---
/**
 * Late payment fee logic:
 * If current date > set pay date + 2 days, automatically add a 10% late payment fee.
 */
export function checkIsLatePayment(payDateStr: string, testDate?: Date): { isLate: boolean; daysDifference: number } {
  if (!payDateStr) return { isLate: false, daysDifference: 0 };
  
  const now = testDate || new Date();
  
  // Set payDate to the end of that date (23:59:59)
  const payDateParts = payDateStr.split('-');
  if (payDateParts.length !== 3) return { isLate: false, daysDifference: 0 };
  
  const year = parseInt(payDateParts[0], 10);
  const month = parseInt(payDateParts[1], 10) - 1;
  const day = parseInt(payDateParts[2], 10);
  
  const payDateObj = new Date(year, month, day, 23, 59, 59, 999);
  
  // Late threshold is set pay date + 2 full days (48 hours)
  const gracePeriodEndTime = payDateObj.getTime() + (2 * 24 * 60 * 60 * 1000);
  
  const isLate = now.getTime() > gracePeriodEndTime;
  
  // Calculate days late past pay date
  const diffMs = now.getTime() - payDateObj.getTime();
  const daysDifference = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return { isLate, daysDifference };
}

export function calculateInvoiceBreakdown(subtotal: number, payDateStr: string, testDate?: Date) {
  const { isLate, daysDifference } = checkIsLatePayment(payDateStr, testDate);
  const latePaymentFee = isLate ? Math.round(subtotal * 0.10 * 100) / 100 : 0;
  const totalAmount = subtotal + latePaymentFee;

  return {
    subtotal,
    isLate,
    daysDifference,
    latePaymentFee,
    totalAmount
  };
}

// --- INVOICES ---
export function getInvoices(): Invoice[] {
  try {
    const data = localStorage.getItem(KEYS.INVOICES);
    const invoices: Invoice[] = data ? JSON.parse(data) : [];
    
    // Auto-update late payment calculation & status for active invoices
    const updatedInvoices: Invoice[] = invoices.map(inv => {
      const breakdown = calculateInvoiceBreakdown(inv.subtotal, inv.payDate);
      const isOverdue = breakdown.isLate && inv.status !== 'paid';
      const currentStatus: InvoiceStatus = inv.status === 'paid' ? 'paid' : (isOverdue ? 'overdue' : inv.status);
      return {
        ...inv,
        isLatePayment: breakdown.isLate,
        latePaymentFee: breakdown.latePaymentFee,
        totalAmount: breakdown.totalAmount,
        status: currentStatus,
        orderProgress: inv.orderProgress || 'pending'
      };
    });

    return updatedInvoices;
  } catch (err) {
    console.error('Error reading invoices from localStorage', err);
    return [];
  }
}

export function saveInvoices(invoices: Invoice[]): void {
  localStorage.setItem(KEYS.INVOICES, JSON.stringify(invoices));
}

export function getNextInvoiceNumber(): string {
  const invoices = getInvoices();
  let maxSeq = 0;

  invoices.forEach(inv => {
    const match = inv.invoiceNumber.match(/MERLIZ-(\d+)/);
    if (match && match[1]) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  });

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(5, '0');
  return `MERLIZ-${padded}`;
}

// --- SALES CONSULTANTS ---
export function getSalesConsultants(): SalesConsultant[] {
  try {
    const data = localStorage.getItem(KEYS.SALES_CONSULTANTS);
    if (!data) {
      saveSalesConsultants(DEFAULT_SALES_CONSULTANTS);
      return DEFAULT_SALES_CONSULTANTS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading sales consultants from localStorage', err);
    return DEFAULT_SALES_CONSULTANTS;
  }
}

export function saveSalesConsultants(consultants: SalesConsultant[]): void {
  localStorage.setItem(KEYS.SALES_CONSULTANTS, JSON.stringify(consultants));
}

export function addSalesConsultant(name: string, phone: string, email?: string): SalesConsultant {
  const list = getSalesConsultants();
  const existing = list.find(sc => sc.name.toLowerCase() === name.toLowerCase().trim());
  if (existing) {
    existing.phone = phone.trim() || existing.phone;
    if (email) existing.email = email.trim();
    saveSalesConsultants(list);
    return existing;
  }
  const newConsultant: SalesConsultant = {
    id: 'sc-' + Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    email: email?.trim() || undefined,
    createdAt: new Date().toISOString()
  };
  const updated = [newConsultant, ...list];
  saveSalesConsultants(updated);
  return newConsultant;
}

// --- BACKUP & RESTORE ---
export function exportDataJSON(): string {
  const backup: MerLizBackupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    products: getProducts(),
    customers: getCustomers(),
    invoices: getInvoices(),
    salesConsultants: getSalesConsultants()
  };
  return JSON.stringify(backup, null, 2);
}

export function importDataJSON(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data.products || !Array.isArray(data.products)) {
      return { success: false, message: 'Invalid JSON format: Missing products array.' };
    }
    
    saveProducts(data.products);
    if (data.customers && Array.isArray(data.customers)) saveCustomers(data.customers);
    if (data.invoices && Array.isArray(data.invoices)) saveInvoices(data.invoices);
    if (data.salesConsultants && Array.isArray(data.salesConsultants)) saveSalesConsultants(data.salesConsultants);

    return { success: true, message: 'MerLiz database backup successfully imported!' };
  } catch (err) {
    return { success: false, message: 'Failed to parse JSON file: ' + (err as Error).message };
  }
}
