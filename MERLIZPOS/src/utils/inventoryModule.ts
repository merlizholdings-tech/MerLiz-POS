import { Product, StockLog, StockAction, StockReport, Invoice, InvoiceItem } from '../types';
import { getProducts, saveProducts, getInvoices, saveInvoices } from './storage';

const STOCK_LOGS_KEY = 'merliz_stock_logs';

/**
 * --- STOCK ACTIVITY LOGS ---
 */
export function getStockLogs(): StockLog[] {
  try {
    const data = localStorage.getItem(STOCK_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading stock logs from localStorage', err);
    return [];
  }
}

export function saveStockLogs(logs: StockLog[]): void {
  localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify(logs));
}

export function logStockMovement(
  productId: string,
  productName: string,
  action: StockAction,
  quantityChange: number,
  previousStock: number,
  newStock: number,
  note?: string
): StockLog {
  const logs = getStockLogs();
  const logEntry: StockLog = {
    id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    productId,
    productName,
    action,
    quantityChange,
    previousStock,
    newStock,
    timestamp: new Date().toISOString(),
    note
  };

  const updatedLogs = [logEntry, ...logs];
  saveStockLogs(updatedLogs);
  return logEntry;
}

export function clearStockLogs(): void {
  localStorage.removeItem(STOCK_LOGS_KEY);
}

/**
 * --- PROFIT MARGIN CALCULATION ---
 */
export function calcProfitMargin(sellingPrice: number, costPrice: number = 0) {
  const profitAmount = Math.max(0, sellingPrice - costPrice);
  const profitMarginPct = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;
  return {
    profitAmount,
    profitMarginPct: Math.round(profitMarginPct * 10) / 10
  };
}

/**
 * --- INVENTORY CRUD & STOCK FUNCTIONS ---
 */

/**
 * Add a new product to inventory
 */
export function addInventoryProduct(
  productData: Omit<Product, 'id' | 'createdAt'> & { id?: string }
): Product {
  const products = getProducts();
  
  const id = productData.id || 'prod-' + Date.now();
  const costPrice = productData.costPrice || Math.round(productData.price * 0.65);
  const lowStockThreshold = productData.lowStockThreshold || 10;
  const stock = Math.max(0, productData.stock || 0);

  const newProduct: Product = {
    ...productData,
    id,
    costPrice,
    lowStockThreshold,
    stock,
    createdAt: new Date().toISOString()
  };

  const updatedProducts = [newProduct, ...products];
  saveProducts(updatedProducts);

  // Log stock addition
  logStockMovement(
    newProduct.id,
    newProduct.name,
    'added',
    stock,
    0,
    stock,
    'Initial product creation stock'
  );

  return newProduct;
}

/**
 * Edit product details
 */
export function editInventoryProduct(
  productId: string,
  updates: Partial<Product>
): Product | null {
  const products = getProducts();
  const index = products.findIndex(p => p.id === productId);
  if (index === -1) return null;

  const existing = products[index];
  const oldStock = existing.stock;
  const newStock = updates.stock !== undefined ? Math.max(0, updates.stock) : oldStock;

  const updated: Product = {
    ...existing,
    ...updates,
    stock: newStock
  };

  products[index] = updated;
  saveProducts(products);

  // Log edit if stock changed
  if (oldStock !== newStock) {
    const change = newStock - oldStock;
    logStockMovement(
      updated.id,
      updated.name,
      'edited',
      change,
      oldStock,
      newStock,
      'Manual stock adjustment in product edit'
    );
  } else {
    logStockMovement(
      updated.id,
      updated.name,
      'edited',
      0,
      oldStock,
      newStock,
      'Product details updated'
    );
  }

  return updated;
}

/**
 * Delete product from inventory
 */
export function deleteInventoryProduct(productId: string): boolean {
  const products = getProducts();
  const existing = products.find(p => p.id === productId);
  if (!existing) return false;

  const filtered = products.filter(p => p.id !== productId);
  saveProducts(filtered);

  logStockMovement(
    existing.id,
    existing.name,
    'deleted',
    -existing.stock,
    existing.stock,
    0,
    'Product removed from catalog'
  );

  return true;
}

/**
 * Stock-In (Increase stock quantity)
 */
export function stockIn(productId: string, qty: number, note: string = 'Stock-in addition'): Product | null {
  if (qty <= 0) return null;
  const products = getProducts();
  const index = products.findIndex(p => p.id === productId);
  if (index === -1) return null;

  const prod = products[index];
  const prevStock = prod.stock;
  const newStock = prevStock + qty;

  const updated: Product = {
    ...prod,
    stock: newStock
  };

  products[index] = updated;
  saveProducts(products);

  logStockMovement(prod.id, prod.name, 'stock-in', qty, prevStock, newStock, note);
  return updated;
}

/**
 * Stock-Out (Decrease stock quantity)
 * Prevents negative stock!
 */
