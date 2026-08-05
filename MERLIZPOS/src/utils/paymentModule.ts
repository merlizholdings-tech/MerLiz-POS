import { Customer, Invoice, PaymentMethod, ClientPaymentType, InvoiceStatus, InvoiceItem } from '../types';
import { formatCurrency, sanitizePhoneNumber, COMPANY_DETAILS, getOrderProgressLabel } from './whatsapp';
import { getInvoices, saveInvoices, getCustomers, saveCustomers, getProducts } from './storage';
import { calculateProfit, calculateCommission } from './commissionModule';
import { updateInventoryOnEdit, restoreStockOnCancellation } from './inventoryModule';

/**
 * 1. setPaymentType(customer, type) or setPaymentTypeByCustomerId(customerId, type)
 * Updates customer profile with payment type: 'end_of_month' | 'pay_on_delivery'
 */
export function setPaymentType(customerOrId: Customer | string, paymentType: ClientPaymentType): Customer | void {
  if (typeof customerOrId === 'string') {
    // ID version: update customer in localStorage
    const customers = getCustomers();
    const idx = customers.findIndex(c => c.id === customerOrId);
    if (idx !== -1) {
      customers[idx] = { ...customers[idx], paymentType };
      saveCustomers(customers);
      return customers[idx];
    }
    return;
  }
  return {
    ...customerOrId,
    paymentType
  };
}

/**
 * Helper to check if payment methods should be disabled
 */
export function disablePaymentMethodsForMonthly(paymentType: ClientPaymentType): boolean {
  return paymentType === 'end_of_month';
}

/**
 * 2. calculateDueDate / calculateMonthlyDueDate(dateStr?)
 * Calculates the due date as the last day of the current month for End-of-Month clients.
 * Format: YYYY-MM-DD
 */
export function calculateDueDate(dateStr?: string): string {
  const baseDate = dateStr ? new Date(dateStr) : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  
  // Day 0 of the next month is the last day of the current month
  const lastDay = new Date(year, month + 1, 0);
  
  const yyyy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, '0');
  const dd = String(lastDay.getDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
}

export const calculateMonthlyDueDate = calculateDueDate;

/**
 * 3. applyLateFee / applyLateFeeIfOverdue(subtotal, due_date, current_date)
 * For End-of-Month clients:
 * If payment is made > 2 days after due date (grace period = 2 days),
 * automatically add a 10% late payment fee.
 */
export function applyLateFee(
  subtotal: number,
  dueDateStr: string,
  currentDate?: Date
): { isLate: boolean; lateFee: number; totalAmount: number; daysOverdue: number } {
  if (!dueDateStr) {
    return { isLate: false, lateFee: 0, totalAmount: subtotal, daysOverdue: 0 };
  }

  const now = currentDate || new Date();
  
  const dateParts = dueDateStr.split('-');
  if (dateParts.length !== 3) {
    return { isLate: false, lateFee: 0, totalAmount: subtotal, daysOverdue: 0 };
  }

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);

  // Due date ends at 23:59:59 on that day
  const dueDateTime = new Date(year, month, day, 23, 59, 59, 999).getTime();
  
  // 2-day grace period = 2 * 24 hours in milliseconds
  const gracePeriodEnd = dueDateTime + (2 * 24 * 60 * 60 * 1000);

  const isLate = now.getTime() > gracePeriodEnd;
  const daysOverdue = isLate ? Math.max(1, Math.floor((now.getTime() - dueDateTime) / (1000 * 60 * 60 * 24))) : 0;
  const lateFee = isLate ? Math.round(subtotal * 0.10 * 100) / 100 : 0;
  const totalAmount = subtotal + lateFee;

  return {
    isLate,
    lateFee,
    totalAmount,
    daysOverdue
  };
}

export const applyLateFeeIfOverdue = applyLateFee;

/**
 * 4. markInvoicePaid(invoiceId, paymentMethod, cardRef)
 * Marks an invoice as paid with payment method & optional card transaction reference.
 */
export function markInvoicePaid(
  invoiceId: string,
  paymentMethod: PaymentMethod = 'cash',
  cardTransactionRef?: string
): Invoice | null {
  const invoices = getInvoices();
  const index = invoices.findIndex(i => i.id === invoiceId || i.invoiceNumber === invoiceId);
  
  if (index === -1) return null;

  const invoice = invoices[index];
  const updated: Invoice = {
    ...invoice,
    status: 'paid',
    commissionStatus: 'released',
    paymentMethod,
    cardTransactionRef: cardTransactionRef || invoice.cardTransactionRef,
    paymentConfirmedAt: new Date().toISOString()
  };

  invoices[index] = updated;
  saveInvoices(invoices);
  return updated;
}

/**
 * 5. generateWhatsAppMessage(invoice)
 * Formats a WhatsApp-ready payment summary message including payment type, due date, late fee (if applied).
 */
