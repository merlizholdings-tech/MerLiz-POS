import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, InvoiceStatus, OrderProgressStatus, PrintOptions, SalesConsultant, ClientPaymentType, PaymentMethod, Product } from '../types';
import { formatCurrency, generateWhatsAppUrl, formatInvoiceWhatsAppText, getOrderProgressLabel, COMPANY_DETAILS } from '../utils/whatsapp';
import { getInvoices, saveInvoices, getSalesConsultants, getProducts } from '../utils/storage';
import { processInvoiceStockRestoration, restoreStockOnCancellation } from '../utils/inventoryModule';
import { editInvoice, calculateDueDate, disablePaymentMethodsForMonthly } from '../utils/paymentModule';
import { PrintableInvoice } from './PrintableInvoice';
import { PinModal } from './PinModal';
import { MERLIZ_LOGO_BASE64 } from '../utils/logoBase64';
import { 
  FileText, 
  Search, 
  Printer, 
  MessageSquare, 
  Copy, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  Eye,
  X,
  Truck,
  Calendar,
  User,
  PhoneCall,
  ChevronRight,
  Plus,
  Sliders,
  Receipt,
  RotateCcw,
  Briefcase,
  ExternalLink,
  Edit3,
  Save,
  Minus,
  Package
} from 'lucide-react';

interface InvoiceViewProps {
  initialSelectedInvoice?: Invoice | null;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ initialSelectedInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(initialSelectedInvoice || null);
  const [copyToast, setCopyToast] = useState<string | false>(false);
  const [restorationBanner, setRestorationBanner] = useState<{ show: boolean; message: string; details?: string[] } | null>(null);
  const [editSuccessBanner, setEditSuccessBanner] = useState<{ show: boolean; message: string; inventoryChanges: string[] } | null>(null);
  const [deletePinTargetId, setDeletePinTargetId] = useState<string | null>(null);

