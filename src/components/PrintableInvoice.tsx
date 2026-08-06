/// <reference types="react" />
import React from 'react';
import { Invoice, PrintOptions } from '../types';
import { formatCurrency, COMPANY_DETAILS, getOrderProgressLabel } from '../utils/whatsapp';
import { MERLIZ_LOGO_BASE64 } from '../utils/logoBase64';
import { Truck, MapPin, User, Briefcase } from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: Invoice;
  options?: PrintOptions;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ invoice, options }) => {
  const isReceipt = options?.preset === 'receipt';
  const showLogo = options?.showLogo ?? true;
  const showDeliveryAddress = options?.showDeliveryAddress ?? true;
  const showDriverInfo = options?.showDriverInfo ?? true;
  const showSalesConsultant = options?.showSalesConsultant ?? true;
  const showRemark = options?.showRemark ?? true;
  const showPaymentLink = options?.showPaymentLink ?? true;
  const showBankDetails = options?.showBankDetails ?? true;
  const footerText = options?.customFooterText || "Thank you for choosing MerLiz Holdings (PTY) Ltd Point of Sale Service!";

  // Thermal Receipt Layout (80mm POS Slip)
  if (isReceipt) {
    return (
      <div className="print-container bg-white text-black p-4 max-w-[320px] mx-auto rounded-none border border-gray-300 shadow-sm font-mono text-[11px] leading-tight">
        {/* Receipt Header */}
        <div className="text-center pb-3 border-b border-dashed border-black mb-3 space-y-1">
          {showLogo && (
            <div className="mx-auto mb-2 flex items-center justify-center">
              <img 
                src={MERLIZ_LOGO_BASE64} 
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.svg'; }}
                alt="MerLiz Holdings Logo" 
                className="invoice-logo w-[120px] max-w-[140px] h-auto object-contain block mx-auto print:block" 
                style={{ width: '120px', height: 'auto', display: 'block', margin: '0 auto' }}
              />
            </div>
          )}
          <h1 className="font-bold text-sm tracking-wider uppercase">MerLiz Holdings (PTY) Ltd</h1>
          <p className="text-[10px] text-gray-700 font-sans">Taking you there</p>
          <p className="text-[10px] text-gray-600 font-sans">Reg: {COMPANY_DETAILS.regNumber}</p>
          <p className="text-[10px] text-gray-600 font-sans">Tel: {COMPANY_DETAILS.whatsappPhone}</p>
        </div>

        {/* Receipt Invoice Meta */}
        <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5">
          <div className="flex justify-between font-bold text-xs">
            <span>RECEIPT / INVOICE:</span>
            <span>#{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Date:</span>
            <span>{invoice.date}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Customer:</span>
            <span className="font-semibold">{invoice.customer.fullName}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Phone:</span>
            <span>{invoice.customer.phone}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Status:</span>
            <span className="uppercase font-bold">{invoice.status}</span>
          </div>
          {showSalesConsultant && invoice.salesConsultantName && (
            <div className="flex justify-between text-gray-700">
              <span>Sales Consultant:</span>
              <span className="font-semibold">{invoice.salesConsultantName} ({invoice.salesConsultantPhone || 'N/A'})</span>
            </div>
          )}
        </div>

        {/* Optional Delivery Address */}
        {showDeliveryAddress && (
          <div className="border-b border-dashed border-black pb-2 mb-2 space-y-0.5 text-[10px]">
            <span className="font-bold block uppercase">Fulfillment: {invoice.customer.deliveryOption === 'delivery' ? 'Home Delivery' : 'Self-Pickup'}</span>
            {invoice.customer.deliveryOption === 'delivery' ? (
              <>
                <p className="text-gray-800">Addr: {invoice.customer.address}</p>
                {showDriverInfo && invoice.driverName && (
                  <p className="text-gray-700">Driver: {invoice.driverName} ({invoice.driverPhone || 'N/A'})</p>
                )}
              </>
            ) : (
              <p className="text-gray-800">Pickup: {COMPANY_DETAILS.address}</p>
            )}
          </div>
        )}

        {/* Items Table */}
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between font-bold text-[10px] uppercase border-b border-black pb-1 mb-1">
            <span className="w-1/2">Item</span>
            <span className="w-1/4 text-center">Qty</span>
            <span className="w-1/4 text-right">Amt</span>
          </div>
          {invoice.items.map((item, i) => (
            <div key={i} className="flex justify-between py-0.5 text-[10px]">
              <span className="w-1/2 truncate font-semibold">{item.name}</span>
              <span className="w-1/4 text-center">{item.quantity}</span>
              <span className="w-1/4 text-right">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 text-right mb-3">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.isLatePayment && invoice.latePaymentFee > 0 && (
            <div className="flex justify-between text-red-700 font-bold">
              <span>Late Fee (10%):</span>
              <span>+{formatCurrency(invoice.latePaymentFee)}</span>
            </div>
          )}
          {invoice.adjustment !== undefined && invoice.adjustment !== 0 && (
            <div className="flex justify-between text-blue-800">
              <span>Adjustment:</span>
              <span>{invoice.adjustment > 0 ? '+' : ''}{formatCurrency(invoice.adjustment)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>

        {/* Remarks & Payment Link */}
        {showRemark && invoice.remark && (
          <div className="border-t border-dashed border-black pt-1 mb-2 text-[10px]">
            <span className="font-bold">NOTE:</span> {invoice.remark}
          </div>
        )}

        {showPaymentLink && invoice.paymentLink && (
          <div className="border-t border-dashed border-black pt-1 mb-2 text-[10px] break-all">
            <span className="font-bold">PAY LINK:</span> {invoice.paymentLink}
          </div>
        )}

        {/* Bank details */}
        {showBankDetails && (
          <div className="border-t border-dashed border-black pt-2 mb-2 text-[9px] text-center text-gray-700">
            <p className="font-bold uppercase">FNB EFT DETAILS</p>
            <p>Acc #: 63040483652 | Branch: 250655</p>
            <p>Ref: #{invoice.invoiceNumber}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-dashed border-black text-[10px] font-sans font-semibold">
          {footerText}
        </div>
      </div>
    );
  }

  // Standard A4 Layout
  return (
    <div className="print-container bg-white text-black p-8 max-w-3xl mx-auto rounded-none border border-gray-300 shadow-sm font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
        <div className="flex items-center gap-4">
          {showLogo && (
            <div className="w-[150px] shrink-0">
              <img 
                src={MERLIZ_LOGO_BASE64} 
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.svg'; }}
                alt="MerLiz Holdings Logo" 
                className="invoice-logo w-[150px] max-w-[180px] h-auto object-contain block print:block" 
                style={{ width: '150px', height: 'auto', display: 'block' }}
              />
            </div>
          )}
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-wider text-black">MerLiz Holdings (PTY) Ltd</h1>
            <p className="text-xs uppercase tracking-widest text-gray-800 font-bold">Taking you there • Point of Sale Service</p>
            <p className="text-[11px] text-gray-600">Reg #: {COMPANY_DETAILS.regNumber} | Email: {COMPANY_DETAILS.email}</p>
            <p className="text-[11px] text-gray-600">WhatsApp: {COMPANY_DETAILS.whatsappPhone} | Address: {COMPANY_DETAILS.address}</p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-xl font-bold text-black uppercase">TAX INVOICE</h2>
          <p className="text-sm font-bold text-gray-800">{invoice.invoiceNumber}</p>
          <p className="text-xs text-gray-600 mt-1">Date Issued: {invoice.date}</p>
          <p className="text-xs text-gray-600">Payment Term Date: {invoice.payDate}</p>
          <div className="flex flex-col items-end gap-1 mt-1.5">
            <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border ${
              invoice.status === 'paid' 
                ? 'border-green-600 text-green-800 bg-green-50' 
                : invoice.status === 'refunded'
                ? 'border-purple-600 text-purple-900 bg-purple-50'
                : invoice.status === 'draft'
                ? 'border-gray-500 text-gray-700 bg-gray-100'
                : 'border-amber-600 text-amber-800 bg-amber-50'
            }`}>
              Payment: {invoice.status}
            </span>
            {invoice.paymentConfirmedAt && (
              <span className="text-[9px] text-green-700 font-semibold">
                Confirmed: {new Date(invoice.paymentConfirmedAt).toLocaleDateString('en-ZA')}
              </span>
            )}
            <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border border-blue-600 text-blue-900 bg-blue-50">
              Progress: {getOrderProgressLabel(invoice.orderProgress)}
            </span>
          </div>
        </div>
      </div>

      {/* Customer & Sales Consultant / Delivery Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs text-gray-800">
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
          <h3 className="font-bold text-gray-900 uppercase text-xs mb-2 border-b border-gray-300 pb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-700" />
            <span>Customer Details:</span>
          </h3>
          <p className="font-bold text-sm text-black">{invoice.customer.fullName}</p>
          <p className="text-gray-700">Phone: {invoice.customer.phone}</p>
          <p className="mt-1">
            <span className="font-semibold">Fulfillment Type:</span>{' '}
            {invoice.customer.deliveryOption === 'delivery' ? 'Home / Doorstep Delivery' : 'Self-Pickup'}
          </p>
          {showSalesConsultant && invoice.salesConsultantName && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <span className="font-semibold flex items-center gap-1 text-gray-900">
                <Briefcase className="w-3 h-3 text-[#d4af37]" />
                Sales Consultant:
              </span>
              <p className="font-bold text-gray-900">{invoice.salesConsultantName}</p>
              {invoice.salesConsultantPhone && (
                <p className="text-gray-700">Contact: {invoice.salesConsultantPhone}</p>
              )}
            </div>
          )}
        </div>

        {showDeliveryAddress && (
          invoice.customer.deliveryOption === 'delivery' ? (
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg">
              <h3 className="font-bold text-gray-900 uppercase text-xs mb-2 border-b border-amber-300 pb-1 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-700" />
                <span>Delivery & Courier Details:</span>
              </h3>
              <p className="font-medium text-gray-900">
                <span className="font-semibold">Address:</span> {invoice.customer.address}
              </p>
              <p className="mt-1"><span className="font-semibold">Scheduled Date:</span> {invoice.deliveryDate || 'Upon confirmation'}</p>
              {showDriverInfo && (
                <>
                  <p><span className="font-semibold">Delivery Company:</span> {invoice.courierCompany || 'MerLiz Logistics'}</p>
                  <p><span className="font-semibold">Driver Name:</span> {invoice.driverName || 'Assigned Driver'}</p>
                  <p><span className="font-semibold">Driver Contact:</span> {invoice.driverPhone || 'Contact Store'}</p>
                </>
              )}
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-gray-900 uppercase text-xs mb-2 border-b border-gray-300 pb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-700" />
                <span>Self-Pickup Address:</span>
              </h3>
              <p className="font-bold text-gray-900">{COMPANY_DETAILS.name}</p>
              <p className="text-gray-700">{COMPANY_DETAILS.address}</p>
              <p className="mt-1"><span className="font-semibold">Payment Method:</span> {invoice.invoice.paymentMethod.replace('_', ' ').toUpperCase()}</p>
              {invoice.cardTransactionRef && (
                <p><span className="font-semibold">Card POS Ref:</span> {invoice.cardTransactionRef}</p>
              )}
            </div>
          )
        )}
      </div>

      {/* Itemized Table */}
      <table className="w-full text-left text-xs mb-6 border-collapse">
        <thead>
          <tr className="bg-gray-100 border-y border-gray-300 text-gray-800 font-bold uppercase">
            <th className="py-2.5 px-3">Item Description</th>
            <th className="py-2.5 px-3 text-center">Qty</th>
            <th className="py-2.5 px-3 text-right">Unit Price</th>
            <th className="py-2.5 px-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {invoice.items.map((item, i) => (
            <tr key={i}>
              <td className="py-2.5 px-3 font-semibold text-gray-900">{item.name}</td>
              <td className="py-2.5 px-3 text-center text-gray-700">{item.quantity}</td>
              <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(item.price)}</td>
              <td className="py-2.5 px-3 text-right font-bold text-black">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals & Late Fee Breakdown */}
      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-2 text-xs">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span className="font-semibold">{formatCurrency(invoice.subtotal)}</span>
          </div>

          {invoice.isLatePayment && invoice.latePaymentFee > 0 && (
            <div className="flex justify-between text-red-700 font-bold bg-red-50 p-2 rounded border border-red-200">
              <span>Late Fee (10% past pay date + 2 days):</span>
              <span>+{formatCurrency(invoice.latePaymentFee)}</span>
            </div>
          )}

          {invoice.adjustment !== undefined && invoice.adjustment !== 0 && (
            <div className="flex justify-between text-blue-900 font-semibold bg-blue-50 p-2 rounded border border-blue-200">
              <span>Adjustment Amount:</span>
              <span>{invoice.adjustment > 0 ? '+' : ''}{formatCurrency(invoice.adjustment)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-bold text-black border-t-2 border-black pt-2">
            <span>Total Amount Payable:</span>
            <span>{formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>
      </div>

      {showRemark && invoice.remark && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
          <p className="font-bold text-amber-900 uppercase text-[10px]">Remark / Admin Note:</p>
          <p className="text-gray-800 italic mt-0.5">{invoice.remark}</p>
        </div>
      )}

      {showPaymentLink && invoice.paymentLink && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
          <p className="font-bold text-blue-950 uppercase text-[10px]">Payment Link:</p>
          <p className="text-blue-700 underline font-mono break-all">{invoice.paymentLink}</p>
        </div>
      )}

      {/* EFT Payment Details & Terms */}
      <div className="border-t border-gray-300 pt-4 text-[10px] text-gray-600 space-y-1">
        {showBankDetails && (
          <>
            <p className="font-bold text-gray-800 uppercase">BANK TRANSFER DETAILS (EFT):</p>
            <p>Bank: First National Bank | Account #: 63040483652 | Branch Code: 250655 | Ref: {invoice.invoiceNumber}</p>
          </>
        )}
        <p className="text-[9px] text-gray-500 italic mt-2">
          * Store Policy: Payments made 2 days past the agreed pay date trigger an automatic 10% late payment fee.
        </p>
        <p className="text-center font-bold text-gray-900 text-xs mt-4">
          {footerText}
        </p>
      </div>
    </div>
  );
};
