// ========================================
// CloudSmartSpend — Firebase Config & Data Store
// Uses localStorage for demo mode, Firebase for cloud mode
// ========================================

const DataStore = (() => {
  // ---- Firebase Configuration ----
  // Replace these with your Firebase project credentials
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Check if Firebase is properly configured
  const isFirebaseConfigured = () => {
    return FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';
  };

  // ---- Local Storage Keys ----
  const STORAGE_KEYS = {
    USER: 'css_user',
    TRANSACTIONS: 'css_transactions',
    BUDGETS: 'css_budgets',
    SETTINGS: 'css_settings'
  };

  // ---- Demo User ----
  const DEMO_USER = {
    uid: 'demo_user_001',
    displayName: 'Atharv',
    email: 'demo@cloudsmartspend.app',
    photoURL: null
  };

  // ---- Generate Demo Data ----
  function generateDemoData() {
    const existing = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (existing) return JSON.parse(existing);

    const vendors = {
      food: ['Swiggy', 'Zomato', 'Starbucks', "McDonald's", 'Haldirams', 'Dominos', 'KFC', 'Subway', 'Chai Point', 'Barbeque Nation'],
      transport: ['Uber', 'Ola', 'Metro Card', 'Petrol - HP', 'Rapido', 'Petrol - Indian Oil', 'Parking'],
      shopping: ['Amazon', 'Flipkart', 'Myntra', 'DMart', 'Big Bazaar', 'Reliance Digital', 'Croma'],
      bills: ['Electricity Bill', 'Phone Recharge', 'Internet - Jio', 'Water Bill', 'Gas Bill', 'Netflix', 'Spotify'],
      entertainment: ['PVR Cinemas', 'BookMyShow', 'Gaming', 'Concert Tickets', 'Amusement Park'],
      health: ['Apollo Pharmacy', 'Hospital Visit', '1mg Order', 'Gym Membership', 'Lab Test'],
      education: ['Udemy Course', 'Book Purchase', 'Course Fee', 'Stationery', 'Online Subscription'],
      other: ['Gift', 'Donation', 'ATM Withdrawal', 'Miscellaneous']
    };

    const amountRanges = {
      food: [80, 2500],
      transport: [50, 3000],
      shopping: [200, 15000],
      bills: [200, 5000],
      entertainment: [150, 3000],
      health: [100, 8000],
      education: [200, 5000],
      other: [100, 5000]
    };

    const transactions = [];
    const now = new Date();

    // Generate 90 days of transactions
    for (let daysAgo = 0; daysAgo < 90; daysAgo++) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      // 1-4 transactions per day
      const numTx = 1 + Math.floor(Math.random() * 4);

      for (let i = 0; i < numTx; i++) {
        const categories = Object.keys(vendors);
        const category = categories[Math.floor(Math.random() * categories.length)];
        const vendorList = vendors[category];
        const vendor = vendorList[Math.floor(Math.random() * vendorList.length)];
        const [minAmt, maxAmt] = amountRanges[category];
        const amount = Math.round(minAmt + Math.random() * (maxAmt - minAmt));

        // Random time in the day
        const txDate = new Date(date);
        txDate.setHours(8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60));

        transactions.push({
          id: Utils.generateId(),
          amount,
          vendor,
          category,
          date: txDate.toISOString(),
          notes: '',
          billImageUrl: null,
          ocrRawText: null,
          createdAt: txDate.toISOString()
        });
      }
    }

    // Sort newest first
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return transactions;
  }

  // ---- Default Budgets ----
  function getDefaultBudgets() {
    return {
      food: 8000,
      transport: 4000,
      shopping: 10000,
      bills: 6000,
      entertainment: 3000,
      health: 3000,
      education: 5000,
      other: 2000
    };
  }

  // ---- CRUD Operations ----

  // Get current user
  function getUser() {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  }

  function setUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // Get all transactions
  function getTransactions() {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
  }

  // Get transactions within date range
  function getTransactionsInRange(startDate, endDate) {
    const transactions = getTransactions();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return transactions.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });
  }

  // Add transaction
  function addTransaction(transaction) {
    const transactions = getTransactions();
    const newTx = {
      id: Utils.generateId(),
      ...transaction,
      createdAt: new Date().toISOString()
    };
    transactions.unshift(newTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Notify listeners
    notifyListeners('transaction_added', newTx);
    return newTx;
  }

  // Update transaction
  function updateTransaction(id, updates) {
    const transactions = getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    transactions[index] = { ...transactions[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    notifyListeners('transaction_updated', transactions[index]);
    return transactions[index];
  }

  // Delete transaction
  function deleteTransaction(id) {
    let transactions = getTransactions();
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    notifyListeners('transaction_deleted', { id });
    return true;
  }

  // Get transaction by ID
  function getTransaction(id) {
    const transactions = getTransactions();
    return transactions.find(t => t.id === id) || null;
  }

  // ---- Budgets ----
  function getBudgets() {
    const stored = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    return stored ? JSON.parse(stored) : getDefaultBudgets();
  }

  function setBudgets(budgets) {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
    notifyListeners('budgets_updated', budgets);
  }

  function setBudget(category, amount) {
    const budgets = getBudgets();
    budgets[category] = amount;
    setBudgets(budgets);
  }

  // ---- Settings ----
  function getSettings() {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : {
      currency: 'INR',
      notifications: true,
      budgetAlerts: true
    };
  }

  function updateSettings(updates) {
    const settings = { ...getSettings(), ...updates };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }

  // ---- Event Listeners ----
  const listeners = {};

  function onDataChange(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    };
  }

  function notifyListeners(event, data) {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(data));
    }
    // Also notify generic 'change' listeners
    if (listeners['change']) {
      listeners['change'].forEach(cb => cb({ event, data }));
    }
  }

  // ---- Bill Image Storage (base64 in localStorage) ----
  function saveBillImage(transactionId, imageDataUrl) {
    try {
      localStorage.setItem(`css_bill_${transactionId}`, imageDataUrl);
      return `css_bill_${transactionId}`;
    } catch (e) {
      console.warn('Could not save bill image (storage full):', e);
      return null;
    }
  }

  function getBillImage(transactionId) {
    return localStorage.getItem(`css_bill_${transactionId}`);
  }

  // ---- Initialize ----
  function init() {
    // Generate demo data if no transactions exist
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      generateDemoData();
    }
    // Set default budgets if none exist
    if (!localStorage.getItem(STORAGE_KEYS.BUDGETS)) {
      setBudgets(getDefaultBudgets());
    }
  }

  // ---- Clear All Data ----
  function clearAllData() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    // Clear bill images
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('css_bill_')) localStorage.removeItem(key);
    });
  }

  return {
    FIREBASE_CONFIG,
    isFirebaseConfigured,
    DEMO_USER,
    init,
    getUser, setUser, clearUser,
    getTransactions, getTransactionsInRange, getTransaction,
    addTransaction, updateTransaction, deleteTransaction,
    getBudgets, setBudgets, setBudget,
    getSettings, updateSettings,
    saveBillImage, getBillImage,
    onDataChange,
    clearAllData,
    generateDemoData
  };
})();