export function generateWhatsAppMessage(invoice: Invoice): string {
  const lineItemsText = invoice.items
    .map((item, idx) => `${idx + 1}. *${item.name}* (x${item.quantity}) - ${formatCurrency(item.total)}`)
    .join('\n');

  const isEOM = invoice.clientPaymentType === 'end_of_month';
  const paymentTypeLabel = isEOM ? '📅 End-of-Month Client' : '📦 Pay-on-Delivery Client';

  const paymentMethodLabel = 
    isEOM && invoice.status === 'pending'
      ? 'End-of-Month Account (No upfront payment required)'
      : invoice.paymentMethod === 'card_machine' 
      ? `Card Machine (Ref: ${invoice.cardTransactionRef || 'N/A'})` 
      : invoice.paymentMethod === 'eft' 
      ? 'EFT (Electronic Funds Transfer)' 
      : 'Cash Payment';

  let lateFeeText = '';
  if (invoice.isLatePayment && invoice.latePaymentFee > 0) {
    lateFeeText = `\n⚠️ *LATE PAYMENT FEE (10%):* +${formatCurrency(invoice.latePaymentFee)} (Payment > Due Date + 2 days)`;
  }

  let paymentConfirmedSection = '';
  if (invoice.paymentConfirmedAt) {
    paymentConfirmedSection = `\n✅ *PAYMENT CONFIRMED:* ${new Date(invoice.paymentConfirmedAt).toLocaleString('en-ZA')}`;
  }

  const message = `✨ *MERLIZ HOLDINGS (PTY)LTD - Point of Sale Service* ✨
Reg #: ${COMPANY_DETAILS.regNumber} | Email: ${COMPANY_DETAILS.email}

*Invoice #:* ${invoice.invoiceNumber}
*Date:* ${invoice.date}
*Payment Category:* ${paymentTypeLabel}
*Due Date:* ${invoice.payDate || calculateDueDate(invoice.date)}
*Payment Status:* ${invoice.status.toUpperCase()}${paymentConfirmedSection}
*Order Progress:* ${getOrderProgressLabel(invoice.orderProgress)}

👤 *CUSTOMER DETAILS:*
• Name: ${invoice.customer.fullName}
• Phone: ${invoice.customer.phone}
• Address: ${invoice.customer.address}

🛍️ *ORDERED ITEMS:*
${lineItemsText}

💰 *PAYMENT BREAKDOWN:*
• Subtotal: ${formatCurrency(invoice.subtotal)}${lateFeeText}
• *TOTAL PAYABLE:* *${formatCurrency(invoice.totalAmount)}*
• Payment Method: ${paymentMethodLabel}

📍 *STORE ADDRESS:*
${COMPANY_DETAILS.address}
Support Phone: ${COMPANY_DETAILS.whatsappPhone}

Thank you for choosing MerLiz Holdings (PTY)Ltd Point of Sale Service!`;

  return message;
}

/**
 * Generate full WhatsApp link URL
 */
