import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Coins,
  Receipt,
  Package,
  Users,
  ChevronDown,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatBDT } from '../../utils/formatters';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({ isOpen, onClose }) => {
  const {
    businessProfile,
    metrics,
    sales,
    purchases,
    expenses,
    customers,
    suppliers,
    accounts,
    products,
    language,
  } = useApp();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `👋 **আসসালামু আলাইকুম!** আমি **RM AutoManage AI**—আপনার অটোমোবাইল ব্যবসার স্মার্ট এআই সহকারী ও ফাইন্যান্সিয়াল অ্যানালিস্ট।\n\nদোকানের আজকের সেল, বাকি টাকার খতিয়ান, কম স্টকের মালামাল বা ব্যবসা বৃদ্ধির ফাইন্যান্সিয়াল পরামর্শ সম্পর্কে যেকোনো কিছু আমাকে সরাসরি বাংলায় জিজ্ঞেস করতে পারেন। নিচে দেওয়া সাজেস্টেড প্রশ্নে ক্লিক করতে পারেন অথবা আপনার প্রশ্নটি লিখুন।`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Build Real-Time Context for Gemini
  const realTimeContext = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);

    // Sales today
    const todaySalesList = sales.filter((s) => s.date.startsWith(todayStr));
    const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + s.grandTotal, 0);
    const todayCollected = todaySalesList.reduce((sum, s) => sum + s.paidAmount, 0);
    const todayDueGiven = todaySalesList.reduce((sum, s) => sum + s.dueAmount, 0);
    const todayGrossProfit = todaySalesList.reduce((sum, s) => sum + s.grossProfit, 0);

    // This month sales & expenses
    const thisMonthSales = sales
      .filter((s) => s.date.startsWith(thisMonthPrefix))
      .reduce((sum, s) => sum + s.grandTotal, 0);
    const thisMonthExpenses = expenses
      .filter((e) => e.date.startsWith(thisMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    // Customer Dues
    const customersWithDue = customers
      .filter((c) => c.currentDue > 0)
      .sort((a, b) => b.currentDue - a.currentDue);
    const totalCustomerDue = customersWithDue.reduce((sum, c) => sum + c.currentDue, 0);

    // Supplier Payables
    const suppliersWithPayable = suppliers
      .filter((s) => s.currentPayable > 0)
      .sort((a, b) => b.currentPayable - a.currentPayable);
    const totalSupplierPayable = suppliersWithPayable.reduce((sum, s) => sum + s.currentPayable, 0);

    // Accounts Liquidity
    const totalLiquidBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const accountsBreakdown = accounts.map((a) => ({
      name: a.name,
      type: a.type,
      balance: a.balance,
      accountNumber: a.accountNumber || 'N/A',
    }));

    // Inventory status
    const lowStock = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minStockLevel);
    const outOfStock = products.filter((p) => p.currentStock === 0);

    return {
      storeName: businessProfile.businessName || 'RM Automobiles',
      proprietorName: businessProfile.ownerName || 'আব্দুর রহিম রনি',
      todayDate: todayStr,
      todaySummary: {
        totalSales: todaySalesTotal,
        invoicesCount: todaySalesList.length,
        cashCollected: todayCollected,
        dueGenerated: todayDueGiven,
        grossProfit: todayGrossProfit,
      },
      monthlySummary: {
        monthSales: thisMonthSales,
        monthExpenses: thisMonthExpenses,
        estimatedNetProfit: thisMonthSales > 0 ? thisMonthSales * 0.18 - thisMonthExpenses : 0,
      },
      customerDues: {
        totalDue: totalCustomerDue,
        debtorCount: customersWithDue.length,
        topDebtors: customersWithDue.slice(0, 8).map((c) => ({
          name: c.name,
          phone: c.phone,
          due: c.currentDue,
          address: c.address || '',
        })),
      },
      supplierPayables: {
        totalPayable: totalSupplierPayable,
        supplierCount: suppliersWithPayable.length,
        topPayables: suppliersWithPayable.slice(0, 5).map((s) => ({
          name: s.name,
          phone: s.phone,
          payable: s.currentPayable,
        })),
      },
      liquidFunds: {
        totalLiquid: totalLiquidBalance,
        accounts: accountsBreakdown,
      },
      inventoryAlerts: {
        totalProductsCount: products.length,
        outOfStockCount: outOfStock.length,
        outOfStockSample: outOfStock.slice(0, 6).map((p) => `${p.name} (SKU: ${p.sku})`),
        lowStockCount: lowStock.length,
        lowStockSample: lowStock.slice(0, 6).map((p) => `${p.name} (বাকি: ${p.currentStock} ${p.unit})`),
      },
    };
  }, [sales, expenses, customers, suppliers, accounts, products, businessProfile]);

  // Quick suggestion chips
  const quickPrompts = [
    {
      label: '📊 আজকের বিক্রির হিসাব',
      prompt: 'আজকের সেল ও ক্যাশ কালেকশন কত হয়েছে? সার্বিক হিসাব দিন।',
    },
    {
      label: '👥 কতজন থেকে টাকা বাকি?',
      prompt: 'মোট কতজন কাস্টমারের কাছে কত টাকা বাকি আছে এবং সবচেয়ে বেশি বাকি কার কার?',
    },
    {
      label: '💡 এই মাসে কি করা দরকার?',
      prompt: 'চলতি মাসে ব্যবসার লাভ ও ক্যাশফ্লো বাড়ানোর জন্য ফাইনান্সিয়াল সাজেশন ও কি কি পদক্ষেপ নেওয়া দরকার?',
    },
    {
      label: '📦 কম স্টকের মালামাল',
      prompt: 'কোন কোন পার্টস বা মালামালের স্টক শেষ বা একদম কমে গেছে যা দ্রুত অর্ডার করতে হবে?',
    },
    {
      label: '🏦 ক্যাশ ও ব্যাংক ব্যালেন্স',
      prompt: 'দোকান ক্যাশ, ব্যাংক ও বিকাশ/নগদে বর্তমানে মোট কত ব্যালেন্স জমা আছে?',
    },
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          context: realTimeContext,
          history: messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const aiReplyText = data.reply || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি।';

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: aiReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      console.warn('API error, providing fallback response based on real-time context:', err);

      // Intelligent Local Fallback based on real-time context
      const fallbackReply = generateFallbackReply(textToSend, realTimeContext);

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: fallbackReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('আপনি কি পূর্ববর্তী এআই কথোপকথন মুছে ফেলতে চান?')) {
      setMessages([
        {
          id: 'welcome-reset',
          sender: 'ai',
          text: `কথোপকথন রিসেট করা হয়েছে। আপনার নতুন প্রশ্নটি করুন বা নিচের প্রম্পট থেকে বাছাই করুন।`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isExpanded
            ? 'h-[95vh] sm:h-[90vh] sm:w-[720px] rounded-t-3xl sm:rounded-3xl'
            : 'h-[85vh] sm:h-[650px] sm:w-[460px] rounded-t-3xl sm:rounded-3xl'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-violet-700 via-indigo-700 to-indigo-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-indigo-900" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-1">
                  <span>RM AutoManage AI</span>
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 font-medium leading-none mt-0.5">
                বাংলায় ব্যবসায়িক উপদেষ্টা ও লাইভ এনালাইসিস
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-white/80">
            <button
              onClick={handleClearHistory}
              title="কথোপকথন ক্লিয়ার করুন"
              className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'সংকুচিত করুন' : 'বড় করুন'}
              className="hidden sm:block p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              title="বন্ধ করুন"
              className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Mini Stats Ribbon */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between overflow-x-auto no-scrollbar gap-3 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-400">আজকের সেল:</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">
              {formatBDT(realTimeContext.todaySummary.totalSales)}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-400">বাকি:</span>
            <span className="font-black text-rose-600 dark:text-rose-400">
              {formatBDT(realTimeContext.customerDues.totalDue)}
            </span>
          </div>
          <div className="w-px h-3 bg-slate-300 dark:bg-slate-700 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-400">ক্যাশ ফান্ড:</span>
            <span className="font-black text-amber-600 dark:text-amber-400">
              {formatBDT(realTimeContext.liquidFunds.totalLiquid)}
            </span>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-xs relative group ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 rounded-tl-xs'
                }`}
              >
                {/* Message Text with Simple Markdown Formatting */}
                <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-[13px]">
                  {formatMarkdownText(msg.text)}
                </div>

                <div
                  className={`mt-1.5 flex items-center justify-between text-[10px] ${
                    msg.sender === 'user' ? 'text-amber-950/70' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>

                  {msg.sender === 'ai' && (
                    <button
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-600 dark:hover:text-slate-200 ml-2"
                      title="কপি করুন"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-black text-xs shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Loading Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-xs p-3.5 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>আপনার দোকানের লাইভ ডেটা বিশ্লেষণ করা হচ্ছে...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            দ্রুত জানতে ক্লিক করুন:
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={isLoading}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 text-[11px] font-semibold whitespace-nowrap transition-all shadow-2xs active:scale-95 disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="আজকের সেল কত? বা কোন মালামাল আনা দরকার? বাংলায় লিখুন..."
            className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

// Formats basic markdown elements like **bold**, lists, and headers for nice display
function formatMarkdownText(text: string) {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Bold parsing
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const formattedLine = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (line.startsWith('# ')) {
      return (
        <h4 key={idx} className="font-black text-sm text-slate-900 dark:text-white mt-2 mb-1">
          {line.replace('# ', '')}
        </h4>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h5 key={idx} className="font-bold text-xs text-slate-900 dark:text-white mt-1.5 mb-1">
          {line.replace('## ', '')}
        </h5>
      );
    }
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return (
        <div key={idx} className="flex items-start gap-1.5 pl-2 my-0.5">
          <span className="text-violet-500 mt-1">•</span>
          <span className="flex-1">{formattedLine.slice(1)}</span>
        </div>
      );
    }

    return (
      <React.Fragment key={idx}>
        {formattedLine}
        {idx < lines.length - 1 && '\n'}
      </React.Fragment>
    );
  });
}

// Smart Local Fallback Response Generator based on Real-Time Context
function generateFallbackReply(prompt: string, ctx: any): string {
  const p = prompt.toLowerCase();

  // 1. Sales query
  if (p.includes('সেল') || p.includes('বিক্রি') || p.includes('আজকে') || p.includes('sales')) {
    const s = ctx.todaySummary;
    return `📊 **আজকের বিক্রির লাইভ খতিয়ান (${ctx.todayDate}):**\n\n* **মোট বিক্রি:** ৳ ${Math.round(s.totalSales).toLocaleString()}\n* **মোট ইনভয়েস:** ${s.invoicesCount} টি\n* **নগদ কালেকশন:** ৳ ${Math.round(s.cashCollected).toLocaleString()}\n* **বাকি বিক্রয়:** ৳ ${Math.round(s.dueGenerated).toLocaleString()}\n* **আনুমানিক মোট লাভ (Gross Profit):** ৳ ${Math.round(s.grossProfit).toLocaleString()}\n\n💡 *পরামর্শ: আজকের মোট কালেকশন রেট ভালো রাখতে বকেয়া ইনভয়েসগুলোর দিকে নজর দিন।*`;
  }

  // 2. Dues query
  if (p.includes('বাকি') || p.includes('কার কার') || p.includes('due') || p.includes('debtor')) {
    const d = ctx.customerDues;
    let debtorsList = '';
    if (d.topDebtors && d.topDebtors.length > 0) {
      debtorsList = d.topDebtors
        .map((c: any, i: number) => `${i + 1}. **${c.name}** (${c.phone || 'ফোন নেই'}): ৳ ${Math.round(c.due).toLocaleString()}`)
        .join('\n');
    }

    return `👥 **কাস্টমারদের কাছে বাকি টাকার খতিয়ান:**\n\n* **মোট পাওনা বাকি:** ৳ ${Math.round(d.totalDue).toLocaleString()}\n* **মোট বাকিদার কাস্টমার:** ${d.debtorCount} জন\n\n**শীর্ষ বাকিদার কাস্টমারদের তালিকা:**\n${debtorsList || 'বর্তমানে কারও কাছে কোনো বকেয়া নেই।'}\n\n💡 *পরামর্শ: যেসব কাস্টমারের কাছে বাকি বেশি তাদের সাথে হোয়াটসঅ্যাপ বা ফোনে অবিলম্বে যোগাযোগ করে তাগাদা দেওয়া উচিত।*`;
  }

  // 3. Suggestions / advice query
  if (p.includes('সাজেশন') || p.includes('পরামর্শ') || p.includes('করা দরকার') || p.includes('লাভ') || p.includes('financial')) {
    const inv = ctx.inventoryAlerts;
    const dues = ctx.customerDues;
    const funds = ctx.liquidFunds;

    return `💡 **চলতি মাসের জন্য সার্বিক ফাইন্যান্সিয়াল ও ব্যবসায়িক অ্যাকশন প্ল্যান:**\n\n1. **বকেয়া টাকা দ্রুত আদায়:** বর্তমানে বাজারে ৳ ${Math.round(dues.totalDue).toLocaleString()} বাকি পড়ে আছে। অন্তত ৫০% বকেয়া আদায়ের টার্গেট নিলে দোকানের ওয়ার্কিং ক্যাপিটাল তাৎক্ষণিক বৃদ্ধি পাবে।\n2. **স্টক রিস্টক সতর্কতা:** বর্তমানে **${inv.outOfStockCount} টি মালামাল সম্পূর্ণ স্টকআউট** এবং **${inv.lowStockCount} টি মালামালের স্টক ন্যূনতম সীমায়** রয়েছে। দ্রুত বিক্রিত স্পেয়ার পার্টসগুলো আগে রিস্টক করুন।\n3. **চলতি মূলধন ও ক্যাশ ম্যানেজমেন্ট:** মোট বর্তমান তরল ফান্ড ৳ ${Math.round(funds.totalLiquid).toLocaleString()}। অপ্রয়োজনীয় পরিচালন খরচ কমিয়ে লাভজনক মালামাল ক্রয়ে এই তহবিল ব্যবহার করুন।\n4. **নগদ বিক্রি উৎসাহিত করুন:** বাকিতে বিক্রয় সীমিত রেখে তাৎক্ষণিক নগদ বা বিকাশ/নগদ পেমেন্টে ছোট ক্যাশ ডিসকাউন্ট দিয়ে ক্যাশফ্লো সচল রাখুন।`;
  }

  // 4. Inventory query
  if (p.includes('স্টক') || p.includes('মালামাল') || p.includes('পার্টস') || p.includes('inventory') || p.includes('order')) {
    const inv = ctx.inventoryAlerts;
    const outList = inv.outOfStockSample.map((item: string) => `* ❌ ${item}`).join('\n');
    const lowList = inv.lowStockSample.map((item: string) => `* ⚠️ ${item}`).join('\n');

    return `📦 **ইনভেন্টরি ও মালামাল স্টক অ্যালার্ট:**\n\n* **সম্পূর্ণ শেষ (Stock Out):** ${inv.outOfStockCount} টি আইটেম\n${outList || 'কোনো স্টকআউট নেই।'}\n\n* **কম স্টক (Low Stock):** ${inv.lowStockCount} টি আইটেম\n${lowList || 'সব মালামাল পর্যাপ্ত স্টকে আছে।'}\n\n💡 *পরামর্শ: যে পণ্যগুলোর চাহিদা বেশি সেগুলো দ্রুত সাপ্লায়ারদের কাছে অর্ডার করুন যাতে কাস্টমার ফিরে না যায়।*`;
  }

  // 5. Bank / Cash query
  if (p.includes('ব্যাংক') || p.includes('ক্যাশ') || p.includes('ব্যালেন্স') || p.includes('টাকা') || p.includes('balance')) {
    const funds = ctx.liquidFunds;
    const accList = funds.accounts.map((a: any) => `* **${a.name}:** ৳ ${Math.round(a.balance).toLocaleString()}`).join('\n');

    return `🏦 **ক্যাশ ও ব্যাংক ব্যালেন্সের সার্বিক বিবরণ:**\n\n* **সর্বমোট তরল ব্যালেন্স:** ৳ ${Math.round(funds.totalLiquid).toLocaleString()}\n\n**অ্যাকাউন্ট অনুযায়ী ব্যালেন্স:**\n${accList}\n\n💡 *পরামর্শ: নিয়মিত দিনের শেষে দোকান ক্যাশ থেকে ব্যাংকে অর্থ জমা রাখলে হিসাব সুরক্ষিত থাকে।*`;
  }

  // Default summary response
  return `📋 **${ctx.storeName}-এর সার্বিক সারসংক্ষেপ:**\n\n* **আজকের মোট বিক্রি:** ৳ ${Math.round(ctx.todaySummary.totalSales).toLocaleString()}\n* **আজকের নগদ আদায়:** ৳ ${Math.round(ctx.todaySummary.cashCollected).toLocaleString()}\n* **কাস্টমারদের মোট বাকি:** ৳ ${Math.round(ctx.customerDues.totalDue).toLocaleString()} (${ctx.customerDues.debtorCount} জন)\n* **মোট ক্যাশ ও ব্যাংক ব্যালেন্স:** ৳ ${Math.round(ctx.liquidFunds.totalLiquid).toLocaleString()}\n* **স্টক সতর্কবার্তা:** ${ctx.inventoryAlerts.outOfStockCount} টি স্টক শেষ, ${ctx.inventoryAlerts.lowStockCount} টি কম স্টক।\n\nনির্দিষ্ট কোনো বিষয়ের গভীরে জানতে আমাকে প্রশ্ন করুন!`;
}