  // Full Invoice Edit Modal state
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedAddProductId, setSelectedAddProductId] = useState<string>('');

  // Admin section edit state for selected invoice
  const [adminRemark, setAdminRemark] = useState('');
  const [adminAdjustment, setAdminAdjustment] = useState<number>(0);
  const [adminPaymentLink, setAdminPaymentLink] = useState('');
  const [adminStatus, setAdminStatus] = useState<InvoiceStatus>('pending');
  const [adminSalesConsultantName, setAdminSalesConsultantName] = useState('');
  const [adminSalesConsultantPhone, setAdminSalesConsultantPhone] = useState('');
  const [adminItems, setAdminItems] = useState<InvoiceItem[]>([]);

  // Print Options state
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    preset: 'a4',
    showBankDetails: true,
    showDeliveryAddress: true,
    showRemark: true,
    showPaymentLink: true,
    showDriverInfo: true,
    showSalesConsultant: true,
    showLogo: true,
    customFooterText: 'Thank you for choosing MerLiz Holdings (PTY) Ltd Point of Sale Service!'
  });

  const [savedConsultants, setSavedConsultants] = useState<SalesConsultant[]>([]);

  useEffect(() => {
    const list = getInvoices();
    setInvoices(list);
    setSavedConsultants(getSalesConsultants());
  }, []);

  /**
   * Handlers for Full Invoice Editing Modal
   */
  const handleSaveInvoiceEdits = () => {
    if (!editingInvoice) return;
    const res = editInvoice(editingInvoice.id, editingInvoice);
    if (res.success && res.invoice) {
      setInvoices(getInvoices());
      if (selectedInvoice && selectedInvoice.id === editingInvoice.id) {
        setSelectedInvoice(res.invoice);
      }
      setEditSuccessBanner({
        show: true,
        message: res.message,
        inventoryChanges: res.inventoryChanges
      });
      setEditingInvoice(null);
    }
  };

  const handleAddProductToEditingInvoice = (productId: string) => {
    if (!editingInvoice || !productId) return;
    const products = getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    const newItem: InvoiceItem = {
      productId: prod.id,
      name: prod.name,
      quantity: 1,
      price: prod.price,
      total: prod.price,
      costPrice: typeof prod.costPrice === 'number' ? prod.costPrice : Math.round(prod.price * 0.65)
    };

    const updatedItems = [...editingInvoice.items, newItem];
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems
    });
    setSelectedAddProductId('');
  };

  const handleRemoveItemFromEditingInvoice = (index: number) => {
    if (!editingInvoice) return;
    const updatedItems = editingInvoice.items.filter((_, i) => i !== index);
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems
    });
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (!editingInvoice) return;
    if (newQty < 1) return;
    const updatedItems = [...editingInvoice.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: newQty,
      total: updatedItems[index].price * newQty
    };
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems
    });
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (!editingInvoice) return;
    const updatedItems = [...editingInvoice.items];
    updatedItems[index] = {
      ...updatedItems[index],
      price: newPrice,
      total: newPrice * updatedItems[index].quantity
    };
    setEditingInvoice({
      ...editingInvoice,
      items: updatedItems
    });
  };

  useEffect(() => {
    if (initialSelectedInvoice) {
      setSelectedInvoice(initialSelectedInvoice);
    }
  }, [initialSelectedInvoice]);

  useEffect(() => {
    if (selectedInvoice) {
      setAdminRemark(selectedInvoice.remark || '');
      setAdminAdjustment(selectedInvoice.adjustment || 0);
      setAdminPaymentLink(selectedInvoice.paymentLink || '');
      setAdminStatus(selectedInvoice.status || 'pending');
      setAdminSalesConsultantName(selectedInvoice.salesConsultantName || '');
      setAdminSalesConsultantPhone(selectedInvoice.salesConsultantPhone || '');
      setAdminItems(selectedInvoice.items ? JSON.parse(JSON.stringify(selectedInvoice.items)) : []);
    }
  }, [selectedInvoice?.id]);

  /**
   * Directly update Payment Status for an invoice (Paid, Pending, Overdue, Refunded, Draft)
   */
  const handleUpdateStatus = (invoiceId: string, newStatus: InvoiceStatus) => {
    const now = new Date().toISOString();
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        if (newStatus === 'refunded' && inv.status !== 'refunded') {
          processInvoiceStockRestoration(inv, 'Invoice marked as Refunded');
        }
        return {
          ...inv,
          status: newStatus,
          commissionStatus: newStatus === 'paid' ? 'released' : 'pending',
          paymentConfirmedAt: newStatus === 'paid' ? (inv.paymentConfirmedAt || now) : inv.paymentConfirmedAt
        };
      }
      return inv;
    });
    setInvoices(updated);
    saveInvoices(updated);

    if (selectedInvoice && selectedInvoice.id === invoiceId) {
      setSelectedInvoice({
        ...selectedInvoice,
        status: newStatus,
        paymentConfirmedAt: newStatus === 'paid' ? (selectedInvoice.paymentConfirmedAt || now) : selectedInvoice.paymentConfirmedAt
      });
      setAdminStatus(newStatus);
    }

    const statusLabels: Record<InvoiceStatus, string> = {
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      refunded: 'Refunded',
      draft: 'Draft'
    };

    setCopyToast(`Payment status updated to ${statusLabels[newStatus]}`);
    setTimeout(() => setCopyToast(false), 2500);
  };

  /**
   * Update Order Progress (Fulfillment Status) & Automatically Send WhatsApp Message Invoice
   */
  const handleUpdateOrderProgress = (invoiceId: string, newProgress: OrderProgressStatus) => {
    let updatedInvForWhatsApp: Invoice | null = null;
    const updated = invoices.map(inv => {
      if (inv.id === invoiceId) {
        const updatedInv = { ...inv, orderProgress: newProgress };
        updatedInvForWhatsApp = updatedInv;
        return updatedInv;
      }
      return inv;
    });
    setInvoices(updated);
    saveInvoices(updated);

    // If order is marked as Cancelled, perform stock restoration
    if (newProgress === 'cancelled') {
      const res = restoreStockOnCancellation(invoiceId);
      if (res.success) {
        setRestorationBanner({
          show: true,
          message: res.message,
          details: res.itemsRestored
        });
        setInvoices(getInvoices());
      }
    }

    if (selectedInvoice && selectedInvoice.id === invoiceId) {
      const freshList = getInvoices();
      const freshInv = freshList.find(i => i.id === invoiceId);
      setSelectedInvoice(freshInv || { ...selectedInvoice, orderProgress: newProgress });
    }

    // Trigger Automatic WhatsApp Message Invoice
    if (updatedInvForWhatsApp) {
      const inv: Invoice = updatedInvForWhatsApp;
      const messageText = formatInvoiceWhatsAppText(inv);
      const url = generateWhatsAppUrl(inv.customer.phone, messageText);
      window.open(url, '_blank');
      setCopyToast(`Order progress updated to "${getOrderProgressLabel(newProgress)}"! Opening WhatsApp invoice...`);
      setTimeout(() => setCopyToast(false), 3000);
    }
  };

  const handleUpdateDeliveryDetails = (
    invoiceId: string, 
    details: { deliveryDate?: string; courierCompany?: string; driverName?: string; driverPhone?: string }
  ) => {
    const updated = invoices.map(inv => inv.id === invoiceId ? { ...inv, ...details } : inv);
    setInvoices(updated);
    saveInvoices(updated);
    if (selectedInvoice && selectedInvoice.id === invoiceId) {
      setSelectedInvoice({ ...selectedInvoice, ...details });
    }
  };

  // Item editing handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...adminItems];
    const item = { ...newItems[index] };

    if (field === 'name') {
      item.name = String(value);
    } else if (field === 'price') {
      const p = parseFloat(value) || 0;
      item.price = p;
      item.total = p * item.quantity;
    } else if (field === 'quantity') {
      const q = Math.max(1, parseInt(value, 10) || 1);
      item.quantity = q;
      item.total = item.price * q;
    }

    newItems[index] = item;
    setAdminItems(newItems);
  };

  const handleAdminDeleteItem = (index: number) => {
    if (adminItems.length <= 1) {
      if (!window.confirm('Deleting all items will reset invoice subtotal to R 0.00. Do you want to proceed?')) {
        return;
      }
    }
    const updated = adminItems.filter((_, i) => i !== index);
    setAdminItems(updated);
  };

  const handleAdminAddItem = () => {
    const newItem: InvoiceItem = {
      productId: 'custom-' + Date.now(),
      name: 'Custom Line Item',
      price: 0,
      quantity: 1,
      total: 0
    };
    setAdminItems([...adminItems, newItem]);
  };

  // Calculated totals for Admin Section
  const adminSubtotal = adminItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const adminLateFee = selectedInvoice?.isLatePayment ? adminSubtotal * 0.1 : 0;
  const adminTotalAmount = Math.max(0, adminSubtotal + adminLateFee + (Number(adminAdjustment) || 0));

  const handleSaveAdminSection = (asDraft: boolean = false) => {
    if (!selectedInvoice) return;

    const adjustmentValue = Number(adminAdjustment) || 0;
    const subtotal = adminSubtotal;
    const latePaymentFee = adminLateFee;
    const totalAmount = adminTotalAmount;
    const newStatus: InvoiceStatus = asDraft ? 'draft' : adminStatus;
    const now = new Date().toISOString();

    const cleanItems: InvoiceItem[] = adminItems.map(item => {
      const price = Number(item.price) || 0;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      return {
        ...item,
        price,
        quantity,
        total: price * quantity
      };
    });

    const updatedInv: Invoice = {
      ...selectedInvoice,
      items: cleanItems,
      subtotal,
      latePaymentFee,
      adjustment: adjustmentValue,
      paymentLink: adminPaymentLink,
      remark: adminRemark,
      totalAmount,
      status: newStatus,
      paymentConfirmedAt: newStatus === 'paid' ? (selectedInvoice.paymentConfirmedAt || now) : selectedInvoice.paymentConfirmedAt,
      salesConsultantName: adminSalesConsultantName.trim() || undefined,
      salesConsultantPhone: adminSalesConsultantPhone.trim() || undefined
    };

    const updatedList = invoices.map(inv => inv.id === selectedInvoice.id ? updatedInv : inv);
    setInvoices(updatedList);
    saveInvoices(updatedList);
    setSelectedInvoice(updatedInv);

    setCopyToast(asDraft ? 'Invoice saved as Draft!' : 'Invoice, Sales Consultant & Payment status saved!');
    setTimeout(() => setCopyToast(false), 2500);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setDeletePinTargetId(invoiceId);
  };

  const confirmDeleteInvoice = () => {
    if (!deletePinTargetId) return;
    const updated = invoices.filter(inv => inv.id !== deletePinTargetId);
    setInvoices(updated);
    saveInvoices(updated);
    if (selectedInvoice?.id === deletePinTargetId) {
      setSelectedInvoice(null);
    }
    setDeletePinTargetId(null);
  };

  const handleCopyWhatsAppText = (invoice: Invoice) => {
    const text = formatInvoiceWhatsAppText(invoice);
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast('WhatsApp invoice text copied to clipboard!');
      setTimeout(() => setCopyToast(false), 2000);
    });
  };

  const handleSendWhatsApp = (invoice: Invoice) => {
    const text = formatInvoiceWhatsAppText(invoice);
    const url = generateWhatsAppUrl(invoice.customer.phone, text);
    window.open(url, '_blank');
  };

  /**
   * Standalone Print Window - Foolproof Printing Mechanism
   * Opens a clean browser window with printable HTML, bypassing iframe sandboxing restrictions.
   */
  const handleOpenPrintWindow = (invToPrint?: Invoice) => {
    const targetInvoice = invToPrint || selectedInvoice;
    if (!targetInvoice) return;

    const printWin = window.open('', '_blank', 'width=850,height=1100');
    if (!printWin) {
      alert('Pop-up window was blocked. Please allow pop-ups for this site to print invoices.');
      return;
    }

    const isReceipt = printOptions.preset === 'receipt';
    const currentItems = adminItems.length > 0 ? adminItems : targetInvoice.items;
    const currentSubtotal = adminSubtotal > 0 ? adminSubtotal : targetInvoice.subtotal;
    const currentLateFee = targetInvoice.isLatePayment ? currentSubtotal * 0.1 : 0;
    const currentAdjustment = Number(adminAdjustment) || targetInvoice.adjustment || 0;
    const currentTotal = Math.max(0, currentSubtotal + currentLateFee + currentAdjustment);
    const currentSalesConsultantName = adminSalesConsultantName || targetInvoice.salesConsultantName;
    const currentSalesConsultantPhone = adminSalesConsultantPhone || targetInvoice.salesConsultantPhone;
    const currentRemark = adminRemark || targetInvoice.remark;
    const currentPaymentLink = adminPaymentLink || targetInvoice.paymentLink;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice #${targetInvoice.invoiceNumber} - ${COMPANY_DETAILS.name}</title>
          <style>
            @page {
              size: ${isReceipt ? '80mm auto' : 'A4 portrait'};
              margin: ${isReceipt ? '0' : '10mm'};
            }
            * { box-sizing: border-box; }
            body {
              font-family: ${isReceipt ? '"Courier New", Courier, monospace' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'};
              color: #000;
              background: #fff;
              margin: 0;
              padding: ${isReceipt ? '12px' : '24px'};
              font-size: ${isReceipt ? '11px' : '12px'};
              line-height: 1.4;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: ${isReceipt ? '1px dashed #000' : '2px solid #000'};
              padding-bottom: ${isReceipt ? '8px' : '14px'};
              margin-bottom: ${isReceipt ? '8px' : '16px'};
            }
            .company { font-size: ${isReceipt ? '13px' : '20px'}; font-weight: bold; text-transform: uppercase; }
            .subtext { font-size: 10px; color: #333; }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 10px;
              border: 1px solid #000;
            }
            .paid { background: #dcfce7; color: #166534; border-color: #15803d; }
            .pending { background: #fef3c7; color: #92400e; border-color: #d97706; }
            .refunded { background: #f3e8ff; color: #6b21a8; border-color: #7e22ce; }
            .draft { background: #f3f4f6; color: #374151; border-color: #6b7280; }
            .grid {
              display: grid;
              grid-template-columns: ${isReceipt ? '1fr' : '1fr 1fr'};
              gap: 12px;
              margin-bottom: 16px;
            }
            .card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              padding: 10px;
              border-radius: 6px;
            }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th { background: #f3f4f6; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 6px; text-align: left; font-weight: bold; font-size: 11px; }
            td { padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            .totals-container { display: flex; justify-content: flex-end; margin-bottom: 16px; }
            .totals { width: ${isReceipt ? '100%' : '280px'}; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
            .footer { border-top: 1px dashed #000; padding-top: 10px; margin-top: 16px; font-size: 10px; text-align: center; }
            img.invoice-logo {
              display: block !important;
              max-width: 160px !important;
              width: ${isReceipt ? '120px' : '150px'} !important;
              height: auto !important;
              margin-bottom: 8px;
            }
            .no-print-btn {
              position: fixed;
              top: 12px;
              right: 12px;
              background: #d4af37;
              color: #000;
              font-weight: bold;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              box-shadow: 0 4px 10px rgba(0,0,0,0.2);
              z-index: 9999;
            }
            @media print {
              .no-print-btn { display: none !important; }
              img.invoice-logo {
                display: block !important;
                visibility: visible !important;
                max-width: 160px !important;
                width: ${isReceipt ? '120px' : '150px'} !important;
                height: auto !important;
              }
            }
          </style>
        </head>
        <body>
          <button class="no-print-btn" onclick="window.print()">🖨️ Click Here to Print Document</button>

          <div class="header">
            <div>
              ${printOptions.showLogo !== false ? `
                <img src="${MERLIZ_LOGO_BASE64}" alt="MerLiz Holdings Logo" class="invoice-logo" />
              ` : ''}
              <div class="company">${COMPANY_DETAILS.name}</div>
              <div class="subtext">Taking you there • Point of Sale Service</div>
              <div class="subtext">Reg #: ${COMPANY_DETAILS.regNumber} | Email: ${COMPANY_DETAILS.email}</div>
              <div class="subtext">Tel / WhatsApp: ${COMPANY_DETAILS.whatsappPhone} | ${COMPANY_DETAILS.address}</div>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 16px;">TAX INVOICE</h2>
              <div style="font-weight: bold; font-size: 13px;">${targetInvoice.invoiceNumber}</div>
              <div class="subtext">Issued: ${targetInvoice.date}</div>
              <div class="subtext">Pay Term: ${targetInvoice.payDate}</div>
              <div style="margin-top: 4px;">
                <span class="badge ${targetInvoice.status}">${targetInvoice.status}</span>
              </div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <strong>CUSTOMER DETAILS:</strong><br/>
              • Name: ${targetInvoice.customer.fullName}<br/>
              • Phone: ${targetInvoice.customer.phone}<br/>
              • Fulfillment: ${targetInvoice.customer.deliveryOption === 'delivery' ? 'Home Delivery' : 'Self-Pickup'}<br/>
              ${printOptions.showSalesConsultant && currentSalesConsultantName ? `
                <div style="margin-top: 6px; padding-top: 4px; border-top: 1px border #e5e7eb;">
                  <strong>SALES CONSULTANT (ADMIN):</strong><br/>
                  • Name: ${currentSalesConsultantName}<br/>
                  • Contact: ${currentSalesConsultantPhone || 'N/A'}
                </div>
              ` : ''}
            </div>

            ${printOptions.showDeliveryAddress ? `
              <div class="card">
                ${targetInvoice.customer.deliveryOption === 'delivery' ? `
                  <strong>DELIVERY & COURIER DETAILS:</strong><br/>
                  • Address: ${targetInvoice.customer.address}<br/>
                  • Scheduled Date: ${targetInvoice.deliveryDate || 'On Confirmation'}<br/>
                  ${printOptions.showDriverInfo ? `
                    • Company: ${targetInvoice.courierCompany || 'MerLiz Logistics'}<br/>
                    • Driver: ${targetInvoice.driverName || 'Assigned Driver'} (${targetInvoice.driverPhone || 'N/A'})
                  ` : ''}
                ` : `
                  <strong>SELF-PICKUP STORE:</strong><br/>
                  • Location: ${COMPANY_DETAILS.address}<br/>
                  • Payment Method: ${targetInvoice.paymentMethod.replace('_', ' ').toUpperCase()}
                `}
              </div>
            ` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Item Description</th>
                <th style="width: 15%; text-align: center;">Qty</th>
                <th style="width: 17%; text-align: right;">Unit Price</th>
                <th style="width: 18%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${currentItems.map(i => `
                <tr>
                  <td>${i.name}</td>
                  <td style="text-align: center;">${i.quantity}</td>
                  <td style="text-align: right;">R ${Number(i.price).toFixed(2)}</td>
                  <td style="text-align: right;">R ${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-container">
            <div class="totals">
              <div class="row"><span>Subtotal:</span> <span>R ${currentSubtotal.toFixed(2)}</span></div>
              ${targetInvoice.isLatePayment && currentLateFee > 0 ? `
                <div class="row" style="color: #c53030; font-weight: bold;">
                  <span>Late Fee (10%):</span> <span>+R ${currentLateFee.toFixed(2)}</span>
                </div>
              ` : ''}
              ${currentAdjustment !== 0 ? `
                <div class="row" style="color: #1e3a8a; font-weight: bold;">
                  <span>Adjustment:</span> <span>${currentAdjustment > 0 ? '+' : ''}R ${currentAdjustment.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="row grand-total">
                <span>TOTAL PAYABLE:</span> <span>R ${currentTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${printOptions.showRemark && currentRemark ? `
            <div style="background: #fffbe3; border: 1px solid #fef08a; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px;">
              <strong>ADMIN REMARK / NOTE:</strong> ${currentRemark}
            </div>
          ` : ''}

          ${printOptions.showPaymentLink && currentPaymentLink ? `
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; word-break: break-all;">
              <strong>PAYMENT LINK:</strong> <a href="${currentPaymentLink}">${currentPaymentLink}</a>
            </div>
          ` : ''}

          ${printOptions.showBankDetails ? `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 10px; font-size: 10px; color: #4b5563;">
              <strong>BANK TRANSFER (EFT) DETAILS:</strong><br/>
              Bank: First National Bank | Account #: 63040483652 | Branch Code: 250655 | Reference: ${targetInvoice.invoiceNumber}
            </div>
          ` : ''}

          <div class="footer">
            ${printOptions.customFooterText || 'Thank you for choosing MerLiz Holdings (PTY) Ltd Point of Sale Service!'}
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  /**
   * Primary Print Handler with Fail-safe Fallback
   */
  const handlePrint = () => {
    if (!selectedInvoice) return;

    try {
      // Clean up existing print iframe
      const existingIframe = document.getElementById('invoice-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'invoice-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        handleOpenPrintWindow(selectedInvoice);
        return;
      }

      const isReceipt = printOptions.preset === 'receipt';
      const currentItems = adminItems.length > 0 ? adminItems : selectedInvoice.items;
      const currentSubtotal = adminSubtotal > 0 ? adminSubtotal : selectedInvoice.subtotal;
      const currentLateFee = selectedInvoice.isLatePayment ? currentSubtotal * 0.1 : 0;
      const currentAdjustment = Number(adminAdjustment) || selectedInvoice.adjustment || 0;
      const currentTotal = Math.max(0, currentSubtotal + currentLateFee + currentAdjustment);
      const currentSalesConsultantName = adminSalesConsultantName || selectedInvoice.salesConsultantName;
      const currentSalesConsultantPhone = adminSalesConsultantPhone || selectedInvoice.salesConsultantPhone;

      const content = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice #${selectedInvoice.invoiceNumber}</title>
            <style>
              @page { size: ${isReceipt ? '80mm auto' : 'A4 portrait'}; margin: ${isReceipt ? '0' : '10mm'}; }
              * { box-sizing: border-box; }
              body { font-family: ${isReceipt ? '"Courier New", Courier, monospace' : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'}; color: #000; background: #fff; margin: 0; padding: 16px; font-size: ${isReceipt ? '11px' : '12px'}; line-height: 1.4; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; pb: 10px; mb: 12px; }
              .company { font-weight: bold; font-size: ${isReceipt ? '13px' : '18px'}; text-transform: uppercase; }
              .subtext { font-size: 10px; color: #333; }
              table { width: 100%; border-collapse: collapse; margin: 10px 0; }
              th { border-bottom: 1px solid #000; text-align: left; padding: 4px; font-size: 10px; text-transform: uppercase; }
              td { padding: 4px; border-bottom: 1px solid #eee; font-size: 11px; }
              .totals { float: right; width: 260px; font-size: 11px; margin-top: 8px; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; }
              .footer { clear: both; text-align: center; border-top: 1px dashed #000; pt: 8px; mt: 12px; font-size: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                ${printOptions.showLogo !== false ? `
                  <img src="${MERLIZ_LOGO_BASE64}" alt="MerLiz Holdings Logo" class="invoice-logo" style="max-width: 150px; height: auto; display: block; margin-bottom: 8px;" />
                ` : ''}
                <div class="company">${COMPANY_DETAILS.name}</div>
                <div class="subtext">Reg: ${COMPANY_DETAILS.regNumber} | Tel: ${COMPANY_DETAILS.whatsappPhone}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:bold;">${selectedInvoice.invoiceNumber}</div>
                <div class="subtext">Date: ${selectedInvoice.date}</div>
                <div class="subtext">Status: ${selectedInvoice.status.toUpperCase()}</div>
              </div>
            </div>

            <div style="margin-bottom:10px;">
              <strong>Customer:</strong> ${selectedInvoice.customer.fullName} (${selectedInvoice.customer.phone})<br/>
              ${printOptions.showSalesConsultant && currentSalesConsultantName ? `
                <strong>Sales Consultant:</strong> ${currentSalesConsultantName} (${currentSalesConsultantPhone || 'N/A'})<br/>
              ` : ''}
              ${selectedInvoice.customer.deliveryOption === 'delivery' ? `<strong>Delivery Addr:</strong> ${selectedInvoice.customer.address}` : `<strong>Pickup:</strong> ${COMPANY_DETAILS.address}`}
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Price</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${currentItems.map(i => `
                  <tr>
                    <td>${i.name}</td>
                    <td style="text-align:center;">${i.quantity}</td>
                    <td style="text-align:right;">R ${Number(i.price).toFixed(2)}</td>
                    <td style="text-align:right;">R ${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="row"><span>Subtotal:</span> <span>R ${currentSubtotal.toFixed(2)}</span></div>
              ${selectedInvoice.isLatePayment && currentLateFee > 0 ? `<div class="row" style="color:red;"><span>Late Fee (10%):</span> <span>+R ${currentLateFee.toFixed(2)}</span></div>` : ''}
              ${currentAdjustment !== 0 ? `<div class="row"><span>Adjustment:</span> <span>${currentAdjustment > 0 ? '+' : ''}R ${currentAdjustment.toFixed(2)}</span></div>` : ''}
              <div class="row" style="font-weight:bold; font-size:13px; border-top:1px solid #000; pt:4px;"><span>TOTAL:</span> <span>R ${currentTotal.toFixed(2)}</span></div>
            </div>

            <div class="footer">
              ${printOptions.customFooterText || 'Thank you for choosing MerLiz Holdings!'}
            </div>
          </body>
        </html>
      `;

      doc.open();
      doc.write(content);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          handleOpenPrintWindow(selectedInvoice);
        }
      }, 250);
    } catch (e) {
      handleOpenPrintWindow(selectedInvoice);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer.phone.includes(searchTerm) ||
      (inv.salesConsultantName && inv.salesConsultantName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#1e2029] text-[#d4af37] border border-[#d4af37]/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">{copyToast}</span>
        </div>
      )}

      {/* Stock Restoration Confirmation Banner (MerLiz Dark Gold Theme) */}
      {restorationBanner && restorationBanner.show && (
        <div className="bg-[#181610] border-2 border-[#d4af37]/80 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center shrink-0 text-[#d4af37]">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#d4af37] flex items-center gap-2">
                <span>{restorationBanner.message}</span>
              </h4>
              {restorationBanner.details && restorationBanner.details.length > 0 && (
                <p className="text-gray-300 text-[11px] mt-0.5">
                  Restored items: <span className="text-[#f3e098] font-semibold">{restorationBanner.details.join(', ')}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setRestorationBanner(null)}
            className="self-end sm:self-center px-3.5 py-1.5 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 text-[#d4af37] rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* Invoice Edit Confirmation Banner (MerLiz Dark Gold Theme) */}
      {editSuccessBanner && editSuccessBanner.show && (
        <div className="bg-[#181610] border-2 border-[#d4af37]/80 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center shrink-0 text-[#d4af37]">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#d4af37]">
                {editSuccessBanner.message}
              </h4>
              {editSuccessBanner.inventoryChanges && editSuccessBanner.inventoryChanges.length > 0 && (
                <p className="text-gray-300 text-[11px] mt-0.5">
                  Inventory Sync: <span className="text-[#f3e098] font-semibold">{editSuccessBanner.inventoryChanges.join(' | ')}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditSuccessBanner(null)}
            className="self-end sm:self-center px-3.5 py-1.5 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 text-[#d4af37] rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#12131a] border border-[#2a2a35] p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-bold font-cinzel text-gold-gradient flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#d4af37]" />
            <span>Tax Invoices & Orders</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage payment statuses, sales consultants, printable invoices, and automatic WhatsApp updates.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {['all', 'pending', 'paid', 'overdue', 'refunded', 'draft'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-gold-gradient text-[#0b0b0e] shadow-md font-bold'
                  : 'bg-[#1c1c24] text-gray-400 hover:text-white border border-[#2a2a35]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by invoice number, customer name, phone, or sales consultant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#12131a] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 pl-12 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
        />
      </div>

      {/* Invoices List Table */}
      <div className="bg-[#12131a] border border-[#2a2a35] rounded-2xl shadow-xl overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-gray-600" />
            <p className="text-sm font-medium">No invoices found matching your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-gray-300">
              <thead className="bg-[#181924] text-gray-400 text-[11px] uppercase tracking-wider border-b border-[#2a2a35]">
                <tr>
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Sales Consultant</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Pay Date</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a35]/60">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[#1a1b26] transition-colors">
                    <td className="py-4 px-4 font-bold text-white">
                      {invoice.invoiceNumber}
                      <span className="block text-[10px] text-gray-400 font-normal">{invoice.date}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-100">{invoice.customer.fullName}</div>
                      <div className="text-[11px] text-gray-400">{invoice.customer.phone}</div>
                    </td>
                    <td className="py-4 px-4 text-xs">
                      {invoice.salesConsultantName ? (
                        <div>
                          <span className="font-semibold text-[#d4af37] flex items-center gap-1">
                            <Briefcase className="w-3 h-3 shrink-0" />
                            {invoice.salesConsultantName}
                          </span>
                          {invoice.salesConsultantPhone && (
                            <span className="text-[10px] text-gray-400 block">{invoice.salesConsultantPhone}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-400">
                      {formatCurrency(invoice.totalAmount)}
                      {invoice.isLatePayment && (
                        <span className="block text-[10px] text-red-400 font-normal">+10% Late Fee</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-300">
                      {invoice.payDate}
                    </td>
                    
                    {/* Quick Payment Status Select Dropdown in Table */}
                    <td className="py-4 px-4">
                      <select
                        value={invoice.status}
                        onChange={(e) => handleUpdateStatus(invoice.id, e.target.value as InvoiceStatus)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#0b0b0e] border cursor-pointer focus:outline-none ${
                          invoice.status === 'paid' 
                            ? 'text-emerald-400 border-emerald-500/40' 
                            : invoice.status === 'refunded'
                            ? 'text-purple-400 border-purple-500/40'
                            : invoice.status === 'draft'
                            ? 'text-gray-400 border-gray-500/40'
                            : 'text-amber-400 border-amber-500/40'
                        }`}
                      >
                        <option value="pending" className="bg-[#12131a] text-amber-400">PENDING</option>
                        <option value="paid" className="bg-[#12131a] text-emerald-400">PAID</option>
                        <option value="overdue" className="bg-[#12131a] text-red-400">OVERDUE</option>
                        <option value="refunded" className="bg-[#12131a] text-purple-400">REFUNDED</option>
                        <option value="draft" className="bg-[#12131a] text-gray-400">DRAFT</option>
                      </select>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingInvoice(JSON.parse(JSON.stringify(invoice)))}
                          className="p-1.5 bg-[#1f202b] hover:bg-[#d4af37] text-gray-300 hover:text-black rounded-lg transition-colors cursor-pointer"
                          title="Edit Invoice Fields & Items"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="p-1.5 bg-[#1f202b] hover:bg-[#d4af37] text-gray-300 hover:text-[#0b0b0e] rounded-lg transition-colors cursor-pointer"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPrintWindow(invoice)}
                          className="p-1.5 bg-[#1f202b] hover:bg-[#d4af37] text-gray-300 hover:text-black rounded-lg transition-colors cursor-pointer"
                          title="Print Invoice Document"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopyWhatsAppText(invoice)}
                          className="p-1.5 bg-[#1f202b] hover:bg-emerald-500 text-gray-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Copy WhatsApp Format"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendWhatsApp(invoice)}
                          className="p-1.5 bg-[#1f202b] hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Open WhatsApp Direct Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="p-1.5 bg-[#1f202b] hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Invoice Detailed View & Edit Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#12131a] border border-[#2a2a35] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-[#2a2a35] flex items-center justify-between sticky top-0 bg-[#12131a] z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-gradient p-0.5 shrink-0">
                  <div className="w-full h-full bg-[#0b0b0e] rounded-[10px] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#d4af37]" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white font-cinzel">
                    Invoice #{selectedInvoice.invoiceNumber}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Created on {selectedInvoice.date} • Pay term date: {selectedInvoice.payDate}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                {/* Full Edit Invoice Modal Trigger */}
                <button
                  onClick={() => setEditingInvoice(JSON.parse(JSON.stringify(selectedInvoice)))}
                  className="flex items-center gap-1.5 bg-[#181610] hover:bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow"
                  title="Edit Invoice Fields, Items & Payment Terms"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Invoice</span>
                </button>

                {/* Print Window (New Tab) Button - Rectifying Print Capability */}
                <button
                  onClick={() => handleOpenPrintWindow(selectedInvoice)}
                  className="flex items-center gap-1.5 bg-[#d4af37] text-black font-bold px-3 py-1.5 rounded-xl text-xs shadow hover:brightness-110 transition-all cursor-pointer"
                  title="Open Printable Document Window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Print Window</span>
                </button>

                {/* Print Settings Toggle */}
                <button
                  onClick={() => setShowPrintOptions(!showPrintOptions)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    showPrintOptions 
                      ? 'bg-[#d4af37] text-black border-[#d4af37]' 
                      : 'bg-[#1c1c24] text-gray-200 border-[#2a2a35] hover:border-[#d4af37]'
                  }`}
                  title="Configure Print Layout & Options"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Print Options</span>
                </button>

                {/* Status Selector in Modal Header */}
                <select
                  value={selectedInvoice.status}
                  onChange={(e) => handleUpdateStatus(selectedInvoice.id, e.target.value as InvoiceStatus)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#0b0b0e] border cursor-pointer focus:outline-none ${
                    selectedInvoice.status === 'paid' 
                      ? 'text-emerald-400 border-emerald-500/40' 
                      : selectedInvoice.status === 'refunded'
                      ? 'text-purple-400 border-purple-500/40'
                      : selectedInvoice.status === 'draft'
                      ? 'text-gray-400 border-gray-500/40'
                      : 'text-amber-400 border-amber-500/40'
                  }`}
                >
                  <option value="pending" className="bg-[#12131a] text-amber-400">PENDING</option>
                  <option value="paid" className="bg-[#12131a] text-emerald-400">PAID</option>
                  <option value="overdue" className="bg-[#12131a] text-red-400">OVERDUE</option>
                  <option value="refunded" className="bg-[#12131a] text-purple-400">REFUNDED</option>
                  <option value="draft" className="bg-[#12131a] text-gray-400">DRAFT</option>
                </select>

                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1f202b] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Options Drawer / Settings Panel */}
            {showPrintOptions && (
              <div className="bg-[#181924] border-b border-[#2a2a35] p-4 sm:p-5 text-gray-200 animate-fadeIn space-y-4">
                <div className="flex items-center justify-between border-b border-[#2a2a35] pb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#d4af37]">
                    <Sliders className="w-4 h-4" />
                    <span>Print Customization & Layout Settings</span>
                  </div>
                  <button
                    onClick={() => setShowPrintOptions(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Close Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preset Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">Print Document Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPrintOptions({ ...printOptions, preset: 'a4' })}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          printOptions.preset === 'a4'
                            ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md'
                            : 'bg-[#12131a] text-gray-300 border-[#2a2a35] hover:border-gray-500'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Standard A4 Tax Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintOptions({ ...printOptions, preset: 'receipt' })}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          printOptions.preset === 'receipt'
                            ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-md'
                            : 'bg-[#12131a] text-gray-300 border-[#2a2a35] hover:border-gray-500'
                        }`}
                      >
                        <Receipt className="w-4 h-4" />
                        <span>80mm Thermal Receipt</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Footer Text */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">Custom Footer Message</label>
                    <input
                      type="text"
                      value={printOptions.customFooterText}
                      onChange={(e) => setPrintOptions({ ...printOptions, customFooterText: e.target.value })}
                      placeholder="e.g. Thank you for your business!"
                      className="w-full bg-[#12131a] border border-[#2a2a35] text-gray-100 px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                {/* Toggles for content sections */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-300 mb-2">Included Print Sections</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                    {[
                      { key: 'showLogo', label: 'Company Logo' },
                      { key: 'showSalesConsultant', label: 'Sales Consultant' },
                      { key: 'showBankDetails', label: 'EFT Bank Info' },
                      { key: 'showDeliveryAddress', label: 'Address Info' },
                      { key: 'showDriverInfo', label: 'Courier/Driver' },
                      { key: 'showRemark', label: 'Admin Remarks' },
                      { key: 'showPaymentLink', label: 'Payment Link' }
                    ].map((item) => (
                      <label
                        key={item.key}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          (printOptions as any)[item.key]
                            ? 'bg-[#d4af37]/15 border-[#d4af37] text-white font-semibold'
                            : 'bg-[#12131a] border-[#2a2a35] text-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={(printOptions as any)[item.key]}
                          onChange={(e) => setPrintOptions({ ...printOptions, [item.key]: e.target.checked })}
                          className="rounded text-[#d4af37] focus:ring-0 accent-[#d4af37]"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Order Progress & Automatic WhatsApp Notification Control */}
            <div className="bg-[#181924] border-b border-[#2a2a35] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Fulfillment Order Progress Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center justify-between">
                  <span>Order Fulfillment Status</span>
                  <span className="text-[10px] text-emerald-400 font-normal">⚡ Auto-Sends WhatsApp on Change</span>
                </label>
                <select
                  value={selectedInvoice.orderProgress}
                  onChange={(e) => handleUpdateOrderProgress(selectedInvoice.id, e.target.value as OrderProgressStatus)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-xl text-xs focus:outline-none font-bold"
                >
                  <option value="pending">⏳ Order Pending</option>
                  <option value="confirmed">✅ Order Confirmed</option>
                  <option value="ready">📦 Ready for Pickup / Dispatch</option>
                  <option value="out_for_delivery">🚚 Out for Delivery</option>
                  <option value="completed">🎉 Order Completed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </select>
                {(selectedInvoice.stock_restored || selectedInvoice.stockRestored) && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-[11px] font-bold">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Stock Restored to Inventory</span>
                  </div>
                )}
              </div>

              {/* Delivery Details Editor (if delivery option is delivery) */}
              {selectedInvoice.customer.deliveryOption === 'delivery' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Courier Company</label>
                    <input
                      type="text"
                      value={selectedInvoice.courierCompany || ''}
                      onChange={(e) => handleUpdateDeliveryDetails(selectedInvoice.id, { courierCompany: e.target.value })}
                      placeholder="e.g. MerLiz Express"
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] text-gray-100 px-2.5 py-1 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Driver Name</label>
                    <input
                      type="text"
                      value={selectedInvoice.driverName || ''}
                      onChange={(e) => handleUpdateDeliveryDetails(selectedInvoice.id, { driverName: e.target.value })}
                      placeholder="e.g. Sipho Ndlovu"
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] text-gray-100 px-2.5 py-1 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">Driver Contact Phone</label>
                    <input
                      type="text"
                      value={selectedInvoice.driverPhone || ''}
                      onChange={(e) => handleUpdateDeliveryDetails(selectedInvoice.id, { driverPhone: e.target.value })}
                      placeholder="e.g. +27 82 987 6543"
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] text-gray-100 px-2.5 py-1 rounded text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body with Admin Edit Controls & Printable Layout */}
            <div className="p-4 sm:p-6 space-y-6">
              
              {/* Admin Edit Controls Panel */}
              <div className="bg-white text-black rounded-2xl border border-gray-300 shadow-xl overflow-hidden no-print">
                {/* Dark Header Banner */}
                <div className="bg-[#1e2029] text-white px-5 py-3 font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#d4af37]" />
                    Invoice & Admin Management (Payment, Sales Consultant & Items)
                  </span>
                  <span className="text-[11px] font-normal text-gray-400">Invoice #{selectedInvoice.invoiceNumber}</span>
                </div>

                <div className="p-5 space-y-5">

                  {/* Payment Status & Sales Consultant Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 p-4 rounded-xl">
                    
                    {/* Payment Status Selector */}
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1">
                        Payment Status
                      </label>
                      <select
                        value={adminStatus}
                        onChange={(e) => {
                          const val = e.target.value as InvoiceStatus;
                          setAdminStatus(val);
                          handleUpdateStatus(selectedInvoice.id, val);
                        }}
                        className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                      >
                        <option value="pending">⏳ Pending</option>
                        <option value="paid">✅ Paid</option>
                        <option value="overdue">⚠️ Overdue</option>
                        <option value="refunded">🟣 Refunded</option>
                        <option value="draft">⚪ Draft</option>
                      </select>
                    </div>

                    {/* Sales Consultant Selection & Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-gray-900">
                          Sales Consultant Name
                        </label>
                        {savedConsultants.length > 0 && (
                          <select
                            onChange={(e) => {
                              const found = savedConsultants.find(sc => sc.id === e.target.value);
                              if (found) {
                                setAdminSalesConsultantName(found.name);
                                setAdminSalesConsultantPhone(found.phone);
                              }
                            }}
                            className="text-[10px] bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none"
                          >
                            <option value="">-- Quick Pick --</option>
                            {savedConsultants.map(sc => (
                              <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Sipho Ndlovu"
                        value={adminSalesConsultantName}
                        onChange={(e) => setAdminSalesConsultantName(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>

                    {/* Sales Consultant Phone */}
                    <div>
                      <label className="block text-xs font-bold text-gray-900 mb-1">
                        Sales Consultant Contact No.
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +27 663 758 904"
                        value={adminSalesConsultantPhone}
                        onChange={(e) => setAdminSalesConsultantPhone(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Itemized Line Items Editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900">Invoice Items</h3>
                        <p className="text-[11px] text-gray-500">Edit item names, unit prices, quantity, or delete/add items</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAdminAddItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-900 text-white hover:bg-black transition-all cursor-pointer shadow"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Add Item Line</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300">
                            <th className="py-2 px-2">Item Description</th>
                            <th className="py-2 px-2 text-center w-20">Qty</th>
                            <th className="py-2 px-2 text-right w-28">Unit Price (R)</th>
                            <th className="py-2 px-2 text-right w-28">Line Total</th>
                            <th className="py-2 px-2 text-center w-12">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {adminItems.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50/80">
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                  className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-2.5 py-1.5 rounded text-xs font-semibold focus:outline-none"
                                  placeholder="Item name"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                  className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-2 py-1.5 rounded text-xs text-center font-semibold focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2 text-right">
                                <input
                                  type="number"
                                  step="any"
                                  value={item.price}
                                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                  className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-2 py-1.5 rounded text-xs text-right font-semibold focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2 text-right font-bold text-gray-900">
                                {formatCurrency(item.price * item.quantity)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleAdminDeleteItem(index)}
                                  className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded transition-colors cursor-pointer"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Calculated Summary Preview */}
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs font-bold text-gray-900 gap-2">
                      <div>
                        <span>Subtotal: </span>
                        <span className="text-gray-700">{formatCurrency(adminSubtotal)}</span>
                      </div>
                      {selectedInvoice.isLatePayment && (
                        <div className="text-red-700">
                          <span>Late Fee (10%): </span>
                          <span>+{formatCurrency(adminLateFee)}</span>
                        </div>
                      )}
                      <div>
                        <span>Calculated Total: </span>
                        <span className="text-[#d4af37] text-sm font-extrabold">{formatCurrency(adminTotalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Remark & Adjustment Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Remark */}
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-0.5">Customer Remark</label>
                      <span className="block text-[11px] text-gray-500 mb-1.5">Note visible to customer on invoice</span>
                      <input
                        type="text"
                        placeholder="Optional note"
                        value={adminRemark}
                        onChange={(e) => setAdminRemark(e.target.value)}
                        className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-3.5 py-2 rounded-xl text-xs focus:outline-none shadow-sm"
                      />
                    </div>

                    {/* Adjustment */}
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-0.5">Adjustment Amount (R)</label>
                      <span className="block text-[11px] text-gray-500 mb-1.5">Add discount (-R) or extra fee (+R)</span>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-xs">R</span>
                        <input
                          type="number"
                          step="any"
                          value={adminAdjustment}
                          onChange={(e) => setAdminAdjustment(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none shadow-sm font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Link */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-900 mb-0.5">Payment Link</label>
                    <span className="block text-[11px] text-gray-500 mb-1.5">Online customer payment portal link</span>
                    <input
                      type="url"
                      placeholder="https://pay.merliz.co.za/..."
                      value={adminPaymentLink}
                      onChange={(e) => setAdminPaymentLink(e.target.value)}
                      className="w-full bg-white border border-gray-300 focus:border-[#d4af37] text-gray-900 px-3.5 py-2 rounded-xl text-xs focus:outline-none shadow-sm font-mono"
                    />
                  </div>

                  {/* Save Buttons Bar */}
                  <div className="flex items-center justify-start gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveAdminSection(false)}
                      className="px-8 py-2.5 rounded-xl text-sm font-bold bg-[#d4af37] hover:bg-[#b8952b] text-black shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      Save Invoice & Staff Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveAdminSection(true)}
                      className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      Save as Draft
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Printable Layout Preview */}
              <div className="relative">
                <div className="bg-[#1e2029] text-[#d4af37] px-4 py-2 rounded-t-xl text-xs font-bold flex items-center justify-between border border-b-0 border-gray-700">
                  <span>Live Printable Preview ({printOptions.preset.toUpperCase()} Format)</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenPrintWindow(selectedInvoice)}
                      className="text-[10px] bg-[#d4af37] text-black font-bold px-2 py-0.5 rounded hover:brightness-110 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Print Window</span>
                    </button>
                  </div>
                </div>
                <PrintableInvoice 
                  invoice={{
                    ...selectedInvoice,
                    status: adminStatus,
                    items: adminItems,
                    subtotal: adminSubtotal,
                    latePaymentFee: adminLateFee,
                    adjustment: Number(adminAdjustment) || 0,
                    totalAmount: adminTotalAmount,
                    remark: adminRemark,
                    paymentLink: adminPaymentLink,
                    salesConsultantName: adminSalesConsultantName || selectedInvoice.salesConsultantName,
                    salesConsultantPhone: adminSalesConsultantPhone || selectedInvoice.salesConsultantPhone
                  }} 
                  options={printOptions} 
                />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Full Interactive Invoice Edit Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-[#12131a] border-2 border-[#d4af37]/60 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col my-auto">
            
            {/* Edit Header */}
            <div className="p-4 sm:p-5 border-b border-[#2a2a35] flex items-center justify-between sticky top-0 bg-[#12131a] z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 border border-[#d4af37] flex items-center justify-center text-[#d4af37] shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <span>Edit Invoice #{editingInvoice.invoiceNumber}</span>
                    {editingInvoice.editedAt && (
                      <span className="text-[10px] bg-[#d4af37]/20 text-[#d4af37] px-2 py-0.5 rounded-full border border-[#d4af37]/40">
                        Edited: {new Date(editingInvoice.editedAt).toLocaleDateString()}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Modify customer details, items, quantities, prices, payment mode, or delivery options.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1f202b] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gold MerLiz Banner */}
            <div className="p-4 sm:p-6 space-y-6">
              <div className="bg-[#181610] border-2 border-[#d4af37]/60 p-4 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] rounded-lg shrink-0 mt-0.5">
                  <Sliders className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <h4 className="font-bold text-[#d4af37] text-sm">Invoice Editing Mode</h4>
                  <p className="text-gray-300 mt-0.5 leading-relaxed">
                    Full control over customer details, items, quantities, pricing, payment category, and delivery options. 
                    Inventory levels and sales consultant commissions will automatically synchronize when changes are saved.
                  </p>
                </div>
              </div>

              {/* Section 1: Customer Details */}
              <div className="bg-[#181924] border border-[#2a2a35] p-4 sm:p-5 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Customer Profile</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Customer Full Name</label>
                    <input
                      type="text"
                      value={editingInvoice.customer.fullName}
                      onChange={(e) => setEditingInvoice({
                        ...editingInvoice,
                        customer: { ...editingInvoice.customer, fullName: e.target.value }
                      })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Contact Phone</label>
                    <input
                      type="text"
                      value={editingInvoice.customer.phone}
                      onChange={(e) => setEditingInvoice({
                        ...editingInvoice,
                        customer: { ...editingInvoice.customer, phone: e.target.value }
                      })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-gray-400 mb-1 font-semibold">Delivery Address</label>
                    <textarea
                      value={editingInvoice.customer.address}
                      onChange={(e) => setEditingInvoice({
                        ...editingInvoice,
                        customer: { ...editingInvoice.customer, address: e.target.value }
                      })}
                      rows={2}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Payment Category & Billing */}
              <div className="bg-[#181924] border border-[#2a2a35] p-4 sm:p-5 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Payment Category & Terms</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Client Payment Category</label>
                    <select
                      value={editingInvoice.clientPaymentType || 'pay_on_delivery'}
                      onChange={(e) => {
                        const newType = e.target.value as ClientPaymentType;
                        const newPayDate = newType === 'end_of_month' ? calculateDueDate(editingInvoice.date) : editingInvoice.date;
                        setEditingInvoice({
                          ...editingInvoice,
                          clientPaymentType: newType,
                          payDate: newPayDate,
                          status: newType === 'end_of_month' ? 'pending' : editingInvoice.status
                        });
                      }}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="pay_on_delivery">📦 Pay-on-Delivery Client</option>
                      <option value="end_of_month">📅 End-of-Month Client (Monthly Payer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Payment Method</label>
                    <select
                      disabled={disablePaymentMethodsForMonthly(editingInvoice.clientPaymentType)}
                      value={editingInvoice.paymentMethod || 'cash'}
                      onChange={(e) => setEditingInvoice({
                        ...editingInvoice,
                        paymentMethod: e.target.value as PaymentMethod
                      })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="cash">💵 Cash Payment</option>
                      <option value="eft">🏦 EFT (Electronic Funds Transfer)</option>
                      <option value="card_machine">💳 Card Machine</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold font-mono">Payment Due Date</label>
                    <input
                      type="date"
                      value={editingInvoice.payDate || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, payDate: e.target.value })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>

                  {editingInvoice.paymentMethod === 'card_machine' && editingInvoice.clientPaymentType !== 'end_of_month' && (
                    <div className="sm:col-span-2">
                      <label className="block text-gray-400 mb-1 font-semibold">Card Machine Transaction Ref #</label>
                      <input
                        type="text"
                        placeholder="e.g., TXN-998811"
                        value={editingInvoice.cardTransactionRef || ''}
                        onChange={(e) => setEditingInvoice({ ...editingInvoice, cardTransactionRef: e.target.value })}
                        className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Payment Status</label>
                    <select
                      value={editingInvoice.status}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, status: e.target.value as InvoiceStatus })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="pending" className="text-amber-400">PENDING</option>
                      <option value="paid" className="text-emerald-400">PAID</option>
                      <option value="overdue" className="text-red-400">OVERDUE</option>
                      <option value="refunded" className="text-purple-400">REFUNDED</option>
                      <option value="draft" className="text-gray-400">DRAFT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Order Progress</label>
                    <select
                      value={editingInvoice.orderProgress}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, orderProgress: e.target.value as OrderProgressStatus })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="pending">⏳ Order Pending</option>
                      <option value="confirmed">✅ Confirmed</option>
                      <option value="ready">📦 Order Ready</option>
                      <option value="out_for_delivery">🚚 Out for Delivery</option>
                      <option value="completed">🎉 Order Completed</option>
                      <option value="cancelled">❌ Cancelled (Restores Stock)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 3: Fulfillment Option & Courier Details */}
              <div className="bg-[#181924] border border-[#2a2a35] p-4 sm:p-5 rounded-xl space-y-4">
                <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  <span>Fulfillment & Delivery Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Delivery Option</label>
                    <select
                      value={editingInvoice.deliveryOption || 'pickup'}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, deliveryOption: e.target.value as 'delivery' | 'pickup' })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="pickup">🏪 Store Pickup</option>
                      <option value="delivery">🚚 Doorstep Delivery</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Delivery Date</label>
                    <input
                      type="date"
                      value={editingInvoice.deliveryDate || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, deliveryDate: e.target.value })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Courier / Driver Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Courier Guy / John"
                      value={editingInvoice.driverName || ''}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, driverName: e.target.value })}
                      className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Items & Quantities */}
              <div className="bg-[#181924] border border-[#2a2a35] p-4 sm:p-5 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#d4af37] uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span>Ordered Items & Prices</span>
                  </h3>

                  {/* Add Product Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedAddProductId}
                      onChange={(e) => setSelectedAddProductId(e.target.value)}
                      className="bg-[#0b0b0e] border border-[#2a2a35] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none max-w-[200px] cursor-pointer"
                    >
                      <option value="">Select Catalog Product...</option>
                      {getProducts().map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatCurrency(p.price)} - Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddProductToEditingInvoice(selectedAddProductId)}
                      disabled={!selectedAddProductId}
                      className="px-3 py-1.5 bg-[#d4af37] text-black font-bold text-xs rounded-lg hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#0b0b0e] text-gray-400 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3 text-center">Unit Price (R)</th>
                        <th className="py-2.5 px-3 text-center">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2a35]/60">
                      {editingInvoice.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-gray-500 italic">
                            No items added to invoice. Please select a product above to add.
                          </td>
                        </tr>
                      ) : (
                        editingInvoice.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#12131a]">
                            <td className="py-3 px-3 font-semibold text-white">{item.name}</td>
                            <td className="py-3 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => handleUpdateItemPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-24 bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded px-2 py-1 text-center text-white focus:outline-none"
                              />
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, item.quantity - 1)}
                                  className="p-1 bg-[#252636] hover:bg-[#323447] text-white rounded cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemQty(idx, parseInt(e.target.value, 10) || 1)}
                                  className="w-14 bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded px-1.5 py-1 text-center text-white font-bold focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItemQty(idx, item.quantity + 1)}
                                  className="p-1 bg-[#252636] hover:bg-[#323447] text-white rounded cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-400">
                              {formatCurrency(item.price * item.quantity)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromEditingInvoice(idx)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 5: Remarks & Notes */}
              <div className="bg-[#181924] border border-[#2a2a35] p-4 sm:p-5 rounded-xl space-y-2">
                <label className="block text-gray-400 text-xs font-semibold">Invoice Notes / Remarks</label>
                <textarea
                  value={editingInvoice.remark || ''}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, remark: e.target.value })}
                  rows={2}
                  placeholder="Add administrative notes or special delivery instructions..."
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-lg px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Edit Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-[#2a2a35] bg-[#12131a] sticky bottom-0 z-20 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setEditingInvoice(null)}
                className="px-4 py-2 bg-[#1f202b] hover:bg-[#2a2b3a] text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInvoiceEdits}
                className="px-6 py-2.5 bg-gold-gradient text-black font-extrabold rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Invoice Edits & Sync Inventory</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PIN Security Modal for Invoice Deletion */}
      <PinModal
        isOpen={!!deletePinTargetId}
        title="Delete Tax Invoice Record"
        description={`Authorized PIN verification required to delete invoice #${invoices.find(i => i.id === deletePinTargetId)?.invoiceNumber || ''}. This action will remove the record permanently.`}
        onConfirm={confirmDeleteInvoice}
        onCancel={() => setDeletePinTargetId(null)}
      />

    </div>
  );
};
