import { Invoice, CartItem, InvoiceItem, Product, ClientPaymentType } from '../types';
import { getInvoices, saveInvoices, getProducts } from './storage';

/**
 * 1. calculateProfit(items, products)
 * Calculates total profit from product items sold.
 * Profit = sum of ((selling_price - cost_price) * quantity) for each product item.
 * Note: Late payment fees and adjustments do NOT count towards consultant profit.
 */
export function calculateProfit(
  items: (CartItem | InvoiceItem)[],
  products?: Product[]
): number {
  if (!items || items.length === 0) return 0;

  const allProducts = products || getProducts();
  let totalProfit = 0;

  for (const item of items) {
    let sellingPrice = 0;
    let quantity = 0;
    let costPrice = 0;

    if ('product' in item) {
      // CartItem
      sellingPrice = item.product.price;
      quantity = item.quantity;
      costPrice = typeof item.product.costPrice === 'number' && !isNaN(item.product.costPrice)
        ? item.product.costPrice
        : Math.round(sellingPrice * 0.65);
    } else {
      // InvoiceItem
      sellingPrice = item.price;
      quantity = item.quantity;
      if (typeof item.costPrice === 'number' && !isNaN(item.costPrice)) {
        costPrice = item.costPrice;
      } else {
        const found = allProducts.find(p => p.id === item.productId || p.name === item.name);
        costPrice = typeof found?.costPrice === 'number' && !isNaN(found.costPrice)
          ? found.costPrice
          : Math.round(sellingPrice * 0.65);
      }
    }

    const itemProfit = Math.max(0, sellingPrice - costPrice) * quantity;
    totalProfit += itemProfit;
  }

  return Math.round(totalProfit * 100) / 100;
}

/**
 * 2. calculateCommission(profitAmount)
 * Sales consultants earn 40% of the PROFIT from the products they sold.
 */
export function calculateCommission(profitAmount: number): number {
  if (!profitAmount || profitAmount <= 0) return 0;
  return Math.round(profitAmount * 0.40 * 100) / 100;
}

/**
 * 3. lockCommissionUntilPaid(invoice)
 * Returns invoice with commission_status locked ('pending') until invoice is paid.
 * For Monthly Payers or unpaid Pay-on-Delivery invoices.
 */
export function lockCommissionUntilPaid(invoice: Invoice): Invoice {
  const isPaid = invoice.status === 'paid';
  return {
    ...invoice,
    commissionStatus: isPaid ? 'released' : 'pending'
  };
}

/**
 * 4. releaseCommissionOnPayment(invoiceId)
 * When invoice is marked as PAID, changes commission_status from 'pending' -> 'released'.
 */
export function releaseCommissionOnPayment(invoiceId: string): Invoice | null {
  const invoices = getInvoices();
  const index = invoices.findIndex(i => i.id === invoiceId || i.invoiceNumber === invoiceId);

  if (index === -1) return null;

  const invoice = invoices[index];
  const products = getProducts();

  const profit = typeof invoice.profitAmount === 'number' ? invoice.profitAmount : calculateProfit(invoice.items, products);
  const commission = typeof invoice.commissionAmount === 'number' ? invoice.commissionAmount : calculateCommission(profit);

  const updated: Invoice = {
    ...invoice,
    status: 'paid',
    profitAmount: profit,
    commissionAmount: commission,
    commissionStatus: 'released',
    paymentConfirmedAt: invoice.paymentConfirmedAt || new Date().toISOString()
  };

  invoices[index] = updated;
  saveInvoices(invoices);
  return updated;
}

export interface ConsultantSummary {
  consultantId: string;
  consultantName: string;
  totalProfit: number;
  totalCommissionReleased: number;
  totalCommissionPending: number;
  totalCommissionAll: number;
  invoicesCount: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  lateInvoicesCount: number;
  monthlyPayersCount: number;
  invoices: Invoice[];
}

/**
 * 5. getConsultantCommissionSummary(consultantId, filters)
 * Generates commission metrics for a specific consultant (or all consultants).
 */