export function stockOut(productId: string, qty: number, note: string = 'Stock-out deduction'): { success: boolean; product: Product | null; error?: string } {
  if (qty <= 0) return { success: false, product: null, error: 'Quantity must be greater than zero.' };
  
  const products = getProducts();
  const index = products.findIndex(p => p.id === productId);
  if (index === -1) return { success: false, product: null, error: 'Product not found.' };

  const prod = products[index];
  const prevStock = prod.stock;

  if (prevStock < qty) {
    return {
      success: false,
      product: prod,
      error: `Insufficient stock! Requested ${qty}, but only ${prevStock} available.`
    };
  }

  const newStock = prevStock - qty;
  const updated: Product = {
    ...prod,
    stock: newStock
  };

  products[index] = updated;
  saveProducts(products);

  logStockMovement(prod.id, prod.name, 'stock-out', -qty, prevStock, newStock, note);
  return { success: true, product: updated };
}

/**
 * --- LOW STOCK ALERTS & DASHBOARD ---
 */
export function getLowStockProducts(): Product[] {
  const products = getProducts();
  return products.filter(p => p.stock <= (p.lowStockThreshold || 10));
}

export function getOutOfStockProducts(): Product[] {
  const products = getProducts();
  return products.filter(p => p.stock === 0);
}

/**
 * --- REPORTING & EXPORT ---
 */
