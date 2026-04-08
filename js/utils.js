// ========================================
// CloudSmartSpend — Utility Functions
// Date formatting, currency, parsers, helpers
// ========================================

const Utils = (() => {
  // ---- Currency Formatting ----
  const DEFAULT_CURRENCY = 'INR';
  const CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };

  function getCurrency() {
    return localStorage.getItem('css_currency') || DEFAULT_CURRENCY;
  }

  function setCurrency(code) {
    localStorage.setItem('css_currency', code);
  }

  function getCurrencySymbol() {
    return CURRENCY_SYMBOLS[getCurrency()] || '₹';
  }

  function formatCurrency(amount) {
    const symbol = getCurrencySymbol();
    const num = parseFloat(amount) || 0;
    if (getCurrency() === 'INR') {
      return symbol + formatIndianNumber(num);
    }
    return symbol + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function formatIndianNumber(num) {
    const str = Math.round(num).toString();
    let result = '';
    const len = str.length;
    if (len <= 3) return str;
    result = str.substring(len - 3);
    let remaining = str.substring(0, len - 3);
    while (remaining.length > 2) {
      result = remaining.substring(remaining.length - 2) + ',' + result;
      remaining = remaining.substring(0, remaining.length - 2);
    }
    if (remaining.length > 0) {
      result = remaining + ',' + result;
    }
    return result;
  }

  // ---- Date Formatting ----
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function formatDate(date, format = 'short') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    switch (format) {
      case 'short':
        return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      case 'long':
        return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
      case 'relative':
        return getRelativeDate(d);
      case 'time':
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case 'input':
        return d.toISOString().split('T')[0];
      case 'month':
        return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
      case 'day':
        return DAYS_SHORT[d.getDay()];
      default:
        return d.toLocaleDateString();
    }
  }

  function getRelativeDate(date) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDate(date, 'short');
  }

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getStartOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function isSameDay(d1, d2) {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  }

  // ---- Date Range Helpers ----
  function getDateRange(period) {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    let start;

    switch (period) {
      case 'week':
        start = getStartOfWeek(now);
        break;
      case 'month':
        start = getStartOfMonth(now);
        break;
      case '3months':
        start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        break;
      case '6months':
        start = new Date(now);
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = getStartOfMonth(now);
    }

    return { start, end };
  }

  // ---- OCR Text Parsing ----
  function parseAmountFromText(text) {
    const lines = text.split('\n');
    let maxFound = 0;

    // 1. Look for explicit total lines
    const keywords = ['total', 'amount', 'amt', 'payable', 'net', 'sum', 'due', 'paid', 'cash', 'card', 'upi'];
    for (let line of lines) {
      const lower = line.toLowerCase();
      const hasKeyword = keywords.some(k => lower.includes(k));
      if (hasKeyword) {
         // Find all explicit decimals on this line first, else integers
         const nums = line.match(/\b\d+[\.,]\d{2}\b/g) || line.match(/\b\d+\b/g);
         if (nums) {
             nums.forEach(n => {
                const valStr = n.replace(/,/g, '');
                const val = parseFloat(valStr);
                if (val > maxFound && val < 500000) maxFound = val;
             });
         }
      }
    }
    if (maxFound > 0) return maxFound;

    // 2. Look for any exact currency symbol anywhere
    const curPatterns = /(?:rs\.?|₹|inr|\$|usd|eur|€|£)\s*([\d,]+\.?\d*)/gi;
    let match;
    while ((match = curPatterns.exec(text)) !== null) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (val > maxFound && val < 500000) maxFound = val;
    }
    if (maxFound > 0) return maxFound;

    // 3. Fallback: Largest number with exactly two decimal places (e.g. 150.00)
    // This safely avoids phone numbers and GSTINs
    const decimals = text.match(/\b\d{1,5}\.\d{2}\b/g);
    if (decimals) {
       decimals.forEach(n => {
           const val = parseFloat(n);
           if (val > maxFound && val < 500000) maxFound = val;
       });
       if (maxFound > 0) return maxFound;
    }

    return null;
  }

  function parseDateFromText(text) {
    const patterns = [
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})[,\s]+(\d{2,4})/i,
      // YYYY-MM-DD
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let dateStr = match[0];
        
        // Handle YYYY-MM-DD
        if (/^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/.test(dateStr)) {
            const parts = dateStr.split(/[\/\-\.]/);
            const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            if (!isNaN(d.getTime())) return d;
        }

        // Handle DD-MM-YYYY
        if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(dateStr)) {
          const parts = dateStr.split(/[\/\-\.]/);
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          let year = parseInt(parts[2]);
          if (year < 100) year += 2000;
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }

        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  }

  function parseVendorFromText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    
    // Vendor is usually in the first 1-3 lines.
    // Skip lines with words that indicate it's not a brand name
    const skipKeywords = ['tax', 'invoice', 'receipt', 'bill', 'date', 'time', 'store', 'cash', 'tel', 'ph', 'gst', 'tin', 'fssai', 'no.', 'order'];
    
    for (let i = 0; i < Math.min(8, lines.length); i++) {
       let line = lines[i];
       const lower = line.toLowerCase();
       
       if (skipKeywords.some(k => lower.includes(k))) continue;
       
       // If it has too many numbers, it's an address, zip code, or phone number
       const numCount = (line.match(/\d/g) || []).length;
       if (numCount > 3) continue;
       
       // Strip out weird extreme punctuation OCR noise
       let cleanLine = line.replace(/[^a-zA-Z\s&'\-]/g, '').trim();
       
       if (cleanLine.length >= 3 && cleanLine.length <= 40) {
          // If the line consists only of random single letters mixed with spaces (OCR glitch)
          if (/^(\w\s)+\w$/.test(cleanLine)) continue;

          return cleanLine.replace(/\b\w/g, c => c.toUpperCase());
       }
    }
    return '';
  }

  // ---- Categories ----
  const CATEGORIES = [
    { id: 'food', name: 'Food & Dining', icon: '🍔', color: '#F97316' },
    { id: 'transport', name: 'Transport', icon: '🚗', color: '#3B82F6' },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#EC4899' },
    { id: 'bills', name: 'Bills & Utilities', icon: '📄', color: '#8B5CF6' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#F43F5E' },
    { id: 'health', name: 'Health', icon: '💊', color: '#10B981' },
    { id: 'education', name: 'Education', icon: '📚', color: '#06B6D4' },
    { id: 'other', name: 'Other', icon: '📌', color: '#6B7280' }
  ];

  function getCategoryById(id) {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
  }

  function getCategoryColor(id) {
    return getCategoryById(id).color;
  }

  function getCategoryIcon(id) {
    return getCategoryById(id).icon;
  }

  // ---- ID Generation ----
  function generateId() {
    // Generate valid UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ---- Debounce ----
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ---- Toast Notification ----
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
      error: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      warning: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    toast.innerHTML = `
      <span style="color: var(--${type === 'error' ? 'danger' : type})">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ---- Percentage Change ----
  function percentChange(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // ---- Group Transactions by Date ----
  function groupByDate(transactions) {
    const groups = {};
    transactions.forEach(t => {
      const dateKey = formatDate(t.date, 'short');
      if (!groups[dateKey]) {
        groups[dateKey] = { label: dateKey, date: new Date(t.date), items: [] };
      }
      groups[dateKey].items.push(t);
    });
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }

  // ---- Group Transactions by Category ----
  function groupByCategory(transactions) {
    const groups = {};
    transactions.forEach(t => {
      const cat = t.category || 'other';
      if (!groups[cat]) groups[cat] = { total: 0, count: 0 };
      groups[cat].total += t.amount;
      groups[cat].count++;
    });
    return groups;
  }

  // ---- Simple Moving Average ----
  function movingAverage(data, windowSize = 7) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = data.slice(start, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      result.push(Math.round(avg));
    }
    return result;
  }

  // ---- Export as CSV ----
  function exportToCSV(transactions) {
    const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Notes'];
    const rows = transactions.map(t => [
      formatDate(t.date, 'short'),
      `"${(t.vendor || '').replace(/"/g, '""')}"`,
      getCategoryById(t.category).name,
      t.amount,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartspend_export_${formatDate(new Date(), 'input')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Transactions exported successfully', 'success');
  }

  return {
    getCurrency, setCurrency, getCurrencySymbol, formatCurrency,
    formatDate, getRelativeDate, getStartOfWeek, getStartOfMonth,
    getDaysInMonth, isSameDay, getDateRange,
    parseAmountFromText, parseDateFromText, parseVendorFromText,
    CATEGORIES, getCategoryById, getCategoryColor, getCategoryIcon,
    generateId, debounce, showToast, percentChange,
    groupByDate, groupByCategory, movingAverage, exportToCSV
  };
})();
