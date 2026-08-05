import { Invoice, Product } from '../types';
import { getInvoices, getProducts } from './storage';

export interface DailySalesItem {
  product_id: string;
  product_name: string;
  quantity_sold: number;
  selling_price: number;
  cost_price: number;
  total_revenue: number;
  total_profit: number;
  consultant_id?: string;
  consultant_name?: string;
  consultants?: { id: string; name: string }[];
}

export interface DailySalesTotals {
  total_items_sold: number;
  total_revenue: number;
  total_profit: number;
  total_invoices_count: number;
  paid_invoices_count: number;
  completed_invoices_count: number;
}

export interface DailySalesReport {
  date: string;
  generated_at: string;
  sales_data: DailySalesItem[];
  best_seller: DailySalesItem | null;
  totals: DailySalesTotals;
  qualifying_invoices: Invoice[];
}

/**
 * 1. getDailySales(date)
 * Retrieves all items sold on the selected date from qualifying invoices.
 * Qualifying invoices: status == "paid" OR orderProgress == "completed".
 */
export function getDailySales(dateString?: string): DailySalesItem[] {
  const targetDate = dateString || new Date().toISOString().split('T')[0];
  const invoices = getInvoices();
  const products = getProducts();

  // Filter qualifying invoices for target date
  const qualifyingInvoices = invoices.filter(inv => {
    const invDate = inv.date || (inv.createdAt ? inv.createdAt.split('T')[0] : '');
    const isTargetDate = invDate === targetDate;
    
    const isPaid = inv.status && inv.status.toLowerCase() === 'paid';
    const isCompleted = inv.orderProgress && inv.orderProgress.toLowerCase() === 'completed';

    return isTargetDate && (isPaid || isCompleted);
  });

  // Map to aggregate product sales
  const productMap = new Map<string, {
    product_id: string;
    product_name: string;
    quantity_sold: number;
    total_revenue: number;
    total_profit: number;
    total_cost: number;
    consultantsMap: Map<string, string>;
  }>();

  qualifyingInvoices.forEach(inv => {
    if (!inv.items || !Array.isArray(inv.items)) return;

    inv.items.forEach(item => {
      const prodId = item.productId || item.name;
      const quantity = item.quantity || 0;
      const price = item.price || 0;
      const revenue = item.total || (price * quantity);

      // Determine cost price
      let costPrice = item.costPrice;
      if (typeof costPrice !== 'number' || isNaN(costPrice)) {
        const prodMatch = products.find(p => p.id === item.productId || p.name === item.name);
        if (prodMatch && typeof prodMatch.costPrice === 'number') {
          costPrice = prodMatch.costPrice;
        } else {
          costPrice = Math.round(price * 0.65);
        }
      }

      const totalCost = costPrice * quantity;
      const profit = Math.max(0, revenue - totalCost);

      const existing = productMap.get(prodId);
      if (existing) {
        existing.quantity_sold += quantity;
        existing.total_revenue += revenue;
        existing.total_profit += profit;
        existing.total_cost += totalCost;
        if (inv.consultantId && inv.salesConsultantName) {
          existing.consultantsMap.set(inv.consultantId, inv.salesConsultantName);
        }
      } else {
        const consultantsMap = new Map<string, string>();
        if (inv.consultantId && inv.salesConsultantName) {
          consultantsMap.set(inv.consultantId, inv.salesConsultantName);
        }
        productMap.set(prodId, {
          product_id: prodId,
          product_name: item.name,
          quantity_sold: quantity,
          total_revenue: revenue,
          total_profit: profit,
          total_cost: totalCost,
          consultantsMap
        });
      }
    });
  });

  // Convert map to DailySalesItem[]
  const result: DailySalesItem[] = [];
  productMap.forEach((val) => {
    const avgSellingPrice = val.quantity_sold > 0 
      ? Math.round((val.total_revenue / val.quantity_sold) * 100) / 100 
      : 0;
    const avgCostPrice = val.quantity_sold > 0 
      ? Math.round((val.total_cost / val.quantity_sold) * 100) / 100 
      : 0;

    const consultantsArr: { id: string; name: string }[] = [];
    val.consultantsMap.forEach((name, id) => {
      consultantsArr.push({ id, name });
    });

    result.push({
      product_id: val.product_id,
      product_name: val.product_name,
      quantity_sold: val.quantity_sold,
      selling_price: avgSellingPrice,
      cost_price: avgCostPrice,
      total_revenue: Math.round(val.total_revenue * 100) / 100,
      total_profit: Math.round(val.total_profit * 100) / 100,
      consultant_id: consultantsArr.length > 0 ? consultantsArr[0].id : undefined,
      consultant_name: consultantsArr.length > 0 ? consultantsArr.map(c => c.name).join(', ') : undefined,
      consultants: consultantsArr
    });
  });

  // Sort by quantity_sold descending
  result.sort((a, b) => b.quantity_sold - a.quantity_sold);

  return result;
}