export function generateStockReport(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): StockReport {
  const products = getProducts();
  const logs = getStockLogs();

  const now = new Date();
  let timeCutoff = new Date();

  if (timeframe === 'daily') {
    timeCutoff.setDate(now.getDate() - 1);
  } else if (timeframe === 'weekly') {
    timeCutoff.setDate(now.getDate() - 7);
  } else if (timeframe === 'monthly') {
    timeCutoff.setMonth(now.getMonth() - 1);
  }

  const recentLogs = logs.filter(l => new Date(l.timestamp) >= timeCutoff);

  const lowStockCount = products.filter(p => p.stock <= (p.lowStockThreshold || 10) && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const totalStockQuantity = products.reduce((sum, p) => sum + p.stock, 0);
  const totalInventoryValuationCost = products.reduce((sum, p) => sum + (p.stock * (p.costPrice || p.price * 0.65)), 0);
  const totalInventoryValuationSelling = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const totalPotentialProfit = totalInventoryValuationSelling - totalInventoryValuationCost;

  return {
    generatedAt: new Date().toISOString(),
    timeframe,
    totalProducts: products.length,
    lowStockCount,
    outOfStockCount,
    totalStockQuantity,
    totalInventoryValuationCost: Math.round(totalInventoryValuationCost * 100) / 100,
    totalInventoryValuationSelling: Math.round(totalInventoryValuationSelling * 100) / 100,
    totalPotentialProfit: Math.round(totalPotentialProfit * 100) / 100,
    recentLogs
  };
}

/**
 * Export report as JSON text
 */
export function exportStockReportJSON(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): string {
  const report = generateStockReport(timeframe);
  return JSON.stringify(report, null, 2);
}

/**
 * --- INTEGRATION POINTS: POS INVOICE SYNC ---
 */

/**
 * Deduct inventory stock upon invoice placement/completion
 */
export function processInvoiceStockDeduction(invoice: Invoice): { success: boolean; warnings: string[] } {
  const warnings: string[] = [];

  invoice.items.forEach(item => {
    const res = stockOut(item.productId, item.quantity, `POS Sale: Invoice #${invoice.invoiceNumber}`);
    if (!res.success && res.error) {
      warnings.push(`Item ${item.name}: ${res.error}`);
    }
  });

  return {
    success: warnings.length === 0,
    warnings
  };
}

/**
 * Check if stock has already been restored for a given invoice ID or number
 */
export function preventDuplicateRestoration(invoiceId: string): boolean {
  const invoices = getInvoices();
  const target = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
  if (!target) return false;
  return Boolean(target.stock_restored || target.stockRestored);
}

/**
 * Update inventory quantity for a product ID (increase stock by qty)
 */
export function updateInventory(productId: string, qty: number): Product | null {
  if (qty <= 0) return null;
  const products = getProducts();
  const index = products.findIndex(p => p.id === productId);
  if (index === -1) return null;

  const prod = products[index];
  const prevStock = prod.stock;
  const newStock = prevStock + qty;

  const updated: Product = {
    ...prod,
    stock: newStock
  };

  products[index] = updated;
  saveProducts(products);

  return updated;
}

/**
 * Log stock restoration event in stock movement history
 */
export function logStockRestoration(invoiceId: string, productId: string, qty: number): StockLog | null {
  const invoices = getInvoices();
  const targetInvoice = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
  const invoiceNum = targetInvoice ? targetInvoice.invoiceNumber : invoiceId;

  const products = getProducts();
  const product = products.find(p => p.id === productId);
  if (!product) return null;

  const prevStock = Math.max(0, product.stock - qty);
  const newStock = product.stock;

  return logStockMovement(
    product.id,
    product.name,
    'restored',
    qty,
    prevStock,
    newStock,
    `Restored (Cancelled Order) - Invoice #${invoiceNum}`
  );
}

/**
 * Automatically restore stock when an invoice or order is cancelled
 */
export function restoreStockOnCancellation(invoiceId: string): {
  success: boolean;
  restoredCount: number;
  itemsRestored: string[];
  message: string;
} {
  // 1. Validation: Prevent duplicate restoration
  if (preventDuplicateRestoration(invoiceId)) {
    return {
      success: false,
      restoredCount: 0,
      itemsRestored: [],
      message: 'Stock already restored for this cancelled order.'
    };
  }

  const invoices = getInvoices();
  const index = invoices.findIndex(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
  if (index === -1) {
    return {
      success: false,
      restoredCount: 0,
      itemsRestored: [],
      message: 'Invoice not found.'
    };
  }

  const invoice = invoices[index];
  const itemsRestoredNames: string[] = [];

  // 2. Return all item quantities to inventory & log restoration
  invoice.items.forEach(item => {
    updateInventory(item.productId, item.quantity);
    logStockRestoration(invoice.id, item.productId, item.quantity);
    itemsRestoredNames.push(`${item.name} (${item.quantity} units)`);
  });

  // 3. Flag invoice record to prevent future duplicates
  const updatedInvoice: Invoice = {
    ...invoice,
    stock_restored: true,
    stockRestored: true,
    orderProgress: 'cancelled'
  };

  invoices[index] = updatedInvoice;
  saveInvoices(invoices);

  return {
    success: true,
    restoredCount: invoice.items.length,
    itemsRestored: itemsRestoredNames,
    message: 'Stock successfully restored to inventory for cancelled order.'
  };
}

/**
 * Synchronize inventory stock when an invoice is edited AFTER checkout.
 * - If item quantity is increased -> reduce stock accordingly.
 * - If item quantity is decreased -> restore stock accordingly.
 * - If an item is removed -> restore stock for that item.
 * - If an item is added -> reduce stock for that item.
 */
export function updateInventoryOnEdit(
  invoiceId: string,
  oldItems: InvoiceItem[],
  newItems: InvoiceItem[]
): string[] {
  const changes: string[] = [];
  const invoices = getInvoices();
  const targetInvoice = invoices.find(inv => inv.id === invoiceId || inv.invoiceNumber === invoiceId);
  const invoiceNum = targetInvoice ? targetInvoice.invoiceNumber : invoiceId;

  // Map of productId -> { name, oldQty, newQty }
  const itemMap = new Map<string, { name: string; oldQty: number; newQty: number }>();

  oldItems.forEach(item => {
    itemMap.set(item.productId, { name: item.name, oldQty: item.quantity, newQty: 0 });
  });

  newItems.forEach(item => {
    const existing = itemMap.get(item.productId);
    if (existing) {
      existing.newQty = item.quantity;
    } else {
      itemMap.set(item.productId, { name: item.name, oldQty: 0, newQty: item.quantity });
    }
  });

  const products = getProducts();

  itemMap.forEach((data, productId) => {
    const diff = data.newQty - data.oldQty;
    if (diff === 0) return;

    const prodIndex = products.findIndex(p => p.id === productId || p.name === data.name);
    if (prodIndex !== -1) {
      const prod = products[prodIndex];
      const prevStock = prod.stock;

      if (diff > 0) {
        // Quantity increased -> deduct stock
        const newStock = Math.max(0, prevStock - diff);
        products[prodIndex] = { ...prod, stock: newStock };
        logStockMovement(
          prod.id,
          prod.name,
          'stock-out',
          diff,
          prevStock,
          newStock,
          `Invoice #${invoiceNum} Edited (Qty increased +${diff})`
        );
        changes.push(`Deducted ${diff}x ${data.name} from stock (Stock now ${newStock})`);
      } else {
        // Quantity decreased -> restore stock
        const restoreQty = Math.abs(diff);
        const newStock = prevStock + restoreQty;
        products[prodIndex] = { ...prod, stock: newStock };
        logStockMovement(
          prod.id,
          prod.name,
          'restored',
          restoreQty,
          prevStock,
          newStock,
          `Invoice #${invoiceNum} Edited (Qty reduced -${restoreQty})`
        );
        changes.push(`Restored ${restoreQty}x ${data.name} to stock (Stock now ${newStock})`);
      }
    }
  });

  saveProducts(products);
  return changes;
}

/**
 * Restore inventory stock upon invoice cancellation or refund (Wrapper)
 */
export function processInvoiceStockRestoration(invoice: Invoice, reason: string = 'Invoice Cancelled/Refunded'): void {
  restoreStockOnCancellation(invoice.id);
}

