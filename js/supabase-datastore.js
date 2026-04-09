// ========================================
// CloudSmartSpend — Supabase DataStore (Local-First)
// Uses localStorage for instant UI, syncs to Supabase in background
// ========================================

const DataStore = (() => {
  // ---- Supabase Configuration ----
  // Replace these with your Supabase project credentials
  const SUPABASE_URL = "https://cefptfemsresgnchhsgx.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZnB0ZmVtc3Jlc2duY2hoc2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTU2NDgsImV4cCI6MjA5MTIzMTY0OH0.zabWeU1Sq1kxCcWUx14XgMRABlPK197vYl-Wjt2YZoQ";

  let supabaseClient = null;

  // Check if Supabase is properly configured
  const isSupabaseConfigured = () => {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.startsWith('http');
  };

  if (isSupabaseConfigured() && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }

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
    displayName: 'Demo User',
    email: 'demo@cloudsmartspend.app',
    photoURL: null
  };

  // ---- Generate Demo Data ----
  function generateDemoData() {
    const existing = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (existing) return JSON.parse(existing);

    const vendors = {
      food: ['Swiggy', 'Zomato', 'Starbucks', "McDonald's", 'Haldirams'],
      transport: ['Uber', 'Ola', 'Metro Card', 'Petrol - HP'],
      shopping: ['Amazon', 'Flipkart', 'Myntra', 'DMart'],
      bills: ['Electricity Bill', 'Phone Recharge', 'Internet - Jio']
    };

    const amountRanges = {
      food: [80, 2500],
      transport: [50, 3000],
      shopping: [200, 15000],
      bills: [200, 5000]
    };

    const transactions = [];
    const now = new Date();

    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      const numTx = 1 + Math.floor(Math.random() * 2);

      for (let i = 0; i < numTx; i++) {
        const categories = Object.keys(vendors);
        const category = categories[Math.floor(Math.random() * categories.length)];
        const vendorList = vendors[category];
        const vendor = vendorList[Math.floor(Math.random() * vendorList.length)];
        const [minAmt, maxAmt] = amountRanges[category];
        const amount = Math.round(minAmt + Math.random() * (maxAmt - minAmt));

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

    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return transactions;
  }

  function getDefaultBudgets() {
    return {
      food: 8000, transport: 4000, shopping: 10000, bills: 6000,
      entertainment: 3000, health: 3000, education: 5000, other: 2000
    };
  }

  // ---- CRUD Operations (Local-First) ----

  function getUser() {
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  }

  function setUser(user) {
    const prevUser = getUser();
    const newUserUid = user?.uid;
    const prevUserUid = prevUser?.uid;

    // Only clear if transitioning from demo/guest to real, or between different real users
    if (newUserUid && (prevUserUid !== newUserUid)) {
      console.log('User switched. Clearing local datastore for new session.');
      clearAllData();
    }
    
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  function clearUser() {
    // We NO LONGER call clearAllData() here to prevent deleting unsynced data on logout
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  function getTransactions() {
    const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return stored ? JSON.parse(stored) : [];
  }

  function getTransactionsInRange(startDate, endDate) {
    const transactions = getTransactions();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return transactions.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });
  }

  function getTransaction(id) {
    return getTransactions().find(t => t.id === id) || null;
  }

  // Sync utilities
  function mapToSupabaseTransaction(tx) {
    const user = getUser();
    return {
      id: tx.id,
      user_id: user?.uid,
      amount: tx.amount,
      vendor: tx.vendor,
      category: tx.category,
      date: tx.date,
      notes: tx.notes || null,
      bill_image_url: tx.billImageUrl || null,
      ocr_raw_text: tx.ocrRawText || null,
      created_at: tx.createdAt || new Date().toISOString()
    };
  }
  
  function mapFromSupabaseTransaction(tx) {
    return {
      id: tx.id,
      amount: tx.amount,
      vendor: tx.vendor,
      category: tx.category,
      date: tx.date,
      notes: tx.notes,
      billImageUrl: tx.bill_image_url,
      ocrRawText: tx.ocr_raw_text,
      createdAt: tx.created_at
    };
  }

  async function syncLocalToCloud(tId, operation) {
    if (!supabaseClient) return;
    const user = getUser();
    if (!user || user.uid.startsWith('demo_user')) return;

    try {
      if (operation === 'DELETE') {
        await supabaseClient.from('transactions').delete().eq('id', tId);
      } else {
        const tx = getTransaction(tId);
        if (tx) {
          const dbTx = mapToSupabaseTransaction(tx);
          await supabaseClient.from('transactions').upsert(dbTx);
        }
      }
    } catch (e) {
      console.error('Supabase Sync Error:', e);
    }
  }

  async function fetchCloudData() {
    if (!supabaseClient) return;
    const user = getUser();
    if (!user || user.uid.startsWith('demo_user')) return;

    try {
      // Fetch latest transactions ONLY for this user
      const { data, error } = await supabaseClient.from('transactions')
        .select('*')
        .eq('user_id', user.uid)
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      // Fetch budgets ONLY for this user
      const { data: bData, error: bError } = await supabaseClient.from('budgets')
        .select('*')
        .eq('user_id', user.uid);
        
      console.log(`Cloud Data: Fetched ${data? data.length : 0} transactions, ${bData? bData.length : 0} budgets.`);
      
      if (data && data.length > 0) {
        const cloudTxs = data.map(mapFromSupabaseTransaction);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cloudTxs));
        notifyListeners('change', cloudTxs);
      }
      
      if (!bError && bData && bData.length > 0) {
        let b = getBudgets();
        bData.forEach(row => b[row.category] = row.amount);
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(b));
        notifyListeners('change', b);
      }
      
    } catch(e) {
      console.error('Initial fetch error:', e);
    }
  }

  function addTransaction(transaction) {
    const transactions = getTransactions();
    const newTx = {
      id: Utils.generateId(),
      ...transaction,
      createdAt: new Date().toISOString()
    };
    transactions.unshift(newTx);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    notifyListeners('transaction_added', newTx);
    
    // Background sync
    setTimeout(() => syncLocalToCloud(newTx.id, 'INSERT'), 0);
    return newTx;
  }

  function updateTransaction(id, updates) {
    const transactions = getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) return null;

    transactions[index] = { ...transactions[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    notifyListeners('transaction_updated', transactions[index]);
    
    setTimeout(() => syncLocalToCloud(id, 'UPDATE'), 0);
    return transactions[index];
  }

  function deleteTransaction(id) {
    let transactions = getTransactions();
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    notifyListeners('transaction_deleted', { id });
    
    setTimeout(() => syncLocalToCloud(id, 'DELETE'), 0);
    return true;
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

  async function setBudget(category, amount) {
    const budgets = getBudgets();
    budgets[category] = amount;
    setBudgets(budgets);
    
    if (supabaseClient) {
      const user = getUser();
      if (user && !user.uid.startsWith('demo_user')) {
        await supabaseClient.from('budgets').upsert({ user_id: user.uid, category, amount });
      }
    }
  }

  // ---- Settings ----
  function getSettings() {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : { currency: 'INR', notifications: true, budgetAlerts: true };
  }

  function updateSettings(updates) {
    const settings = { ...getSettings(), ...updates };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }

  const listeners = {};
  function onDataChange(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => { listeners[event] = listeners[event].filter(cb => cb !== callback); };
  }

  function notifyListeners(event, data) {
    if (listeners[event]) listeners[event].forEach(cb => cb(data));
    if (listeners['change'] && event !== 'change') listeners['change'].forEach(cb => cb({ event, data }));
  }

  function saveBillImage(transactionId, imageDataUrl) {
    try {
      localStorage.setItem(`css_bill_${transactionId}`, imageDataUrl);
      return `css_bill_${transactionId}`;
    } catch (e) {
      return null;
    }
  }

  function getBillImage(transactionId) {
    return localStorage.getItem(`css_bill_${transactionId}`);
  }

  function init() {
    const user = getUser();
    const isDemo = !user || user.uid.startsWith('demo_user');
    
    // Only generate demo data for demo users
    if (isDemo && !localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      generateDemoData();
    }
    if (!localStorage.getItem(STORAGE_KEYS.BUDGETS)) setBudgets(getDefaultBudgets());
    
    // Background cloud fetch on app start if user is logged in
    if (!isDemo) fetchCloudData();
  }

  function clearAllData() {
    // Remove transaction, budget, and settings data
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.BUDGETS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    
    // Remove bill images
    Object.keys(localStorage).forEach(key => { if (key.startsWith('css_bill_')) localStorage.removeItem(key); });
  }
  
  // ---- Supabase Auth Wrappers ----
  async function supabaseSignUp(email, password, displayName) {
    if (!supabaseClient) throw new Error("Supabase is not configured.");
    
    const { data, error } = await supabaseClient.auth.signUp({ 
      email, password,
      options: { 
        data: { full_name: displayName },
        emailRedirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  }
  
  async function supabaseLogin(email, password) {
    if (!supabaseClient) throw new Error("Supabase is not configured.");
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Update local user object
    if (data.user) {
      setUser({
        uid: data.user.id,
        email: data.user.email,
        displayName: data.user.user_metadata?.full_name || email.split('@')[0],
        photoURL: null
      });
      await fetchCloudData(); // Pull down their cloud data
    }
    return data;
  }
  
  async function supabaseLogout() {
    if (supabaseClient) await supabaseClient.auth.signOut();
  }

  async function supabaseGoogleLogin() {
    if (!supabaseClient) throw new Error("Supabase is not configured.");
    
    // Don't clear until we come back and confirm identity
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
    return data;
  }

  return {
    SUPABASE_URL,
    SUPABASE_KEY,
    get supabase() { return supabaseClient; },
    isSupabaseConfigured,
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
    generateDemoData,
    supabaseSignUp, supabaseLogin, supabaseLogout, supabaseGoogleLogin
  };
})();
