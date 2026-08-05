import React, { useState, useEffect } from 'react';
import { Invoice, SalesConsultant, Product } from '../types';
import { formatCurrency } from '../utils/whatsapp';
import { 
  getInvoices, 
  getSalesConsultants, 
  saveSalesConsultants, 
  addSalesConsultant,
  getProducts 
} from '../utils/storage';
import { 
  getConsultantCommissionSummary, 
  releaseCommissionOnPayment,
  calculateProfit,
  calculateCommission,
  generateMonthlyStatement,
  exportStatementAsJSON,
  generateWhatsAppStatementMessage,
  MonthlyStatement,
  MONTH_NAMES
} from '../utils/commissionModule';
import { markInvoicePaid } from '../utils/paymentModule';
import { Logo } from './Logo';
import { MERLIZ_LOGO_BASE64 } from '../utils/logoBase64';
import { 
  TrendingUp, 
  Award, 
  Lock, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Search, 
  Filter, 
  DollarSign, 
  Briefcase, 
  ChevronRight, 
  Sparkles, 
  Plus, 
  X, 
  Phone, 
  FileText,
  Calendar,
  Check,
  Building2,
  RefreshCw,
  Printer,
  Download,
  Share2,
  FileJson,
  MessageSquare,
  Copy,
  ExternalLink
} from 'lucide-react';

interface CommissionDashboardProps {
  onSelectInvoice?: (invoice: Invoice) => void;
}