export function getConsultantCommissionSummary(
  consultantIdOrName?: string,
  filters?: {
    status?: 'all' | 'paid' | 'unpaid' | 'late' | 'monthly_payers';
    searchQuery?: string;
  }
): ConsultantSummary {
  const invoices = getInvoices();
  const products = getProducts();

  // Normalize invoices with commission calculations if missing
  const normalizedInvoices = invoices.map(inv => {
    const profit = typeof inv.profitAmount === 'number' ? inv.profitAmount : calculateProfit(inv.items, products);
    const comm = typeof inv.commissionAmount === 'number' ? inv.commissionAmount : calculateCommission(profit);
    const commStatus = inv.status === 'paid' ? 'released' : (inv.commissionStatus || 'pending');

    return {
      ...inv,
      profitAmount: profit,
      commissionAmount: comm,
      commissionStatus: commStatus as 'pending' | 'released'
    };
  });

  // Filter invoices linked to consultant
  const linkedInvoices = normalizedInvoices.filter(inv => {
    if (!consultantIdOrName || consultantIdOrName === 'all') return true;

    return (
      inv.consultantId === consultantIdOrName ||
      inv.salesConsultantName?.toLowerCase().trim() === consultantIdOrName.toLowerCase().trim()
    );
  });

  let totalProfit = 0;
  let totalCommissionReleased = 0;
  let totalCommissionPending = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let lateCount = 0;
  let monthlyCount = 0;

  linkedInvoices.forEach(inv => {
    const profit = inv.profitAmount || 0;
    const comm = inv.commissionAmount || 0;

    totalProfit += profit;

    if (inv.status === 'paid' || inv.commissionStatus === 'released') {
      totalCommissionReleased += comm;
      paidCount++;
    } else {
      totalCommissionPending += comm;
      pendingCount++;
    }

    if (inv.isLatePayment || inv.status === 'overdue') {
      lateCount++;
    }

    if (inv.clientPaymentType === 'end_of_month' || inv.customer?.paymentType === 'end_of_month') {
      monthlyCount++;
    }
  });

  // Apply sub-filters for dashboard view
  let filteredInvoices = linkedInvoices;
  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'paid') {
      filteredInvoices = filteredInvoices.filter(i => i.status === 'paid');
    } else if (filters.status === 'unpaid') {
      filteredInvoices = filteredInvoices.filter(i => i.status !== 'paid');
    } else if (filters.status === 'late') {
      filteredInvoices = filteredInvoices.filter(i => i.isLatePayment || i.status === 'overdue');
    } else if (filters.status === 'monthly_payers') {
      filteredInvoices = filteredInvoices.filter(i => i.clientPaymentType === 'end_of_month' || i.customer?.paymentType === 'end_of_month');
    }
  }

  if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
    const q = filters.searchQuery.toLowerCase().trim();
    filteredInvoices = filteredInvoices.filter(i =>
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.customer.fullName.toLowerCase().includes(q) ||
      i.customer.phone.includes(q) ||
      (i.salesConsultantName && i.salesConsultantName.toLowerCase().includes(q))
    );
  }

  return {
    consultantId: consultantIdOrName || 'all',
    consultantName: consultantIdOrName === 'all' || !consultantIdOrName ? 'All Sales Consultants' : consultantIdOrName,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalCommissionReleased: Math.round(totalCommissionReleased * 100) / 100,
    totalCommissionPending: Math.round(totalCommissionPending * 100) / 100,
    totalCommissionAll: Math.round((totalCommissionReleased + totalCommissionPending) * 100) / 100,
    invoicesCount: linkedInvoices.length,
    paidInvoicesCount: paidCount,
    pendingInvoicesCount: pendingCount,
    lateInvoicesCount: lateCount,
    monthlyPayersCount: monthlyCount,
    invoices: filteredInvoices
  };
}

// ==========================================
// MONTHLY PAYOUT STATEMENT MODULE
// ==========================================

export interface StatementInvoiceItem {
  invoiceNumber: string;
  clientName: string;
  paymentType: 'Monthly (EOM)' | 'Pay-on-Delivery';
  profitAmount: number;
  commissionAmount: number;
  paymentDate: string;
  invoiceTotal: number;
}

export interface MonthlyTotals {
  totalProfitGenerated: number;
  totalCommissionReleased: number;
  totalInvoicesPaid: number;
  totalInvoiceAmountPaid: number;
}

