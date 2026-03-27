// ========================================
// CloudSmartSpend — Transactions Module
// List, search, filter, detail view
// ========================================

const Transactions = (() => {
  let currentFilter = 'all';
  let currentSearch = '';
  let currentDetailId = null;

  function init() {
    setupEventListeners();
    render();

    DataStore.onDataChange('change', () => {
      render();
    });
  }

  function setupEventListeners() {
    const searchInput = document.getElementById('transaction-search');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        currentSearch = e.target.value.trim().toLowerCase();
        render();
      }, 250));
    }
  }

  function filterByCategory(category) {
    currentFilter = category;

    // Update filter chip UI
    document.querySelectorAll('#filter-chips .filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === category);
    });

    render();
  }

  function render() {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    let transactions = DataStore.getTransactions();

    // Apply category filter
    if (currentFilter !== 'all') {
      transactions = transactions.filter(t => t.category === currentFilter);
    }

    // Apply search
    if (currentSearch) {
      transactions = transactions.filter(t =>
        (t.vendor && t.vendor.toLowerCase().includes(currentSearch)) ||
        (t.amount && t.amount.toString().includes(currentSearch)) ||
        (t.notes && t.notes.toLowerCase().includes(currentSearch))
      );
    }

    // Update summary
    const summaryEl = document.getElementById('transactions-summary');
    if (summaryEl) {
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      summaryEl.textContent = `${transactions.length} transactions • ${Utils.formatCurrency(total)} total`;
    }

    if (transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24"><path d="M19 5H5c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 12H5V7h14v10z"/></svg>
          </div>
          <h3>No transactions found</h3>
          <p>${currentSearch ? 'Try a different search term' : 'Upload a bill or add an expense to get started'}</p>
        </div>
      `;
      return;
    }

    // Group by date
    const groups = Utils.groupByDate(transactions);
    let html = '';

    groups.forEach(group => {
      html += `<div class="transaction-date-group">`;
      html += `<div class="transaction-date-label">${group.label}</div>`;

      group.items.forEach(tx => {
        const cat = Utils.getCategoryById(tx.category);
        html += `
          <div class="transaction-item" onclick="Transactions.showDetail('${tx.id}')">
            <div class="transaction-icon" style="background:${cat.color}11">
              <span>${cat.icon}</span>
            </div>
            <div class="transaction-details">
              <div class="transaction-vendor">${escapeHtml(tx.vendor)}</div>
              <div class="transaction-category">${cat.name}</div>
            </div>
            <div class="transaction-right">
              <div class="transaction-amount">-${Utils.formatCurrency(tx.amount)}</div>
              <div class="transaction-time">${Utils.formatDate(tx.date, 'time')}</div>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    container.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showDetail(id) {
    currentDetailId = id;
    const tx = DataStore.getTransaction(id);
    if (!tx) return;

    const cat = Utils.getCategoryById(tx.category);
    const content = document.getElementById('modal-detail-content');
    const title = document.getElementById('modal-detail-title');

    if (title) title.textContent = tx.vendor;

    // Check for bill image
    const billImage = DataStore.getBillImage(id);

    let html = '';

    if (billImage) {
      html += `<img class="detail-bill-image" src="${billImage}" alt="Bill image">`;
    }

    html += `
      <div style="text-align:center;margin-bottom:var(--space-lg)">
        <span style="font-size:2rem">${cat.icon}</span>
        <div class="amount-large" style="margin-top:var(--space-sm)">-${Utils.formatCurrency(tx.amount)}</div>
        <div class="category-badge ${tx.category}" style="margin-top:var(--space-sm)">${cat.name}</div>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Date</span>
        <span class="detail-field-value">${Utils.formatDate(tx.date, 'long')}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Time</span>
        <span class="detail-field-value">${Utils.formatDate(tx.date, 'time')}</span>
      </div>
      <div class="detail-field">
        <span class="detail-field-label">Category</span>
        <span class="detail-field-value">${cat.name}</span>
      </div>
    `;

    if (tx.notes) {
      html += `
        <div class="detail-field">
          <span class="detail-field-label">Notes</span>
          <span class="detail-field-value">${escapeHtml(tx.notes)}</span>
        </div>
      `;
    }

    if (tx.ocrRawText) {
      html += `
        <details style="margin-top:var(--space-md)">
          <summary style="font-size:0.8125rem;color:var(--text-secondary);cursor:pointer">View OCR Text</summary>
          <pre style="font-size:0.75rem;color:var(--text-tertiary);white-space:pre-wrap;margin-top:var(--space-sm);padding:var(--space-sm);background:var(--bg);border-radius:var(--radius-sm)">${escapeHtml(tx.ocrRawText)}</pre>
        </details>
      `;
    }

    if (content) content.innerHTML = html;

    App.openModal('modal-transaction-detail');
  }

  function deleteCurrentTransaction() {
    if (!currentDetailId) return;

    DataStore.deleteTransaction(currentDetailId);
    App.closeModal('modal-transaction-detail');
    Utils.showToast('Transaction deleted', 'info');
    currentDetailId = null;
  }

  return {
    init,
    filterByCategory,
    render,
    showDetail,
    deleteCurrentTransaction
  };
})();