export const CommissionDashboard: React.FC<CommissionDashboardProps> = ({ onSelectInvoice }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'monthly_statement'>('overview');

  const [consultants, setConsultants] = useState<SalesConsultant[]>([]);
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'late' | 'monthly_payers'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Monthly Statement State
  const currentDate = new Date();
  const [selectedStatementMonth, setSelectedStatementMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedStatementYear, setSelectedStatementYear] = useState<number>(currentDate.getFullYear());
  const [activeStatement, setActiveStatement] = useState<MonthlyStatement | null>(null);

  // JSON Export Modal State
  const [isExportJsonModalOpen, setIsExportJsonModalOpen] = useState(false);
  const [jsonExportText, setJsonExportText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Add Sales Consultant Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newConsultantName, setNewConsultantName] = useState('');
  const [newConsultantPhone, setNewConsultantPhone] = useState('');
  const [newConsultantEmail, setNewConsultantEmail] = useState('');

  // Success toast state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const scs = getSalesConsultants();
    setConsultants(scs);
  }, [refreshKey]);

  // Automatically keep active statement in sync when month, year, or consultant changes
  useEffect(() => {
    const stmt = generateMonthlyStatement(selectedConsultant, selectedStatementMonth, selectedStatementYear);
    setActiveStatement(stmt);
  }, [selectedConsultant, selectedStatementMonth, selectedStatementYear, refreshKey]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Get commission metrics using required functions
  const summary = getConsultantCommissionSummary(selectedConsultant, {
    status: statusFilter,
    searchQuery
  });

  const allProducts = getProducts();

  const consultantLeaderboard = consultants.map(sc => {
    const scSummary = getConsultantCommissionSummary(sc.name);
    return {
      consultant: sc,
      totalProfit: scSummary.totalProfit,
      releasedComm: scSummary.totalCommissionReleased,
      pendingComm: scSummary.totalCommissionPending,
      totalComm: scSummary.totalCommissionAll,
      invoiceCount: scSummary.invoicesCount
    };
  }).sort((a, b) => b.totalProfit - a.totalProfit);

  const handleReleasePayment = (invoiceId: string) => {
    const updated = releaseCommissionOnPayment(invoiceId);
    if (updated) {
      showToast(`Payment confirmed for ${updated.invoiceNumber}! Commission of ${formatCurrency(updated.commissionAmount || 0)} released.`);
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleAddConsultantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsultantName.trim() || !newConsultantPhone.trim()) {
      alert('Please enter consultant name and phone number.');
      return;
    }
    const created = addSalesConsultant(newConsultantName, newConsultantPhone, newConsultantEmail);
    showToast(`Sales consultant ${created.name} added successfully.`);
    setNewConsultantName('');
    setNewConsultantPhone('');
    setNewConsultantEmail('');
    setIsAddModalOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  // Monthly Statement Action Handlers
  const handleGenerateStatement = () => {
    const stmt = generateMonthlyStatement(selectedConsultant, selectedStatementMonth, selectedStatementYear);
    setActiveStatement(stmt);
    showToast(`Generated monthly statement for ${stmt.consultantName} (${stmt.monthName} ${stmt.year}).`);
  };

  const handleExportJSON = () => {
    const stmt = activeStatement || generateMonthlyStatement(selectedConsultant, selectedStatementMonth, selectedStatementYear);
    const jsonStr = exportStatementAsJSON(stmt);
    setJsonExportText(jsonStr);
    setIsExportJsonModalOpen(true);
    setActiveStatement(prev => prev ? { ...prev, status: 'Exported' } : null);
    showToast(`Monthly statement exported as JSON.`);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonExportText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonExportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeStatement?.statementId || 'statement'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded statement JSON file.');
  };

  const handleSendWhatsApp = () => {
    const stmt = activeStatement || generateMonthlyStatement(selectedConsultant, selectedStatementMonth, selectedStatementYear);
    const msg = generateWhatsAppStatementMessage(stmt);
    const encoded = encodeURIComponent(msg);
    
    // Check if consultant has phone number
    let phoneParam = '';
    if (selectedConsultant !== 'all') {
      const foundSc = consultants.find(c => c.name === selectedConsultant || c.id === selectedConsultant);
      if (foundSc?.phone) {
        const cleanPhone = foundSc.phone.replace(/[^0-9]/g, '');
        phoneParam = `phone=${cleanPhone}&`;
      }
    }

    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${encoded}`, '_blank');
  };

  const handlePrintStatement = (stmtToPrint?: MonthlyStatement) => {
    const stmt = stmtToPrint || activeStatement || generateMonthlyStatement(selectedConsultant, selectedStatementMonth, selectedStatementYear);
    if (!stmt) {
      alert('No statement data available to print. Please select a sales consultant.');
      return;
    }

    // Always ensure statement state is set and view is updated
    setActiveStatement(stmt);
    setActiveSubTab('monthly_statement');

    let printOpenedSuccessfully = false;

    try {
      const printWin = window.open('', '_blank', 'width=900,height=1100');
      if (printWin && !printWin.closed) {
        const rowsHtml = stmt.invoices.length === 0
          ? `<tr><td colspan="6" style="text-align:center; padding:20px; color:#666;">No paid invoices recorded for this payout period.</td></tr>`
          : stmt.invoices.map((inv, i) => `
              <tr style="border-bottom: 1px solid #e2e8f0; ${i % 2 === 1 ? 'background-color:#f8fafc;' : ''}">
                <td style="padding: 10px; font-weight: bold; color: #1e293b;">${inv.invoiceNumber}</td>
                <td style="padding: 10px; color: #334155;">${inv.clientName}</td>
                <td style="padding: 10px; color: #475569;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${inv.paymentType}</span></td>
                <td style="padding: 10px; color: #475569;">${inv.paymentDate}</td>
                <td style="padding: 10px; text-align: right; color: #334155;">R ${inv.profitAmount.toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: #047857;">R ${inv.commissionAmount.toFixed(2)}</td>
              </tr>
            `).join('');

        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Commission Statement - ${stmt.consultantName} - ${stmt.monthName} ${stmt.year}</title>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 12mm;
                }
                * { box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  color: #0f172a;
                  background: #fff;
                  margin: 0;
                  padding: 20px;
                  font-size: 12px;
                  line-height: 1.5;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 2px solid #b45309;
                  padding-bottom: 16px;
                  margin-bottom: 20px;
                }
                .company-brand {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                }
                .company-logo {
                  height: 48px;
                  width: auto;
                }
                .company-title {
                  font-size: 20px;
                  font-weight: 800;
                  color: #78350f;
                  letter-spacing: 0.5px;
                }
                .company-tagline {
                  font-size: 10px;
                  color: #b45309;
                  font-weight: 600;
                  text-transform: uppercase;
                }
                .doc-title {
                  text-align: right;
                }
                .badge {
                  background: #fef3c7;
                  color: #92400e;
                  border: 1px solid #f59e0b;
                  padding: 4px 10px;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 800;
                  text-transform: uppercase;
                  display: inline-block;
                }
                .meta-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 12px;
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  padding: 14px;
                  border-radius: 8px;
                  margin-bottom: 20px;
                }
                .meta-label {
                  font-size: 10px;
                  text-transform: uppercase;
                  color: #64748b;
                  font-weight: 700;
                  display: block;
                  margin-bottom: 2px;
                }
                .meta-value {
                  font-size: 13px;
                  font-weight: 700;
                  color: #0f172a;
                }
                .kpi-container {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 10px;
                  margin-bottom: 24px;
                }
                .kpi-card {
                  border: 1px solid #cbd5e1;
                  padding: 12px;
                  border-radius: 8px;
                  background: #ffffff;
                }
                .kpi-card.highlight {
                  background: #ecfdf5;
                  border-color: #10b981;
                }
                .kpi-title {
                  font-size: 10px;
                  text-transform: uppercase;
                  font-weight: 700;
                  color: #475569;
                }
                .kpi-card.highlight .kpi-title {
                  color: #047857;
                }
                .kpi-num {
                  font-size: 16px;
                  font-weight: 800;
                  color: #0f172a;
                  margin-top: 4px;
                }
                .kpi-card.highlight .kpi-num {
                  color: #047857;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-bottom: 24px;
                }
                th {
                  background: #0f172a;
                  color: #ffffff;
                  text-align: left;
                  padding: 10px;
                  font-size: 11px;
                  text-transform: uppercase;
                  font-weight: 700;
                }
                th.right { text-align: right; }
                .footer {
                  border-top: 1px solid #e2e8f0;
                  padding-top: 16px;
                  display: flex;
                  justify-content: space-between;
                  font-size: 10px;
                  color: #64748b;
                }
                @media print {
                  body { padding: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="company-brand">
                  ${MERLIZ_LOGO_BASE64 ? `<img src="${MERLIZ_LOGO_BASE64}" class="company-logo" alt="MerLiz Logo" />` : ''}
                  <div>
                    <div class="company-title">MERLIZ HOLDINGS (PTY) LTD</div>
                    <div class="company-tagline">Taking You There • POS & Commercial Solutions</div>
                  </div>
                </div>
                <div class="doc-title">
                  <span class="badge">Official Commission Statement</span>
                  <div style="font-size: 11px; font-family: monospace; margin-top: 4px; color: #475569;">${stmt.statementId}</div>
                </div>
              </div>

              <div class="meta-grid">
                <div>
                  <span class="meta-label">Sales Consultant</span>
                  <div class="meta-value">${stmt.consultantName}</div>
                  <div style="font-size: 11px; color: #64748b;">ID: ${stmt.consultantId}</div>
                </div>
                <div>
                  <span class="meta-label">Payout Period</span>
                  <div class="meta-value">${stmt.monthName} ${stmt.year}</div>
                  <div style="font-size: 11px; color: #64748b;">Month #${stmt.month} Payout Cycle</div>
                </div>
                <div>
                  <span class="meta-label">Statement Status & Date</span>
                  <div class="meta-value" style="color: #047857;">RELEASED</div>
                  <div style="font-size: 11px; color: #64748b;">Issued: ${new Date(stmt.generatedAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div class="kpi-container">
                <div class="kpi-card">
                  <div class="kpi-title">Invoices Paid</div>
                  <div class="kpi-num">${stmt.totals.totalInvoicesPaid}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-title">Sales Revenue</div>
                  <div class="kpi-num">R ${stmt.totals.totalInvoiceAmountPaid.toFixed(2)}</div>
                </div>
                <div class="kpi-card">
                  <div class="kpi-title">Profit Generated</div>
                  <div class="kpi-num">R ${stmt.totals.totalProfitGenerated.toFixed(2)}</div>
                </div>
                <div class="kpi-card highlight">
                  <div class="kpi-title">Commission Released (40%)</div>
                  <div class="kpi-num">R ${stmt.totals.totalCommissionReleased.toFixed(2)}</div>
                </div>
              </div>

              <h3 style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1e293b; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                Settled Invoices Breakdown (${stmt.invoices.length})
              </h3>

              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client Name</th>
                    <th>Payment Terms</th>
                    <th>Date Paid</th>
                    <th class="right">Profit Amount</th>
                    <th class="right">Commission (40%)</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>

              <div style="margin-top: 30px; background: #fffbebf0; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; font-size: 11px; color: #78350f;">
                <strong>Note:</strong> Commissions are calculated at exactly 40% of net profit on fully paid settled invoices. Pending or uncollected accounts are excluded until payment confirmation is recorded.
              </div>

              <div class="footer" style="margin-top: 40px;">
                <div>
                  <strong>MerLiz Holdings (Pty) Ltd</strong> • Official Financial Records<br>
                  Email: merlizholdings@gmail.com
                </div>
                <div style="text-align: right;">
                  Printed on: ${new Date().toLocaleString()}<br>
                  Authorized Signature / System Generated
                </div>
              </div>

              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                };
              </script>
            </body>
          </html>
        `;

        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();
        printOpenedSuccessfully = true;
      }
    } catch (err) {
      console.warn('Could not open print window pop-up:', err);
    }

    if (!printOpenedSuccessfully) {
      showToast(`Preparing print dialog for ${stmt.consultantName}...`);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/50 animate-fade-in print:hidden">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Header Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a2a35] pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-[#d4af37]" />
            <h2 className="font-cinzel text-2xl font-bold text-gold-gradient">
              Sales Consultant Commission & Payout Module
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            40% product profit margins, locked monthly terms, and official payout statements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-gold-gradient text-[#0b0b0e] px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:brightness-110 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Consultant</span>
          </button>
        </div>
      </div>

      {/* View Selector Tabs (Overview vs Monthly Payout Statement) */}
      <div className="flex items-center gap-2 border-b border-[#2a2a35] pb-2 print:hidden">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'overview'
              ? 'bg-[#d4af37] text-black shadow-md'
              : 'bg-[#141419] text-gray-400 hover:text-white border border-[#2d2d3a]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Commission Dashboard & Invoices</span>
        </button>

        <button
          onClick={() => setActiveSubTab('monthly_statement')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'monthly_statement'
              ? 'bg-[#d4af37] text-black shadow-md'
              : 'bg-[#141419] text-gray-400 hover:text-white border border-[#2d2d3a]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Monthly Payout Statement</span>
          <span className="bg-amber-900/60 text-amber-200 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 font-mono">
            Official
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMMISSION OVERVIEW DASHBOARD */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Commission Rules Info Banner */}
          <div className="bg-gradient-to-r from-[#14141d] to-[#0d0d12] border border-[#d4af37]/30 p-4 rounded-2xl shadow-md space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[#d4af37] font-bold text-sm">
              <Sparkles className="w-4 h-4 shrink-0 text-[#d4af37]" />
              <span>MerLiz Sales Commission Terms & Calculation Formula</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-gray-300 pt-1">
              <div className="bg-[#0b0b0e]/80 p-2.5 rounded-xl border border-[#262635]">
                <span className="font-bold text-emerald-400 block mb-0.5">1. Profit Based Earnings</span>
                Consultants earn <strong className="text-gold-gradient">40% of the net profit</strong> calculated as <code className="text-gray-200 bg-black/40 px-1 py-0.5 rounded">(Selling Price - Cost Price) × Qty</code>.
              </div>
              <div className="bg-[#0b0b0e]/80 p-2.5 rounded-xl border border-[#262635]">
                <span className="font-bold text-amber-400 block mb-0.5">2. Locked Until Settlement</span>
                For Monthly Payers (EOM accounts) & Pending orders, commissions remain <strong className="text-amber-400">Locked / Pending</strong> until full payment is confirmed.
              </div>
              <div className="bg-[#0b0b0e]/80 p-2.5 rounded-xl border border-[#262635]">
                <span className="font-bold text-cyan-400 block mb-0.5">3. Exclusion of Fees</span>
                Late payment penalties (10%) or extra service delivery fees are excluded from consultant profit calculations.
              </div>
            </div>
          </div>

          {/* Select Consultant & Filter Bar */}
          <div className="bg-[#141419] border border-[#2d2d3a] p-4 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Consultant Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Sales Consultant</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={selectedConsultant}
                    onChange={(e) => setSelectedConsultant(e.target.value)}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gold-gradient font-bold pl-10 pr-3 py-2 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="all">🌟 All Sales Consultants</option>
                    {consultants.map(c => (
                      <option key={c.id} value={c.name}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filters */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Invoice & Commission Filter</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-200 font-medium pl-10 pr-3 py-2 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="all">All Invoices & Payments</option>
                    <option value="paid">✅ Paid (Released Commission)</option>
                    <option value="unpaid">⏳ Unpaid (Locked Commission)</option>
                    <option value="late">⚠️ Late / Overdue Invoices</option>
                    <option value="monthly_payers">📅 Monthly Payers (EOM)</option>
                  </select>
                </div>
              </div>

              {/* Search Query */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Search Invoices / Clients</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search invoice #, client name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 pl-10 pr-3 py-2 rounded-xl text-xs focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Profit Card */}
            <div className="bg-[#141419] border border-[#2d2d3a] p-5 rounded-2xl relative overflow-hidden group hover:border-[#d4af37]/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Product Profit</span>
                <div className="p-2 rounded-xl bg-blue-950/50 border border-blue-500/30 text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-gray-100">
                {formatCurrency(summary.totalProfit)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <span>Generated across {summary.invoicesCount} invoice(s)</span>
              </div>
            </div>

            {/* Total Released Commission Card */}
            <div className="bg-[#141419] border border-emerald-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/60 transition-all bg-gradient-to-br from-[#141419] to-emerald-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Released Commission</span>
                </span>
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">
                {formatCurrency(summary.totalCommissionReleased)}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1">
                40% of profit on {summary.paidInvoicesCount} settled invoice(s)
              </div>
            </div>

            {/* Total Pending Commission Card */}
            <div className="bg-[#141419] border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-amber-500/60 transition-all bg-gradient-to-br from-[#141419] to-amber-950/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pending / Locked</span>
                </span>
                <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {formatCurrency(summary.totalCommissionPending)}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">
                Locked on {summary.pendingInvoicesCount} pending / EOM invoice(s)
              </div>
            </div>

            {/* Total Combined Commission Card */}
            <div className="bg-[#141419] border border-[#2d2d3a] p-5 rounded-2xl relative overflow-hidden group hover:border-[#d4af37]/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#d4af37] font-semibold uppercase tracking-wider">Total Commission</span>
                <div className="p-2 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-gold-gradient">
                {formatCurrency(summary.totalCommissionAll)}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                {summary.monthlyPayersCount} EOM account(s) | {summary.lateInvoicesCount} late
              </div>
            </div>

          </div>

          {/* Main Content Split: Leaderboard & Linked Invoices List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales Consultant Leaderboard (1 Column) */}
            <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-4 h-fit">
              <div className="flex items-center justify-between border-b border-[#22222d] pb-3">
                <h3 className="font-cinzel font-bold text-gray-100 flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-[#d4af37]" />
                  <span>Consultant Directory & Ranks</span>
                </h3>
                <span className="text-[11px] text-gray-400">{consultants.length} Active</span>
              </div>

              <div className="space-y-3">
                {consultantLeaderboard.map((item, idx) => {
                  const isSelected = selectedConsultant === item.consultant.name;
                  return (
                    <div
                      key={item.consultant.id}
                      onClick={() => setSelectedConsultant(isSelected ? 'all' : item.consultant.name)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#d4af37]/10 border-[#d4af37] shadow-lg'
                          : 'bg-[#0b0b0e] border-[#22222d] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                            idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-gray-300 text-black' : 'bg-amber-900/50 text-amber-200'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-gray-200">{item.consultant.name}</h4>
                            <p className="text-[10px] text-gray-400">{item.consultant.phone}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-extrabold text-gold-gradient block">
                            {formatCurrency(item.releasedComm)}
                          </span>
                          <span className="text-[10px] text-amber-400">
                            {formatCurrency(item.pendingComm)} pending
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#22222d] print:hidden">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {item.invoiceCount} invoice(s)
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConsultant(item.consultant.name);
                            const stmt = generateMonthlyStatement(item.consultant.name, selectedStatementMonth, selectedStatementYear);
                            handlePrintStatement(stmt);
                          }}
                          className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 hover:text-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                          title={`Print monthly statement for ${item.consultant.name}`}
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Statement</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linked Invoices Table (2 Columns) */}
            <div className="lg:col-span-2 bg-[#141419] border border-[#2d2d3a] rounded-2xl p-5 space-y-4">
              
              <div className="flex items-center justify-between border-b border-[#22222d] pb-3">
                <h3 className="font-cinzel font-bold text-gray-100 flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-[#d4af37]" />
                  <span>Consultant Sales Invoices ({summary.invoices.length})</span>
                </h3>

                {selectedConsultant !== 'all' && (
                  <button
                    onClick={() => setSelectedConsultant('all')}
                    className="text-xs text-[#d4af37] hover:underline flex items-center gap-1"
                  >
                    <span>Reset Consultant Filter</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {summary.invoices.length === 0 ? (
                <div className="p-8 text-center bg-[#0b0b0e] rounded-xl border border-[#22222d] text-gray-400 text-xs">
                  No invoices match the selected consultant or status filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#2a2a35] text-gray-400 font-semibold uppercase tracking-wider text-[10px] bg-[#0b0b0e]">
                        <th className="p-3">Invoice # / Date</th>
                        <th className="p-3">Client & Terms</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Profit</th>
                        <th className="p-3 text-right">Commission (40%)</th>
                        <th className="p-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f2a]">
                      {summary.invoices.map((inv) => {
                        const isPaid = inv.status === 'paid';
                        const isEOM = inv.clientPaymentType === 'end_of_month' || inv.customer?.paymentType === 'end_of_month';
                        const profit = inv.profitAmount || calculateProfit(inv.items, allProducts);
                        const commission = inv.commissionAmount || calculateCommission(profit);
                        const isReleased = inv.commissionStatus === 'released' || isPaid;

                        return (
                          <tr key={inv.id} className="hover:bg-[#1a1a22] transition-colors">
                            
                            {/* Invoice & Date */}
                            <td className="p-3">
                              <div className="font-bold text-gray-100">{inv.invoiceNumber}</div>
                              <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 text-gray-500" />
                                <span>{inv.date}</span>
                              </div>
                              {inv.salesConsultantName && (
                                <div className="text-[10px] text-[#d4af37] font-semibold mt-0.5">
                                  👤 {inv.salesConsultantName}
                                </div>
                              )}
                            </td>

                            {/* Customer & Terms */}
                            <td className="p-3">
                              <div className="font-bold text-gray-200">{inv.customer?.fullName || 'N/A'}</div>
                              <div className="text-[10px] text-gray-400">{inv.customer?.phone}</div>
                              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                isEOM 
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-500/30' 
                                  : 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                              }`}>
                                {isEOM ? '📅 EOM Monthly Account' : '📦 Pay on Delivery'}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              <div className="space-y-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPaid 
                                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' 
                                    : inv.isLatePayment || inv.status === 'overdue'
                                    ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                                    : 'bg-amber-950/80 border border-amber-500/40 text-amber-300'
                                }`}>
                                  {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  <span className="uppercase">{inv.status}</span>
                                </span>

                                {/* Commission Badge */}
                                <div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-extrabold ${
                                    isReleased 
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' 
                                      : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {isReleased ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                    <span>{isReleased ? 'RELEASED' : 'LOCKED'}</span>
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Profit */}
                            <td className="p-3 text-right">
                              <span className="font-bold text-gray-200 block">
                                {formatCurrency(profit)}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                Inv: {formatCurrency(inv.totalAmount)}
                              </span>
                            </td>

                            {/* Commission */}
                            <td className="p-3 text-right">
                              <span className={`font-extrabold text-sm block ${isReleased ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {formatCurrency(commission)}
                              </span>
                              <span className="text-[9px] text-gray-400">
                                (40% of profit)
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                {onSelectInvoice && (
                                  <button
                                    onClick={() => onSelectInvoice(inv)}
                                    className="px-2.5 py-1 rounded-lg bg-[#22222d] text-gray-200 hover:text-[#d4af37] border border-[#333342] text-[10px] font-semibold transition-all"
                                  >
                                    View Invoice
                                  </button>
                                )}

                                {!isPaid && (
                                  <button
                                    onClick={() => handleReleasePayment(inv.id)}
                                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[10px] shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Mark Paid</span>
                                  </button>
                                )}
                              </div>
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY PAYOUT STATEMENT MODULE */}
      {/* ========================================================================= */}
      {activeSubTab === 'monthly_statement' && (
        <div className="space-y-6">
          
          {/* Statement Generator Selector Bar */}
          <div className="bg-[#141419] border border-[#2d2d3a] p-4 rounded-2xl space-y-3 print:hidden">
            <div className="flex items-center justify-between border-b border-[#22222d] pb-2">
              <h3 className="font-cinzel text-sm font-bold text-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#d4af37]" />
                <span>Monthly Payout Statement Generator</span>
              </h3>
              <span className="text-[11px] text-gray-400">Only released/paid commissions are included</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              
              {/* Consultant Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Sales Consultant</label>
                <select
                  value={selectedConsultant}
                  onChange={(e) => setSelectedConsultant(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gold-gradient font-bold p-2 rounded-xl text-xs focus:outline-none"
                >
                  <option value="all">🌟 All Sales Consultants</option>
                  {consultants.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Month</label>
                <select
                  value={selectedStatementMonth}
                  onChange={(e) => setSelectedStatementMonth(Number(e.target.value))}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-200 font-semibold p-2 rounded-xl text-xs focus:outline-none"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Year Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-1 block">Year</label>
                <select
                  value={selectedStatementYear}
                  onChange={(e) => setSelectedStatementYear(Number(e.target.value))}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-200 font-semibold p-2 rounded-xl text-xs focus:outline-none"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              {/* Generate Button */}
              <div>
                <button
                  onClick={handleGenerateStatement}
                  className="w-full bg-gold-gradient text-[#0b0b0e] font-bold p-2 rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Statement</span>
                </button>
              </div>

            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#22222d]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-semibold">Statement Actions:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportJSON}
                  className="px-3 py-1.5 bg-[#22222d] border border-[#333342] text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp</span>
                </button>

                <button
                  onClick={handlePrintStatement}
                  className="px-3 py-1.5 bg-blue-950/80 border border-blue-500/40 text-blue-300 hover:text-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement</span>
                </button>
              </div>
            </div>

          </div>

          {/* OFFICIAL PRINT-FRIENDLY STATEMENT DOCUMENT */}
          {activeStatement && (
            <div className="bg-[#141419] border border-[#2d2d3a] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
              
              {/* Statement Top Branding Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#2d2d3a] pb-6 gap-4 print:border-black">
                <div className="flex items-center gap-4">
                  <Logo variant="full" size="lg" />
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-xs uppercase font-extrabold tracking-widest px-2.5 py-1 rounded bg-[#d4af37]/20 text-gold-gradient border border-[#d4af37]/40 block w-fit ml-auto mb-1 print:bg-yellow-100 print:text-black print:border-yellow-500">
                    Official Commission Statement
                  </span>
                  <div className="text-xs text-gray-400 font-mono print:text-gray-700">
                    ID: {activeStatement.statementId}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 print:text-gray-600">
                    Generated: {new Date(activeStatement.generatedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Statement Metadata Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#0b0b0e] border border-[#22222d] p-4 rounded-xl print:bg-gray-100 print:border-gray-300 print:text-black">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block print:text-gray-600">Sales Consultant</span>
                  <strong className="text-sm text-gold-gradient font-cinzel print:text-black">
                    {activeStatement.consultantName}
                  </strong>
                  <div className="text-[11px] text-gray-400 print:text-gray-600">
                    Consultant ID: <code className="text-amber-300 font-mono print:text-black">{activeStatement.consultantId}</code>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block print:text-gray-600">Payout Period</span>
                  <strong className="text-sm text-gray-100 font-bold print:text-black">
                    {activeStatement.monthName} {activeStatement.year}
                  </strong>
                  <div className="text-[11px] text-gray-400 print:text-gray-600">
                    Month #{activeStatement.month} Payout Cycle
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-semibold block print:text-gray-600">Statement Status</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      activeStatement.status === 'Exported'
                        ? 'bg-purple-950 text-purple-300 border border-purple-500/30 print:bg-purple-100 print:text-purple-800'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30 print:bg-emerald-100 print:text-emerald-800'
                    }`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{activeStatement.status.toUpperCase()}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                
                <div className="bg-[#0b0b0e] border border-[#262635] p-4 rounded-xl text-center print:bg-gray-50 print:border-gray-300">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block print:text-gray-600">Paid Invoices</span>
                  <span className="text-xl font-extrabold text-gray-100 block mt-1 print:text-black">
                    {activeStatement.totals.totalInvoicesPaid}
                  </span>
                </div>

                <div className="bg-[#0b0b0e] border border-[#262635] p-4 rounded-xl text-center print:bg-gray-50 print:border-gray-300">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block print:text-gray-600">Total Sales Revenue</span>
                  <span className="text-xl font-extrabold text-blue-400 block mt-1 print:text-black">
                    {formatCurrency(activeStatement.totals.totalInvoiceAmountPaid)}
                  </span>
                </div>

                <div className="bg-[#0b0b0e] border border-[#262635] p-4 rounded-xl text-center print:bg-gray-50 print:border-gray-300">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block print:text-gray-600">Total Profit Generated</span>
                  <span className="text-xl font-extrabold text-gray-100 block mt-1 print:text-black">
                    {formatCurrency(activeStatement.totals.totalProfitGenerated)}
                  </span>
                </div>

                <div className="bg-gradient-to-r from-emerald-950/50 to-teal-950/50 border border-emerald-500/40 p-4 rounded-xl text-center print:bg-emerald-50 print:border-emerald-300">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block print:text-emerald-800">Total Commission Released (40%)</span>
                  <span className="text-2xl font-black text-emerald-400 block mt-1 print:text-emerald-800">
                    {formatCurrency(activeStatement.totals.totalCommissionReleased)}
                  </span>
                </div>

              </div>

              {/* Breakdown Table */}
              <div className="space-y-3">
                <h4 className="font-cinzel text-sm font-bold text-gray-200 flex items-center gap-2 print:text-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Paid Invoices & Released Commission Breakdown</span>
                </h4>

                {activeStatement.invoices.length === 0 ? (
                  <div className="p-8 text-center bg-[#0b0b0e] rounded-xl border border-[#22222d] text-gray-400 text-xs print:bg-gray-100 print:text-black">
                    No fully settled invoices recorded for {activeStatement.consultantName} during {activeStatement.monthName} {activeStatement.year}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#2a2a35] text-gray-400 font-semibold uppercase tracking-wider text-[10px] bg-[#0b0b0e] print:bg-gray-200 print:text-black print:border-black">
                          <th className="p-3">#</th>
                          <th className="p-3">Invoice Number</th>
                          <th className="p-3">Client Name</th>
                          <th className="p-3">Payment Terms</th>
                          <th className="p-3">Settlement Date</th>
                          <th className="p-3 text-right">Invoice Total</th>
                          <th className="p-3 text-right">Net Profit</th>
                          <th className="p-3 text-right">Commission (40%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f1f2a] print:divide-gray-300">
                        {activeStatement.invoices.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#1a1a22] transition-colors print:hover:bg-transparent">
                            <td className="p-3 text-gray-400 font-mono print:text-black">{idx + 1}</td>
                            <td className="p-3 font-bold text-gray-100 print:text-black">{item.invoiceNumber}</td>
                            <td className="p-3 text-gray-200 print:text-black font-semibold">{item.clientName}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#22222d] text-gray-300 border border-[#333342] print:border-gray-400 print:text-black print:bg-gray-100">
                                {item.paymentType}
                              </span>
                            </td>
                            <td className="p-3 text-gray-300 font-mono print:text-black">{item.paymentDate}</td>
                            <td className="p-3 text-right text-gray-300 print:text-black">{formatCurrency(item.invoiceTotal)}</td>
                            <td className="p-3 text-right font-semibold text-gray-200 print:text-black">{formatCurrency(item.profitAmount)}</td>
                            <td className="p-3 text-right font-extrabold text-emerald-400 text-sm print:text-black">
                              {formatCurrency(item.commissionAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#d4af37]/40 bg-[#0b0b0e] font-bold text-xs print:bg-gray-200 print:border-black print:text-black">
                          <td colSpan={5} className="p-3 text-gray-200 font-cinzel print:text-black">
                            TOTAL PAYOUT ({activeStatement.invoices.length} INVOICES)
                          </td>
                          <td className="p-3 text-right text-blue-400 print:text-black">
                            {formatCurrency(activeStatement.totals.totalInvoiceAmountPaid)}
                          </td>
                          <td className="p-3 text-right text-gray-100 print:text-black">
                            {formatCurrency(activeStatement.totals.totalProfitGenerated)}
                          </td>
                          <td className="p-3 text-right font-black text-emerald-400 text-base print:text-black">
                            {formatCurrency(activeStatement.totals.totalCommissionReleased)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Terms & Authorization Signoff */}
              <div className="border-t border-[#2d2d3a] pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-gray-400 print:border-black print:text-black">
                <div className="space-y-1">
                  <span className="font-bold text-gray-300 uppercase block print:text-black">Commission Terms & Compliance</span>
                  <p className="text-[10px] leading-relaxed">
                    1. Commission is ONLY released after all outstanding payments from the client have been fully settled.<br />
                    2. Late payment fees (10%) are excluded from consultant profit calculations.<br />
                    3. Only product net profit (Selling Price - Cost Price) qualifies for the 40% payout rate.
                  </p>
                </div>

                <div className="space-y-4 text-right sm:text-right">
                  <div>
                    <span className="font-cinzel text-gold-gradient font-bold block print:text-black">MERLIZ HOLDINGS (PTY) LTD</span>
                    <span className="text-[10px] text-gray-400 block print:text-black">Taking you there • Point of Sale Service</span>
                  </div>

                  <div className="pt-4 border-t border-[#22222d] flex justify-end gap-6 print:border-gray-400">
                    <div className="text-center min-w-[120px]">
                      <div className="h-8 border-b border-gray-600 print:border-black mb-1"></div>
                      <span className="text-[9px] text-gray-400 print:text-black">Accounts Signoff</span>
                    </div>

                    <div className="text-center min-w-[120px]">
                      <div className="h-8 border-b border-gray-600 print:border-black mb-1"></div>
                      <span className="text-[9px] text-gray-400 print:text-black">Consultant Signature</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* JSON Export Modal */}
      {isExportJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141419] border border-[#2d2d3a] w-full max-w-2xl rounded-2xl p-6 space-y-4 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-[#22222d] pb-3">
              <h3 className="font-cinzel text-base font-bold text-amber-300 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-amber-400" />
                <span>Exported Statement JSON Data</span>
              </h3>
              <button
                onClick={() => setIsExportJsonModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              This formatted JSON statement can be exported or integrated into secondary accounting systems without server side files.
            </p>

            <div className="relative">
              <pre className="bg-[#0b0b0e] border border-[#22222d] p-4 rounded-xl text-xs font-mono text-emerald-400 max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
                {jsonExportText}
              </pre>

              <button
                onClick={handleCopyJSON}
                className="absolute top-3 right-3 px-3 py-1.5 bg-[#22222d] border border-[#333342] text-gray-200 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#22222d]">
              <span className="text-[10px] text-gray-400">Statement ID: {activeStatement?.statementId}</span>
              
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadJSON}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-black font-bold rounded-xl text-xs shadow hover:brightness-110 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .json File</span>
                </button>

                <button
                  onClick={() => setIsExportJsonModalOpen(false)}
                  className="px-4 py-2 bg-[#22222d] text-gray-300 hover:text-white font-semibold rounded-xl text-xs border border-[#333342]"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Sales Consultant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141419] border border-[#2d2d3a] w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-[#22222d] pb-3">
              <h3 className="font-cinzel text-lg font-bold text-gold-gradient flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#d4af37]" />
                <span>Add Sales Consultant</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddConsultantSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-gray-300 font-semibold mb-1 block">Consultant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sipho Ndlovu"
                  value={newConsultantName}
                  onChange={(e) => setNewConsultantName(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 p-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-300 font-semibold mb-1 block">WhatsApp / Contact Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +27 82 987 6543"
                  value={newConsultantPhone}
                  onChange={(e) => setNewConsultantPhone(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 p-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-gray-300 font-semibold mb-1 block">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="consultant@merliz.co.za"
                  value={newConsultantEmail}
                  onChange={(e) => setNewConsultantEmail(e.target.value)}
                  className="w-full bg-[#0b0b0e] border border-[#2a2a35] focus:border-[#d4af37] text-gray-100 p-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#2a2a35] text-gray-300 font-semibold hover:bg-[#22222d]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gold-gradient text-[#0b0b0e] font-bold shadow-lg hover:brightness-110 active:scale-95"
                >
                  Save Consultant
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
