import React, { useState, useEffect } from 'react';
import { CartItem, Customer, DeliveryOption, PaymentMethod, Invoice, SalesConsultant, ClientPaymentType } from '../types';
import { formatCurrency } from '../utils/whatsapp';
import { 
  getCustomers, 
  saveCustomerProfile, 
  getNextInvoiceNumber, 
  getInvoices, 
  saveInvoices, 
  getSalesConsultants,
  addSalesConsultant,
  calculateInvoiceBreakdown, 
  clearCart 
} from '../utils/storage';
import { calculateDueDate, disablePaymentMethodsForMonthly } from '../utils/paymentModule';
import { processInvoiceStockDeduction } from '../utils/inventoryModule';
import { 
  User, 
  Phone, 
  MapPin, 
  Truck, 
  Store, 
  CreditCard, 
  Banknote, 
  Building2, 
  Calendar, 
  Clock,
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

import { calculateProfit, calculateCommission } from '../utils/commissionModule';

interface CheckoutViewProps {
  cart: CartItem[];
  onInvoiceCreated: (invoice: Invoice) => void;
  onGoToProducts: () => void;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  onInvoiceCreated,
  onGoToProducts
}) => {
  // Saved Customer Profiles
  const [savedCustomers, setSavedCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Client Payment Type ('end_of_month' | 'pay_on_delivery')
  const [clientPaymentType, setClientPaymentType] = useState<ClientPaymentType>('pay_on_delivery');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('delivery');

  // Delivery & Dispatch Details (if delivery selected)
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [deliveryDate, setDeliveryDate] = useState<string>(tomorrowStr);
  const [courierCompany, setCourierCompany] = useState<string>('MerLiz Express Delivery');
  const [driverName, setDriverName] = useState<string>('Sipho Ndlovu');
  const [driverPhone, setDriverPhone] = useState<string>('+27 82 987 6543');

  // Sales Consultant Fields
  const [savedConsultants, setSavedConsultants] = useState<SalesConsultant[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>('');
  const [salesConsultantName, setSalesConsultantName] = useState<string>('MerLiz Sales Team');
  const [salesConsultantPhone, setSalesConsultantPhone] = useState<string>('+27 663 758 904');
  const [saveAsNewConsultant, setSaveAsNewConsultant] = useState<boolean>(false);

  // Payment Fields
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_machine');
  const [cardTransactionRef, setCardTransactionRef] = useState('');
  
  // Pay Date (YYYY-MM-DD), default to last day of current month for EOM or today for POD
  const todayStr = new Date().toISOString().split('T')[0];
  const endOfMonthDueDate = calculateDueDate(todayStr);
  const [payDate, setPayDate] = useState<string>(endOfMonthDueDate);

  // Errors
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate Subtotal
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Live Late Fee Breakdown
  const breakdown = calculateInvoiceBreakdown(subtotal, payDate);

  useEffect(() => {
    const custs = getCustomers();
    setSavedCustomers(custs);

    const scs = getSalesConsultants();
    setSavedConsultants(scs);
    if (scs.length > 0) {
      setSalesConsultantName(scs[0].name);
      setSalesConsultantPhone(scs[0].phone);
      setSelectedConsultantId(scs[0].id);
    }
  }, []);

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) {
      setFullName('');
      setPhone('');
      setAddress('');
      return;
    }
    const found = savedCustomers.find(c => c.id === custId);
    if (found) {
      setFullName(found.fullName);
      setPhone(found.phone);
      setAddress(found.address);
      setDeliveryOption(found.deliveryOption);
      if (found.paymentType) {
        setClientPaymentType(found.paymentType);
        if (found.paymentType === 'end_of_month') {
          setPayDate(endOfMonthDueDate);
        } else {
          setPayDate(todayStr);
        }
      }
    }
  };

  const handleSelectConsultant = (scId: string) => {
    setSelectedConsultantId(scId);
    if (!scId) {
      setSalesConsultantName('');
      setSalesConsultantPhone('');
      return;
    }
    const found = savedConsultants.find(sc => sc.id === scId);
    if (found) {
      setSalesConsultantName(found.name);
      setSalesConsultantPhone(found.phone);
    }
  };

  const handleSubmitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (cart.length === 0) {
      setErrorMsg('Your shopping cart is empty.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg('Please enter customer full name.');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Please enter customer phone number.');
      return;
    }

    if (deliveryOption === 'delivery' && !address.trim()) {
      setErrorMsg('Please enter a delivery address.');
      return;
    }

    const isEOM = clientPaymentType === 'end_of_month';

    // Payment method validation applies strictly to Pay-on-Delivery clients!
    if (!isEOM) {
      if (paymentMethod === 'card_machine' && !cardTransactionRef.trim()) {
        setErrorMsg('Please enter the Card Machine Transaction Reference Number.');
        return;
      }
    }

    // Auto-save sales consultant to directory if requested or entered
    if (salesConsultantName.trim() && salesConsultantPhone.trim() && saveAsNewConsultant) {
      addSalesConsultant(salesConsultantName, salesConsultantPhone);
    }

    // 1. Save customer profile locally with Payment Type
    const savedCustomer = saveCustomerProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      address: deliveryOption === 'delivery' ? address.trim() : 'Self-Pickup at MerLiz Store',
      deliveryOption,
      paymentType: clientPaymentType
    });

    // 2. Generate Next Invoice Sequence Number
    const invoiceNumber = getNextInvoiceNumber();

    const computedPayDate = isEOM ? (payDate || endOfMonthDueDate) : todayStr;
    const computedStatus = isEOM ? 'pending' : 'paid';

    const invoiceItems = cart.map(i => ({
      productId: i.product.id,
      name: i.product.name,
      price: i.product.price,
      costPrice: typeof i.product.costPrice === 'number' ? i.product.costPrice : Math.round(i.product.price * 0.65),
      quantity: i.quantity,
      total: i.product.price * i.quantity
    }));

    const calculatedProfit = calculateProfit(cart);
    const calculatedCommission = calculateCommission(calculatedProfit);
    const initialCommissionStatus = computedStatus === 'paid' ? 'released' : 'pending';

    // 3. Create Invoice object
    const newInvoice: Invoice = {
      id: 'inv-' + Date.now(),
      invoiceNumber,
      date: todayStr,
      payDate: computedPayDate,
      customer: savedCustomer,
      clientPaymentType,
      items: invoiceItems,
      subtotal,
      paymentMethod: isEOM ? 'cash' : paymentMethod,
      cardTransactionRef: !isEOM && paymentMethod === 'card_machine' ? cardTransactionRef.trim() : undefined,
      isLatePayment: isEOM ? breakdown.isLate : false,
      latePaymentFee: isEOM ? breakdown.latePaymentFee : 0,
      totalAmount: isEOM ? breakdown.totalAmount : subtotal,
      status: computedStatus,
      paymentConfirmedAt: computedStatus === 'paid' ? new Date().toISOString() : undefined,
      orderProgress: 'confirmed',
      deliveryDate: deliveryOption === 'delivery' ? deliveryDate : undefined,
      courierCompany: deliveryOption === 'delivery' ? courierCompany : undefined,
      driverName: deliveryOption === 'delivery' ? driverName : undefined,
      driverPhone: deliveryOption === 'delivery' ? driverPhone : undefined,
      consultantId: selectedConsultantId.trim() || undefined,
      salesConsultantName: salesConsultantName.trim() || undefined,
      salesConsultantPhone: salesConsultantPhone.trim() || undefined,
      profitAmount: calculatedProfit,
      commissionAmount: calculatedCommission,
      commissionStatus: initialCommissionStatus,
      createdAt: new Date().toISOString()
    };

    // 4. Automatically deduct inventory stock & log activity
    processInvoiceStockDeduction(newInvoice);

    // 5. Save Invoice to localStorage
    const existingInvoices = getInvoices();
    saveInvoices([newInvoice, ...existingInvoices]);

    // 6. Clear cart
    clearCart();

    // 7. Callback to parent to view invoice
    onInvoiceCreated(newInvoice);
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center bg-[#14141a] border border-[#2a2a35] rounded-2xl p-8 space-y-4">
        <h3 className="font-cinzel text-xl font-bold text-gray-200">No Items to Checkout</h3>
        <p className="text-gray-400 text-sm">Add products to your cart before proceeding to checkout.</p>
        <button
          onClick={onGoToProducts}
          className="bg-gold-gradient text-[#0b0b0e] font-bold px-6 py-2.5 rounded-xl shadow-lg hover:brightness-110 transition-all"
        >
          View Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="border-b border-[#2a2a35] pb-4">
        <h2 className="font-cinzel text-2xl font-bold text-gold-gradient flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#d4af37]" />
          <span>Customer Checkout & Invoice Issue</span>
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Capture customer details, payment method, set payment due date, and issue tax invoice.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmitCheckout} className="space-y-6">
        
        {/* Section 1: Customer Details */}
        <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#22222d] pb-3">
            <h3 className="font-cinzel font-bold text-lg text-gray-100 flex items-center gap-2">
              <User className="w-4 h-4 text-[#d4af37]" />
              <span>1. Customer Details</span>
            </h3>

            {/* Quick Profile Selector */}
            {savedCustomers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 hidden sm:inline">Saved Profile:</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="bg-[#0b0b0e] border border-[#2a2a35] text-xs text-gold-gradient font-bold px-2.5 py-1.5 rounded-lg focus:outline-none"
                >
                  <option value="">-- New Customer --</option>
                  {savedCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} ({c.phone})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-300 font-semibold mb-1 block">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sophia Montgomery"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-300 font-semibold mb-1 block">Phone Number (WhatsApp) *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. +27 82 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Client Payment Type Selector */}
          <div>
            <label className="text-xs text-gray-300 font-semibold mb-2 block flex items-center justify-between">
              <span>Client Payment Terms *</span>
              <span className="text-[11px] text-[#d4af37] font-normal">
                {clientPaymentType === 'end_of_month' ? 'EOM Account' : 'Immediate Payment'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setClientPaymentType('pay_on_delivery');
                  setPayDate(todayStr);
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-xs transition-all ${
                  clientPaymentType === 'pay_on_delivery'
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-gray-100 font-bold'
                    : 'bg-[#0b0b0e] border-[#2a2a35] text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[#d4af37]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-bold">Pay-on-Delivery Client</span>
                </div>
                <span className="text-[11px] text-gray-400 font-normal mt-1">
                  Immediate payment via Cash, Card Machine, or EFT upon goods delivery.
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setClientPaymentType('end_of_month');
                  setPayDate(endOfMonthDueDate);
                }}
                className={`flex flex-col items-start p-3 rounded-xl border text-xs transition-all ${
                  clientPaymentType === 'end_of_month'
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-gray-100 font-bold'
                    : 'bg-[#0b0b0e] border-[#2a2a35] text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">End-of-Month Client</span>
                </div>
                <span className="text-[11px] text-gray-400 font-normal mt-1">
                  Receives goods during month. Due: last day of month. 10% late fee applies if &gt;2 days late.
                </span>
              </button>
            </div>
          </div>

          {/* Delivery vs Self Pickup Option */}
          <div>
            <label className="text-xs text-gray-300 font-semibold mb-2 block">Order Fulfillment Option</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryOption('delivery')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  deliveryOption === 'delivery'
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                    : 'bg-[#0b0b0e] border-[#2a2a35] text-gray-400 hover:text-gray-200'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Doorstep Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryOption('pickup')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                  deliveryOption === 'pickup'
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                    : 'bg-[#0b0b0e] border-[#2a2a35] text-gray-400 hover:text-gray-200'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Self-Pickup</span>
              </button>
            </div>
          </div>

          {deliveryOption === 'delivery' && (
            <div className="space-y-4 pt-2 border-t border-[#22222d]">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Delivery Street Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <textarea
                    required
                    rows={2}
                    placeholder="Street name, suburb, city, postal code"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Delivery Schedule & Driver Details */}
              <div className="bg-[#0b0b0e] border border-[#2a2a35] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold uppercase border-b border-[#1f1f2a] pb-2">
                  <Truck className="w-4 h-4" />
                  <span>Delivery Schedule & Driver Info</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Scheduled Delivery Date</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full bg-[#141419] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Delivery / Courier Company</label>
                    <input
                      type="text"
                      placeholder="e.g. MerLiz Express / Courier Guy"
                      value={courierCompany}
                      onChange={(e) => setCourierCompany(e.target.value)}
                      className="w-full bg-[#141419] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Driver Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sipho Ndlovu"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full bg-[#141419] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 font-semibold mb-1 block">Driver Contact Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. +27 82 987 6543"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full bg-[#141419] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Consultant Details (Applies to all orders - pickup or delivery) */}
          <div className="bg-[#0b0b0e] border border-[#2a2a35] rounded-xl p-4 space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#1f1f2a] pb-2">
              <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold uppercase">
                <User className="w-4 h-4 text-[#d4af37]" />
                <span>Sales Consultant (Staff Admin)</span>
              </div>

              {savedConsultants.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400">Select Registered:</span>
                  <select
                    value={selectedConsultantId}
                    onChange={(e) => handleSelectConsultant(e.target.value)}
                    className="bg-[#141419] border border-[#2a2a35] text-xs text-gold-gradient font-bold px-2.5 py-1 rounded-lg focus:outline-none"
                  >
                    <option value="">-- Enter Manually --</option>
                    {savedConsultants.map(sc => (
                      <option key={sc.id} value={sc.id}>{sc.name} ({sc.phone})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Sales Consultant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sipho Ndlovu or MerLiz Sales Team"
                  value={salesConsultantName}
                  onChange={(e) => {
                    setSalesConsultantName(e.target.value);
                    setSelectedConsultantId('');
                  }}
                  className="w-full bg-[#141419] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-lg text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-300 font-semibold mb-1 block">Sales Consultant Contact Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +27 663 758 904"
                  value={salesConsultantPhone}
                  onChange={(e) => setSalesConsultantPhone(e.target.value)}
                  className="w-full bg-[#141419] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-lg text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="saveAsConsultant"
                checked={saveAsNewConsultant}
                onChange={(e) => setSaveAsNewConsultant(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#d4af37] bg-[#141419] border-[#2a2a35] rounded"
              />
              <label htmlFor="saveAsConsultant" className="text-[11px] text-gray-400 cursor-pointer">
                Save as new Sales Consultant in store directory for future orders
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Payment Method & Date Term */}
        <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#22222d] pb-3">
            <h3 className="font-cinzel font-bold text-lg text-gray-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#d4af37]" />
              <span>2. Payment Method & Date Term</span>
            </h3>

            {disablePaymentMethodsForMonthly(clientPaymentType) && (
              <span className="bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>End-of-Month Client – Payment Pending</span>
              </span>
            )}
          </div>

          {/* Banner for Monthly Payers */}
          {disablePaymentMethodsForMonthly(clientPaymentType) ? (
            <div className="bg-[#181820] border border-[#d4af37]/40 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#d4af37] font-bold text-sm">
                <Clock className="w-4 h-4 shrink-0 text-[#d4af37]" />
                <span>Payment will be processed at month-end. No payment method required now.</span>
              </div>
              <p className="text-gray-300">
                Immediate payment selection and card machine reference input are disabled for End-of-Month Account clients.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-gray-400">
                <span>• Status: <strong className="text-amber-400">Pending</strong></span>
                <span>• Due Date: <strong className="text-[#d4af37]">{payDate || endOfMonthDueDate}</strong></span>
                <span>• 10% Late Fee applies if paid &gt;2 days after due date</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card_machine')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all ${
                  paymentMethod === 'card_machine'
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                    : 'bg-[#0b0b0e] border-[#2a2a35] text-gray-400 hover:text-gray-200'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Card Machine</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                    : 'bg-[#0b0b0e] border-[#2a2a35] text-gray-400 hover:text-gray-200'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Cash POS</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('eft')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all ${
                  paymentMethod === 'eft'
                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                    : 'bg-[#0b0b0e] border-[#2a2a35] text-gray-400 hover:text-gray-200'
                }`}
              >
                <Building2 className="w-5 h-5" />
                <span>EFT Transfer</span>
              </button>
            </div>
          )}

          {/* Card Machine Transaction Ref input (Only for Pay-on-Delivery with Card Machine) */}
          {!disablePaymentMethodsForMonthly(clientPaymentType) && paymentMethod === 'card_machine' && (
            <div className="bg-[#0b0b0e] border border-[#2a2a35] p-4 rounded-xl space-y-2">
              <label className="text-xs text-gold-gradient font-bold block">
                Card Machine Transaction Reference Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. POS-984210-AUTH"
                value={cardTransactionRef}
                onChange={(e) => setCardTransactionRef(e.target.value)}
                className="w-full bg-[#141419] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 px-3 py-2 rounded-lg text-sm focus:outline-none"
              />
              <p className="text-[11px] text-gray-400">
                Enter the approval or slip transaction reference from your point-of-sale card machine.
              </p>
            </div>
          )}

          {/* EFT Bank Details Display */}
          {!disablePaymentMethodsForMonthly(clientPaymentType) && paymentMethod === 'eft' && (
            <div className="bg-[#0b0b0e] border border-blue-500/40 p-3.5 rounded-xl space-y-1 text-xs">
              <p className="text-[#d4af37] font-bold uppercase text-[11px]">🏦 Bank Transfer Details for EFT:</p>
              <p className="text-gray-200"><strong>Bank Name:</strong> First National Bank (FNB)</p>
              <p className="text-gray-200"><strong>Account Number:</strong> 63040483652</p>
              <p className="text-gray-200"><strong>Branch Code:</strong> 250655</p>
              <p className="text-[10px] text-gray-400 italic mt-1">* Please use generated Invoice Number as reference upon transfer.</p>
            </div>
          )}

          {/* Pay Date Setting & Late Fee Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs text-gray-300 font-semibold mb-1 block">Invoice Pay Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 pl-10 pr-3 py-2 rounded-xl text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPayDate(todayStr)}
                className="text-xs text-[#d4af37] hover:underline"
              >
                Set Today ({todayStr})
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={() => {
                  // Test 3 days ago to trigger late payment fee automatically
                  const past = new Date();
                  past.setDate(past.getDate() - 3);
                  setPayDate(past.toISOString().split('T')[0]);
                }}
                className="text-xs text-amber-400 hover:underline"
              >
                Test Late Fee (-3 Days)
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Live Invoice Breakdown & Late Fee Calculation */}
        <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-6 space-y-4">
          <h3 className="font-cinzel font-bold text-lg text-gray-100 border-b border-[#22222d] pb-3">
            3. Invoice Summary & Automatic Rules
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Items Subtotal ({cart.reduce((a,b) => a + b.quantity, 0)} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {/* Late Fee Warning / Active Banner */}
            {breakdown.isLate ? (
              <div className="bg-amber-950/60 border border-amber-500/50 p-3 rounded-xl flex items-center justify-between text-amber-300 text-xs my-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold block">10% Late Payment Fee Applied</span>
                    <span className="text-[11px] text-amber-400/80">
                      Payment is past due date ({payDate}) + 2 days grace period.
                    </span>
                  </div>
                </div>
                <span className="font-extrabold text-sm text-amber-300">
                  +{formatCurrency(breakdown.latePaymentFee)}
                </span>
              </div>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl flex items-center gap-2 text-emerald-400 text-xs my-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  No late fee applied (Within set pay date + 2 days grace period).
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-[#22222d] pt-3 text-lg font-bold">
              <span className="text-gray-100">Total Invoice Amount</span>
              <span className="text-gold-gradient text-xl">{formatCurrency(breakdown.totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-gold-gradient text-[#0b0b0e] font-bold py-3.5 px-6 rounded-xl shadow-xl hover:brightness-110 active:scale-98 transition-all text-base mt-4"
          >
            <span>Issue Invoice & Generate Order</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </form>

    </div>
  );
};
