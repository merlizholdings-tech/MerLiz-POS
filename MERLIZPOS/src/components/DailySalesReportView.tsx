import React, { useState, useMemo } from 'react';
import { generateDailySalesReport, DailySalesReport } from '../utils/dailySalesModule';
import { formatCurrency, COMPANY_DETAILS } from '../utils/whatsapp';
import { MERLIZ_LOGO_BASE64 } from '../utils/logoBase64';
import { 
  Calendar, 
  Crown, 
  Printer, 
  TrendingUp, 
  PackageCheck, 
  DollarSign, 
  FileSpreadsheet, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  ArrowUpRight, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Building2
} from 'lucide-react';

export const DailySalesReportView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Generate Report Data for Selected Date
  const report: DailySalesReport = useMemo(() => {
    return generateDailySalesReport(selectedDate);
  }, [selectedDate]);

  // Filtered sales data based on search term
  const filteredSalesData = useMemo(() => {
    if (!searchTerm.trim()) return report.sales_data;
    const term = searchTerm.toLowerCase();
    return report.sales_data.filter(item => 
      item.product_name.toLowerCase().includes(term) ||
      (item.consultant_name && item.consultant_name.toLowerCase().includes(term))
    );
  }, [report.sales_data, searchTerm]);

  // Navigate dates
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Open Clean Printable Window with MerLiz Branding
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    const formattedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const itemsRows = report.sales_data.map((item, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px; text-align: center; font-weight: bold; color: #6b7280;">${idx + 1}</td>
        <td style="padding: 10px; font-weight: bold; color: #111827;">${item.product_name}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold; color: #111827;">${item.quantity_sold}</td>
        <td style="padding: 10px; text-align: right; color: #374151;">${formatCurrency(item.selling_price)}</td>
        <td style="padding: 10px; text-align: right; color: #6b7280;">${formatCurrency(item.cost_price)}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; color: #047857;">${formatCurrency(item.total_revenue)}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; color: #b45309;">${formatCurrency(item.total_profit)}</td>
      </tr>
    `).join('');

    const bestSellerHTML = report.best_seller ? `
      <div style="background-color: #fffbe3; border: 2px solid #d4af37; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #854d0e; letter-spacing: 1px; margin-bottom: 4px;">
            🏆 BEST SELLER OF THE DAY
          </div>
          <div style="font-size: 18px; font-weight: 800; color: #111827;">
            ${report.best_seller.product_name}
          </div>
          <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">
            Sold <strong style="color: #111827;">${report.best_seller.quantity_sold} units</strong> | Total Profit: <strong style="color: #b45309;">${formatCurrency(report.best_seller.total_profit)}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; color: #6b7280;">Total Revenue Generated</div>
          <div style="font-size: 20px; font-weight: 900; color: #047857;">${formatCurrency(report.best_seller.total_revenue)}</div>
        </div>
      </div>
    ` : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Sales Report - ${selectedDate} - MerLiz Holdings</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              color: #111827;
              margin: 0;
              padding: 24px;
              background-color: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #d4af37;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .company-name {
              font-size: 20px;
              font-weight: 800;
              color: #111827;
            }
            .company-sub {
              font-size: 12px;
              color: #6b7280;
            }
            .report-title {
              text-align: right;
            }
            .report-title h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 800;
              color: #d4af37;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              margin-bottom: 24px;
            }
            .metric-card {
              background-color: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
            }
            .metric-val {
              font-size: 18px;
              font-weight: 800;
              color: #111827;
            }
            .metric-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              margin-top: 4px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
              margin-top: 16px;
            }
            th {
              background-color: #111827;
              color: #ffffff;
              padding: 10px;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            .footer {
              margin-top: 36px;
              border-top: 1px solid #e5e7eb;
              padding-top: 16px;
              font-size: 11px;
              color: #6b7280;
              display: flex;
              justify-content: space-between;
            }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${MERLIZ_LOGO_BASE64}" style="height: 50px; width: auto;" alt="MerLiz Logo" />
              <div>
                <div class="company-name">${COMPANY_DETAILS.name}</div>
                <div class="company-sub">Reg: ${COMPANY_DETAILS.regNumber} | WhatsApp: ${COMPANY_DETAILS.whatsappPhone}</div>
                <div class="company-sub">${COMPANY_DETAILS.address}</div>
              </div>
            </div>
            <div class="report-title">
              <h1>DAILY SALES REPORT</h1>
              <div style="font-size: 13px; font-weight: bold; color: #374151; margin-top: 4px;">${formattedDate}</div>
              <div style="font-size: 11px; color: #6b7280;">Generated at: ${new Date().toLocaleTimeString()}</div>
            </div>
          </div>

          ${bestSellerHTML}

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-val" style="color: #047857;">${formatCurrency(report.totals.total_revenue)}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-val" style="color: #b45309;">${formatCurrency(report.totals.total_profit)}</div>
              <div class="metric-label">Total Profit</div>
            </div>
            <div class="metric-card">
              <div class="metric-val" style="color: #1d4ed8;">${report.totals.total_items_sold}</div>
              <div class="metric-label">Units Sold</div>
            </div>
            <div class="metric-card">
              <div class="metric-val" style="color: #6b21a8;">${report.totals.total_invoices_count}</div>
              <div class="metric-label">Qualifying Invoices</div>
            </div>
          </div>

          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #111827; padding-bottom: 6px; margin-bottom: 0;">
            Itemized Product Sales Summary
          </h3>

          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="text-align: left;">Product Name</th>
                <th style="text-align: center;">Qty Sold</th>
                <th style="text-align: right;">Selling Price</th>
                <th style="text-align: right;">Cost Price</th>
                <th style="text-align: right;">Total Revenue</th>
                <th style="text-align: right;">Total Profit</th>
              </tr>
            </thead>
            <tbody>
              ${report.sales_data.length > 0 ? itemsRows : `
                <tr>
                  <td colSpan="7" style="padding: 24px; text-align: center; color: #6b7280;">No qualifying sales recorded for this date.</td>
                </tr>
              `}
            </tbody>
          </table>

          <div class="footer">
            <div>Verified against local invoices, inventory movements & sales commissions.</div>
            <div>MerLiz Holdings (PTY)Ltd - Confidentially Generated</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Top Header & Date Navigation Bar */}
      <div className="bg-[#12131a] border border-[#2a2a35] p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#d4af37] text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>MerLiz Holdings Daily Sales Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Daily Sales Report</span>
            <span className="text-xs bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] px-2.5 py-0.5 rounded-full font-bold">
              Synced with Invoices
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time daily aggregates for products sold, revenue, profit margins, and best-selling item.
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0b0b0e] p-2 rounded-xl border border-[#2a2a35]">
          <button
            onClick={handlePrevDay}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1f202b] rounded-lg transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-[#d4af37]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 text-gray-400 hover:text-white hover:bg-[#1f202b] rounded-lg transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 border border-[#d4af37]/50 text-[#d4af37] text-xs font-bold rounded-lg transition-all active:scale-95 cursor-pointer ml-1"
          >
            Today
          </button>

          <button
            onClick={handlePrintReport}
            className="px-4 py-1.5 bg-gold-gradient text-black text-xs font-extrabold rounded-lg shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 ml-2"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Best-Selling Item Highlight Card (Gold MerLiz Theme) */}
      {report.best_seller ? (
        <div className="bg-[#181610] border-2 border-[#d4af37] p-5 sm:p-6 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/20 border-2 border-[#d4af37] flex items-center justify-center text-[#d4af37] shrink-0 shadow-lg mt-0.5">
              <Crown className="w-8 h-8 animate-bounce-slow" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37] text-black font-extrabold text-[11px] uppercase tracking-wider mb-2 shadow">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Best Seller of the Day</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {report.best_seller.product_name}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 mt-2">
                <span>
                  Quantity Sold: <strong className="text-white text-sm font-bold">{report.best_seller.quantity_sold} units</strong>
                </span>
                <span className="text-gray-500">•</span>
                <span>
                  Avg Selling Price: <strong className="text-white font-bold">{formatCurrency(report.best_seller.selling_price)}</strong>
                </span>
                <span className="text-gray-500">•</span>
                <span>
                  Unit Cost: <strong className="text-gray-400 font-semibold">{formatCurrency(report.best_seller.cost_price)}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#d4af37]/30 pt-4 md:pt-0 md:pl-6 shrink-0 justify-between md:justify-end">
            <div>
              <div className="text-[11px] text-gray-400 font-semibold uppercase">Total Revenue</div>
              <div className="text-2xl font-extrabold text-emerald-400">
                {formatCurrency(report.best_seller.total_revenue)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-[#d4af37] font-semibold uppercase">Total Profit</div>
              <div className="text-2xl font-extrabold text-[#d4af37]">
                {formatCurrency(report.best_seller.total_profit)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#181610]/60 border border-[#d4af37]/40 p-5 rounded-2xl text-center">
          <Info className="w-8 h-8 text-[#d4af37] mx-auto mb-2 opacity-60" />
          <h3 className="text-sm font-bold text-gray-300">No Sales Recorded for {selectedDate}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Only invoices marked as <span className="text-[#d4af37] font-semibold">Paid</span> or <span className="text-emerald-400 font-semibold">Completed</span> are included in daily reports.
          </p>
        </div>
      )}

      {/* Summary Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#12131a] border border-[#2a2a35] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {formatCurrency(report.totals.total_revenue)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            From {report.totals.total_invoices_count} qualifying invoices
          </p>
        </div>

        <div className="bg-[#12131a] border border-[#2a2a35] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Profit</span>
            <div className="w-8 h-8 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#d4af37]">
            {formatCurrency(report.totals.total_profit)}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Consultant Commission Pool: {formatCurrency(Math.round(report.totals.total_profit * 0.4))} (40%)
          </p>
        </div>

        <div className="bg-[#12131a] border border-[#2a2a35] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Units Sold</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-400">
            {report.totals.total_items_sold} <span className="text-xs font-normal text-gray-400">items</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Across {report.sales_data.length} distinct products
          </p>
        </div>

        <div className="bg-[#12131a] border border-[#2a2a35] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Qualifying Orders</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-400">
            {report.totals.total_invoices_count} <span className="text-xs font-normal text-gray-400">invoices</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Paid: {report.totals.paid_invoices_count} | Completed: {report.totals.completed_invoices_count}
          </p>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#12131a] border border-[#2a2a35] rounded-2xl shadow-xl overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-[#2a2a35] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Daily Products Breakdown</h3>
              <p className="text-xs text-gray-400">
                Itemized view of quantities sold, prices, revenues, and profits for {selectedDate}
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product or consultant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#181924] text-gray-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 font-bold text-center w-12">#</th>
                <th className="py-3 px-4 font-bold">Product Name</th>
                <th className="py-3 px-4 font-bold text-center">Qty Sold</th>
                <th className="py-3 px-4 font-bold text-right">Selling Price</th>
                <th className="py-3 px-4 font-bold text-right">Cost Price</th>
                <th className="py-3 px-4 font-bold text-right">Total Revenue</th>
                <th className="py-3 px-4 font-bold text-right">Total Profit</th>
                <th className="py-3 px-4 font-bold text-center">Consultant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a35]/60">
              {filteredSalesData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <p className="text-sm font-semibold">No product sales match your filter for this date.</p>
                    <p className="text-xs mt-1">Try selecting a different date or clearing the search query.</p>
                  </td>
                </tr>
              ) : (
                filteredSalesData.map((item, idx) => {
                  const isBest = report.best_seller && report.best_seller.product_id === item.product_id;
                  return (
                    <tr 
                      key={item.product_id}
                      className={`hover:bg-[#181926] transition-colors ${
                        isBest ? 'bg-[#181610]/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center font-mono text-gray-500 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span>{item.product_name}</span>
                        {isBest && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d4af37] text-black font-extrabold text-[9px] uppercase tracking-wider">
                            <Crown className="w-3 h-3" /> Best Seller
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-white text-sm">
                        {item.quantity_sold}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-300">
                        {formatCurrency(item.selling_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-gray-500">
                        {formatCurrency(item.cost_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {formatCurrency(item.total_revenue)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#d4af37]">
                        {formatCurrency(item.total_profit)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-400 text-[11px]">
                        {item.consultant_name || 'Direct Sale'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredSalesData.length > 0 && (
              <tfoot className="bg-[#181924] font-bold text-white border-t border-[#2a2a35]">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 uppercase text-[11px] text-[#d4af37]">
                    Total Daily Summary
                  </td>
                  <td className="py-3.5 px-4 text-center text-blue-400 text-sm">
                    {report.totals.total_items_sold}
                  </td>
                  <td colSpan={2} className="py-3.5 px-4 text-right text-xs text-gray-400">
                    Averages Applied
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 text-sm">
                    {formatCurrency(report.totals.total_revenue)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-[#d4af37] text-sm">
                    {formatCurrency(report.totals.total_profit)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Integration Sync Footer Banner */}
      <div className="bg-[#12131a] border border-[#2a2a35] p-4 rounded-xl flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
          <span>
            Daily sales figures are synchronized in real-time with inventory stock movements, customer invoices, and sales consultant commissions.
          </span>
        </div>
        <div className="text-[11px] font-mono text-gray-500 hidden sm:block">
          MerLiz PWA Sales Engine v2.4
        </div>
      </div>

    </div>
  );
};
