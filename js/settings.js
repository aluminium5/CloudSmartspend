// ========================================
// CloudSmartSpend — Settings Module
// Profile, budgets, currency, export
// ========================================

const Settings = (() => {

  function init() {
    updateCurrencyDisplay();
  }

  function updateCurrencyDisplay() {
    const el = document.getElementById('settings-currency');
    if (el) {
      const currency = Utils.getCurrency();
      const symbols = { INR: 'INR (₹)', USD: 'USD ($)', EUR: 'EUR (€)', GBP: 'GBP (£)' };
      el.textContent = symbols[currency] || currency;
    }
  }

  function showCurrencyModal() {
    const list = document.getElementById('currency-list');
    if (!list) return;

    const currencies = [
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' }
    ];

    const current = Utils.getCurrency();

    list.innerHTML = currencies.map(c => `
      <button class="settings-item" onclick="Settings.setCurrency('${c.code}')" style="${c.code === current ? 'background:var(--primary-light)' : ''}">
        <div class="settings-item-icon" style="background:var(--bg);font-size:1.25rem;font-weight:600">
          ${c.symbol}
        </div>
        <div class="settings-item-content">
          <div>${c.name}</div>
          <div class="settings-item-subtitle">${c.code}</div>
        </div>
        ${c.code === current ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="var(--primary)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : ''}
      </button>
    `).join('');

    App.openModal('modal-currency');
  }

  function setCurrency(code) {
    Utils.setCurrency(code);
    updateCurrencyDisplay();
    App.closeModal('modal-currency');

    // Re-render affected views
    if (typeof Dashboard !== 'undefined') Dashboard.render();
    if (typeof Transactions !== 'undefined') Transactions.render();
    if (typeof Analytics !== 'undefined') Analytics.render();

    Utils.showToast('Currency updated', 'success');
  }

  function showBudgetModal() {
    const form = document.getElementById('budget-form');
    if (!form) return;

    const budgets = DataStore.getBudgets();

    let html = '';
    Utils.CATEGORIES.forEach(cat => {
      const value = budgets[cat.id] || 0;
      html += `
        <div class="form-group">
          <label class="form-label">${cat.icon} ${cat.name}</label>
          <input type="number" class="form-input" id="budget-${cat.id}" value="${value}" min="0" step="100" placeholder="0">
        </div>
      `;
    });

    html += `
      <button type="submit" class="btn btn-primary btn-full mt-md" onclick="Settings.saveBudgets(event)">Save Budgets</button>
    `;

    form.innerHTML = html;
    App.openModal('modal-budget');
  }

  function saveBudgets(e) {
    e.preventDefault();
    const budgets = {};
    Utils.CATEGORIES.forEach(cat => {
      const input = document.getElementById(`budget-${cat.id}`);
      budgets[cat.id] = input ? parseInt(input.value) || 0 : 0;
    });

    DataStore.setBudgets(budgets);
    App.closeModal('modal-budget');

    // Re-render dashboard
    if (typeof Dashboard !== 'undefined') Dashboard.render();

    Utils.showToast('Budgets saved! 💰', 'success');
  }

  function exportData() {
    const transactions = DataStore.getTransactions();
    if (transactions.length === 0) {
      Utils.showToast('No transactions to export', 'warning');
      return;
    }
    Utils.exportToCSV(transactions);
  }

  function confirmClearData() {
    App.openModal('modal-confirm-clear');
  }

  function clearData() {
    DataStore.clearAllData();
    App.closeModal('modal-confirm-clear');

    // Re-initialize with fresh demo data
    DataStore.init();

    // Re-render all views
    if (typeof Dashboard !== 'undefined') Dashboard.render();
    if (typeof Transactions !== 'undefined') Transactions.render();
    if (typeof Analytics !== 'undefined') Analytics.render();

    Utils.showToast('All data cleared. Fresh demo data loaded.', 'info');
  }

  return {
    init,
    showCurrencyModal,
    setCurrency,
    showBudgetModal,
    saveBudgets,
    exportData,
    confirmClearData,
    clearData
  };
})();
