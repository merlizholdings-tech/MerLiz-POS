import { Invoice } from '../types';

export const COMPANY_DETAILS = {
  name: 'MerLiz Holdings (PTY)Ltd',
  shortName: 'MerLiz Holdings (PTY)Ltd',
  regNumber: '2023/527022/07',
  whatsappPhone: '+27 663 758 904',
  whatsappPhoneClean: '27663758904',
  email: 'merlizholdings@gmail.com',
  address: "45 Edge Road, Weltevreden Valley, Mitchell's Plain"
};

/**
 * Format currency in South African Rands (ZAR)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Sanitize phone number for WhatsApp link format
 */
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return COMPANY_DETAILS.whatsappPhoneClean;
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0 (e.g., South Africa 082...), replace leading 0 with 27
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '27' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Helper to get human-readable order progress label
 */
export function getOrderProgressLabel(progress?: string): string {
  switch (progress) {
    case 'pending': return '⏳ Pending Review';
    case 'confirmed': return '✅ Order Confirmed';
    case 'ready': return '📦 Ready for Pickup/Dispatch';
    case 'out_for_delivery': return '🚚 Out for Delivery';
    case 'completed': return '🎉 Order Completed';
    case 'cancelled': return '❌ Cancelled';
    default: return '⏳ Pending';
  }
}

/**
 * Formats a clean, structured WhatsApp summary message for an invoice
 */
export function formatInvoiceWhatsAppText(invoice: Invoice): string {
  const lineItemsText = invoice.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.name}* (x${item.quantity}) - ${formatCurrency(item.total)}`
    )
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

  let deliverySection = '';
  if (invoice.customer.deliveryOption === 'delivery') {
    deliverySection = `
🚚 *DELIVERY DETAILS:*
• Address: ${invoice.customer.address}
• Delivery Date: ${invoice.deliveryDate || 'Scheduled on confirmation'}
• Delivery Company: ${invoice.courierCompany || 'MerLiz Delivery Team'}
• Driver Name: ${invoice.driverName || 'Assigned Driver'}
• Driver Contact: ${invoice.driverPhone || 'Contact Store'}`;
  } else {
    deliverySection = `
🏬 *FULFILLMENT:* Self-Pickup at Store (${COMPANY_DETAILS.address})`;
  }

  let lateFeeSection = '';
  if (invoice.isLatePayment && invoice.latePaymentFee > 0) {
    lateFeeSection = `
⚠️ *LATE PAYMENT FEE APPLIED (10%):* +${formatCurrency(invoice.latePaymentFee)}
_(Payment past set due date of ${invoice.payDate} + 2 days grace period)_`;
  }

  let adjustmentSection = '';
  if (invoice.adjustment && invoice.adjustment !== 0) {
    adjustmentSection = `
📝 *ADJUSTMENT:* ${invoice.adjustment > 0 ? '+' : ''}${formatCurrency(invoice.adjustment)}`;
  }

  let remarkSection = '';
  if (invoice.remark) {
    remarkSection = `
💬 *REMARK / NOTE:* ${invoice.remark}`;
  }

  let paymentLinkSection = '';
  if (invoice.paymentLink) {
    paymentLinkSection = `
🔗 *PAYMENT LINK:* ${invoice.paymentLink}`;
  }

  let paymentConfirmedSection = '';
  if (invoice.paymentConfirmedAt) {
    paymentConfirmedSection = `
✅ *PAYMENT CONFIRMED ON:* ${new Date(invoice.paymentConfirmedAt).toLocaleString('en-ZA')}`;
  }

  let salesConsultantSection = '';
  if (invoice.salesConsultantName) {
    salesConsultantSection = `
💼 *SALES CONSULTANT:* ${invoice.salesConsultantName} ${invoice.salesConsultantPhone ? `(${invoice.salesConsultantPhone})` : ''}`;
  }

  const message = `✨ *MERLIZ HOLDINGS (PTY)LTD - Point of Sale Service* ✨
Reg #: ${COMPANY_DETAILS.regNumber} | Email: ${COMPANY_DETAILS.email}

*Invoice #:* ${invoice.invoiceNumber}
*Date:* ${invoice.date}
*Payment Category:* ${paymentTypeLabel}
*Payment Due Date:* ${invoice.payDate}
*Payment Status:* ${invoice.status.toUpperCase()}
*Order Progress:* ${getOrderProgressLabel(invoice.orderProgress)}${paymentConfirmedSection}${salesConsultantSection}

👤 *CUSTOMER DETAILS:*
• Name: ${invoice.customer.fullName}
• Phone: ${invoice.customer.phone}
${deliverySection}

🛍️ *ORDERED ITEMS:*
${lineItemsText}

💰 *PAYMENT BREAKDOWN:*
• Subtotal: ${formatCurrency(invoice.subtotal)}${lateFeeSection}${adjustmentSection}
• *TOTAL PAYABLE:* *${formatCurrency(invoice.totalAmount)}*
• Payment Method: ${paymentMethodLabel}
${paymentLinkSection}${remarkSection}

BANK DETAILS FOR EFT:
Bank: First National Bank
Account #: 63040483652
Branch Code: 250655
Ref: ${invoice.invoiceNumber}

📍 *STORE ADDRESS:*
${COMPANY_DETAILS.address}
WhatsApp Support: ${COMPANY_DETAILS.whatsappPhone}

Thank you for choosing MerLiz Holdings (PTY)Ltd Point of Sale Service! 🛍️`;

  return message;
}

/**
 * Generate full WhatsApp API url
 */
export function generateWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = sanitizePhoneNumber(phone || COMPANY_DETAILS.whatsappPhoneClean);
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}