export interface MonthlyStatement {
  statementId: string;
  consultantId: string;
  consultantName: string;
  month: number; // 1-12
  monthName: string; // e.g., "August"
  year: number; // e.g., 2026
  generatedAt: string;
  status: 'Generated' | 'Exported';
  invoices: StatementInvoiceItem[];
  totals: MonthlyTotals;
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Calculates monthly totals for a given set of statement invoice items.
 */
export function calculateMonthlyTotals(invoices: StatementInvoiceItem[]): MonthlyTotals {
  let totalProfitGenerated = 0;
  let totalCommissionReleased = 0;
  let totalInvoiceAmountPaid = 0;

  for (const inv of invoices) {
    totalProfitGenerated += inv.profitAmount || 0;
    totalCommissionReleased += inv.commissionAmount || 0;
    totalInvoiceAmountPaid += inv.invoiceTotal || 0;
  }

  return {
    totalProfitGenerated: Math.round(totalProfitGenerated * 100) / 100,
    totalCommissionReleased: Math.round(totalCommissionReleased * 100) / 100,
    totalInvoicesPaid: invoices.length,
    totalInvoiceAmountPaid: Math.round(totalInvoiceAmountPaid * 100) / 100
  };
}

/**
 * Generates a monthly payout statement for a consultant for a given month and year.
 * Commission is ONLY released when the invoice status is 'paid'.
 */
export function generateMonthlyStatement(
  consultantIdOrName: string,
  month: number, // 1-12
  year: number   // e.g. 2026
): MonthlyStatement {
  const invoices = getInvoices();
  const products = getProducts();

  const monthName = MONTH_NAMES[month - 1] || `Month ${month}`;

  // Filter invoices for consultant, paid status, and matching month/year
  const matchingInvoices: StatementInvoiceItem[] = [];

  for (const inv of invoices) {
    // 1. Check consultant match
    const isConsultantMatch =
      !consultantIdOrName ||
      consultantIdOrName === 'all' ||
      inv.consultantId === consultantIdOrName ||
      (inv.salesConsultantName && inv.salesConsultantName.toLowerCase().trim() === consultantIdOrName.toLowerCase().trim());

    if (!isConsultantMatch) continue;

    // 2. Check payment status: MUST BE PAID for commission release
    if (inv.status !== 'paid') continue;

    // 3. Determine payment date
    const dateStr = inv.paymentConfirmedAt || inv.date || inv.createdAt;
    const invDate = new Date(dateStr);

    // If date parsing is valid, verify month and year
    let invMonth = invDate.getMonth() + 1; // 1-12
    let invYear = invDate.getFullYear();

    if (isNaN(invMonth) || isNaN(invYear)) {
      // Fallback: assume current month/year if string is unparseable
      invMonth = month;
      invYear = year;
    }

    if (invMonth === month && invYear === year) {
      const profit = typeof inv.profitAmount === 'number' ? inv.profitAmount : calculateProfit(inv.items, products);
      const commission = typeof inv.commissionAmount === 'number' ? inv.commissionAmount : calculateCommission(profit);

      const isEOM = inv.clientPaymentType === 'end_of_month' || inv.customer?.paymentType === 'end_of_month';

      matchingInvoices.push({
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.customer?.fullName || 'Client',
        paymentType: isEOM ? 'Monthly (EOM)' : 'Pay-on-Delivery',
        profitAmount: profit,
        commissionAmount: commission,
        paymentDate: dateStr.split('T')[0] || dateStr,
        invoiceTotal: inv.totalAmount
      });
    }
  }

  const totals = calculateMonthlyTotals(matchingInvoices);

  let cName = consultantIdOrName;
  if (consultantIdOrName === 'all' || !consultantIdOrName) {
    cName = 'All Sales Consultants';
  }

  return {
    statementId: `STMT-${year}-${String(month).padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
    consultantId: consultantIdOrName || 'all',
    consultantName: cName,
    month,
    monthName,
    year,
    generatedAt: new Date().toISOString(),
    status: 'Generated',
    invoices: matchingInvoices,
    totals
  };
}

/**
 * Exports statement object as a formatted JSON string.
 */
export function exportStatementAsJSON(statement: MonthlyStatement): string {
  const statementToExport: MonthlyStatement = {
    ...statement,
    status: 'Exported'
  };
  return JSON.stringify(statementToExport, null, 2);
}

/**
 * Generates a WhatsApp-ready summary text message for the monthly payout statement.
 */
export function generateWhatsAppStatementMessage(statement: MonthlyStatement): string {
  const formattedProfit = `R ${statement.totals.totalProfitGenerated.toFixed(2)}`;
  const formattedComm = `R ${statement.totals.totalCommissionReleased.toFixed(2)}`;
  const formattedSales = `R ${statement.totals.totalInvoiceAmountPaid.toFixed(2)}`;

  let msg = `🏆 *MERLIZ HOLDINGS (PTY) LTD*\n`;
  msg += `📊 *MONTHLY COMMISSION PAYOUT STATEMENT*\n`;
  msg += `------------------------------------------\n`;
  msg += `👤 *Consultant:* ${statement.consultantName}\n`;
  msg += `📅 *Period:* ${statement.monthName} ${statement.year}\n`;
  msg += `🆔 *Statement ID:* ${statement.statementId}\n`;
  msg += `------------------------------------------\n`;
  msg += `✅ *Total Invoices Paid:* ${statement.totals.totalInvoicesPaid}\n`;
  msg += `💵 *Total Sales Revenue:* ${formattedSales}\n`;
  msg += `📈 *Total Profit Generated:* ${formattedProfit}\n`;
  msg += `💰 *TOTAL COMMISSION RELEASED (40%):* ${formattedComm}\n`;
  msg += `------------------------------------------\n`;
  msg += `📋 *PAID INVOICES BREAKDOWN:*\n`;

  if (statement.invoices.length === 0) {
    msg += `_No settled invoices recorded for this period._\n`;
  } else {
    statement.invoices.forEach((inv, index) => {
      msg += `\n${index + 1}. *${inv.invoiceNumber}* - ${inv.clientName}\n`;
      msg += `   • Terms: ${inv.paymentType} | Date: ${inv.paymentDate}\n`;
      msg += `   • Profit: R ${inv.profitAmount.toFixed(2)} | Comm (40%): *R ${inv.commissionAmount.toFixed(2)}*\n`;
    });
  }

  msg += `\n------------------------------------------\n`;
  msg += `Thank you for your hard work & dedication!\n`;
  msg += `Taking you there • MerLiz POS Service`;

  return msg;
}