export function getWhatsAppShareLink(phone: string, invoice: Invoice): string {
  const cleanPhone = sanitizePhoneNumber(phone || invoice.customer.phone || COMPANY_DETAILS.whatsappPhoneClean);
  const message = generateWhatsAppMessage(invoice);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Monthly Dashboard Summary for End-of-Month vs Pay-on-Delivery
 */
export function getMonthlyPaymentMetrics(monthYearStr?: string) {
  const invoices = getInvoices();
  
  // Selected month in YYYY-MM format, defaults to current month
  const targetMonth = monthYearStr || new Date().toISOString().substring(0, 7);

  const monthInvoices = invoices.filter(inv => inv.date.startsWith(targetMonth));

  const eomInvoices = monthInvoices.filter(inv => inv.clientPaymentType === 'end_of_month');
  const podInvoices = monthInvoices.filter(inv => inv.clientPaymentType === 'pay_on_delivery' || !inv.clientPaymentType);

  const eomTotalPurchases = eomInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const eomTotalPaid = eomInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const eomOutstanding = eomInvoices.filter(inv => inv.status !== 'paid' && inv.status !== 'refunded').reduce((sum, inv) => sum + inv.totalAmount, 0);
  const eomLateCount = eomInvoices.filter(inv => inv.isLatePayment && inv.status !== 'paid').length;
  const eomLateFeeTotal = eomInvoices.reduce((sum, inv) => sum + (inv.latePaymentFee || 0), 0);

  const podTotal = podInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  return {
    targetMonth,
    totalMonthInvoices: monthInvoices.length,
    eom: {
      count: eomInvoices.length,
      totalPurchases: eomTotalPurchases,
      totalPaid: eomTotalPaid,
      outstandingBalance: eomOutstanding,
      lateCount: eomLateCount,
      lateFeeTotal: eomLateFeeTotal,
      invoices: eomInvoices
    },
    pod: {
      count: podInvoices.length,
      totalSales: podTotal,
      invoices: podInvoices
    }
  };
}

/**
 * Applies Monthly Payment Rules to an invoice draft or updated invoice.
 */
export function applyMonthlyPaymentRules(invoice: Partial<Invoice>): Partial<Invoice> {
  const payDate = invoice.payDate || calculateDueDate(invoice.date);
  return {
    ...invoice,
    clientPaymentType: 'end_of_month',
    paymentMethod: 'cash',
    cardTransactionRef: undefined,
    status: invoice.status === 'paid' ? 'paid' : 'pending',
    payDate
  };
}

/**
 * Applies Pay-on-Delivery Rules to an invoice draft or updated invoice.
 */
export function applyPayOnDeliveryRules(
  invoice: Partial<Invoice>,
  selectedPaymentMethod: PaymentMethod = 'cash',
  cardRef?: string
): Partial<Invoice> {
  return {
    ...invoice,
    clientPaymentType: 'pay_on_delivery',
    paymentMethod: selectedPaymentMethod,
    cardTransactionRef: selectedPaymentMethod === 'card_machine' ? cardRef : undefined,
    status: invoice.status || 'paid'
  };
}

/**
 * Recalculate profit and commission after any invoice edit.
 * Profit = sum of (selling_price - cost_price) * quantity for products sold.
 * Commission = 40% of profit amount.
 * Late fee (10%) is NOT included in consultant profit.
 * Commission status is locked to 'pending' if unpaid, released if paid.
 */
export function recalcProfitAndCommission(invoice: Invoice): Invoice {
  const products = getProducts();
  const profitAmount = calculateProfit(invoice.items, products);
  const commissionAmount = calculateCommission(profitAmount);
  const commissionStatus = invoice.status === 'paid' ? 'released' : 'pending';

  return {
    ...invoice,
    profitAmount,
    commissionAmount,
    commissionStatus
  };
}

/**
 * Full invoice editing engine BEFORE or AFTER checkout.
 * - Allows updating customer details, items, quantities, unit prices, payment type, delivery option, notes.
 * - Synchronizes inventory with updateInventoryOnEdit().
 * - Recalculates totals, late fees, profit & commission.
 * - Saves edited invoices back into localStorage with editedAt timestamp.
 */
export function editInvoice(
  invoiceId: string,
  updatedFields: Partial<Invoice> & { items?: InvoiceItem[] }
): {
  success: boolean;
  invoice: Invoice | null;
  inventoryChanges: string[];
  message: string;
} {
  const invoices = getInvoices();
  const index = invoices.findIndex(i => i.id === invoiceId || i.invoiceNumber === invoiceId);

  if (index === -1) {
    return {
      success: false,
      invoice: null,
      inventoryChanges: [],
      message: 'Invoice not found.'
    };
  }

  const oldInvoice = invoices[index];
  const oldItems = [...oldInvoice.items];

  // Merge items or use updated items
  const newItems = updatedFields.items ? updatedFields.items : oldItems;

  // 1. Inventory Sync (if items/quantities changed)
  const inventoryChanges = updateInventoryOnEdit(oldInvoice.id, oldItems, newItems);

  // 2. Calculate subtotal from new items
  const subtotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 3. Payment Rules & Late Fee Calculation
  const clientPaymentType = updatedFields.clientPaymentType || oldInvoice.clientPaymentType || 'pay_on_delivery';
  const isEOM = clientPaymentType === 'end_of_month';
  const payDate = isEOM
    ? (updatedFields.payDate || oldInvoice.payDate || calculateDueDate(oldInvoice.date))
    : (updatedFields.payDate || oldInvoice.date);

  let isLatePayment = false;
  let latePaymentFee = 0;

  if (isEOM) {
    const breakdown = applyLateFee(subtotal, payDate);
    isLatePayment = breakdown.isLate;
    latePaymentFee = breakdown.lateFee;
  }

  const adjustment = updatedFields.adjustment !== undefined ? updatedFields.adjustment : (oldInvoice.adjustment || 0);
  const totalAmount = subtotal + latePaymentFee + adjustment;

  // 4. Merge fields
  let merged: Invoice = {
    ...oldInvoice,
    ...updatedFields,
    items: newItems,
    clientPaymentType,
    payDate,
    subtotal,
    isLatePayment,
    latePaymentFee,
    adjustment,
    totalAmount,
    editedAt: new Date().toISOString()
  };

  if (isEOM) {
    merged = {
      ...merged,
      ...applyMonthlyPaymentRules(merged)
    };
  } else {
    merged = {
      ...merged,
      ...applyPayOnDeliveryRules(merged, merged.paymentMethod, merged.cardTransactionRef)
    };
  }

  // Check if status changed to cancelled
  if (merged.orderProgress === 'cancelled' || merged.status === 'refunded') {
    if (!merged.stock_restored && !merged.stockRestored) {
      restoreStockOnCancellation(merged.id);
      merged.stock_restored = true;
      merged.stockRestored = true;
      merged.cancelledAt = new Date().toISOString();
    }
  }

  // 5. Recalculate Profit & Commission
  merged = recalcProfitAndCommission(merged);

  invoices[index] = merged;
  saveInvoices(invoices);

  return {
    success: true,
    invoice: merged,
    inventoryChanges,
    message: `Invoice #${merged.invoiceNumber} successfully updated!`
  };
}

