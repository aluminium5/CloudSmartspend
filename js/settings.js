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

  function showEditProfile() {
    const user = DataStore.getUser();
    if (!user) return;

    const nameInput = document.getElementById('edit-name');
    const preview = document.getElementById('edit-avatar-preview');
    
    if (nameInput) nameInput.value = user.displayName || '';
    if (preview) {
      if (user.photoURL) {
        preview.innerHTML = `<img src="${user.photoURL}" alt="Profile">`;
      } else {
        preview.textContent = (user.displayName || user.email || '?').charAt(0).toUpperCase();
        preview.innerHTML = preview.textContent;
      }
    }

    App.openModal('modal-edit-profile');
  }

  function handleProfilePic(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Compress and resize image using canvas
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 120; // 120x120 for avatar
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const preview = document.getElementById('edit-avatar-preview');
        if (preview) {
          preview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
          preview.setAttribute('data-new-photo', dataUrl);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function saveProfile() {
    const nameInput = document.getElementById('edit-name');
    const preview = document.getElementById('edit-avatar-preview');
    
    const displayName = nameInput ? nameInput.value.trim() : '';
    const photoURL = preview ? preview.getAttribute('data-new-photo') : null;

    if (!displayName) {
      Utils.showToast('Name cannot be empty', 'error');
      return;
    }

    try {
      Utils.showToast('Updating profile...', 'info');
      
      const updates = { displayName };
      if (photoURL) updates.photoURL = photoURL;

      await DataStore.updateUserProfile(updates);
      
      App.closeModal('modal-edit-profile');
      Utils.showToast('Profile updated! ✨', 'success');
      
      // Update UI immediately
      if (typeof Auth !== 'undefined') Auth.updateUserUI(DataStore.getUser());
      
    } catch (e) {
      console.error(e);
      Utils.showToast('Failed to update profile', 'error');
    }
  }

  return {
    init,
    showCurrencyModal,
    setCurrency,
    showBudgetModal,
    saveBudgets,
    exportData,
    confirmClearData,
    clearData,
    showEditProfile,
    handleProfilePic,
    saveProfile
  };
})();