/**
 * 2. calculateDailyTotals(salesData)
 * Computes aggregated daily metrics from sales items.
 */
export function calculateDailyTotals(salesData: DailySalesItem[], dateString?: string): DailySalesTotals {
  const targetDate = dateString || new Date().toISOString().split('T')[0];
  const invoices = getInvoices();

  const qualifyingInvoices = invoices.filter(inv => {
    const invDate = inv.date || (inv.createdAt ? inv.createdAt.split('T')[0] : '');
    const isTargetDate = invDate === targetDate;
    
    const isPaid = inv.status && inv.status.toLowerCase() === 'paid';
    const isCompleted = inv.orderProgress && inv.orderProgress.toLowerCase() === 'completed';

    return isTargetDate && (isPaid || isCompleted);
  });

  let total_items_sold = 0;
  let total_revenue = 0;
  let total_profit = 0;

  salesData.forEach(item => {
    total_items_sold += item.quantity_sold;
    total_revenue += item.total_revenue;
    total_profit += item.total_profit;
  });

  let paid_invoices_count = 0;
  let completed_invoices_count = 0;

  qualifyingInvoices.forEach(inv => {
    if (inv.status && inv.status.toLowerCase() === 'paid') paid_invoices_count++;
    if (inv.orderProgress && inv.orderProgress.toLowerCase() === 'completed') completed_invoices_count++;
  });

  return {
    total_items_sold,
    total_revenue: Math.round(total_revenue * 100) / 100,
    total_profit: Math.round(total_profit * 100) / 100,
    total_invoices_count: qualifyingInvoices.length,
    paid_invoices_count,
    completed_invoices_count
  };
}

/**
 * 3. getBestSellingItem(salesData)
 * Returns the product item with the highest quantity sold on the selected day.
 */
export function getBestSellingItem(salesData: DailySalesItem[]): DailySalesItem | null {
  if (!salesData || salesData.length === 0) return null;

  let best = salesData[0];
  for (let i = 1; i < salesData.length; i++) {
    if (salesData[i].quantity_sold > best.quantity_sold) {
      best = salesData[i];
    } else if (salesData[i].quantity_sold === best.quantity_sold) {
      if (salesData[i].total_revenue > best.total_revenue) {
        best = salesData[i];
      }
    }
  }

  return best;
}

/**
 * 4. generateDailySalesReport(date)
 * Compiles a full structured daily sales report object for display and printing.
 */
export function generateDailySalesReport(dateString?: string): DailySalesReport {
  const targetDate = dateString || new Date().toISOString().split('T')[0];
  const invoices = getInvoices();

  const qualifyingInvoices = invoices.filter(inv => {
    const invDate = inv.date || (inv.createdAt ? inv.createdAt.split('T')[0] : '');
    const isTargetDate = invDate === targetDate;
    
    const isPaid = inv.status && inv.status.toLowerCase() === 'paid';
    const isCompleted = inv.orderProgress && inv.orderProgress.toLowerCase() === 'completed';

    return isTargetDate && (isPaid || isCompleted);
  });

  const sales_data = getDailySales(targetDate);
  const totals = calculateDailyTotals(sales_data, targetDate);
  const best_seller = getBestSellingItem(sales_data);

  return {
    date: targetDate,
    generated_at: new Date().toISOString(),
    sales_data,
    best_seller,
    totals,
    qualifying_invoices: qualifyingInvoices
  };
}
