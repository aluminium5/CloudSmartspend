// ========================================
// CloudSmartSpend — Dashboard Module
// Power BI-style interactive charts
// ========================================

const Dashboard = (() => {
  let currentPeriod = 'month';
  let charts = {};

  // Theme-aware chart colors
  function chartColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      primary: dark ? '#818cf8' : '#5b5bf6',
      primaryFill: dark ? 'rgba(129, 140, 248, 0.15)' : 'rgba(91, 91, 246, 0.08)',
      grid: dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
      tick: dark ? '#94a3b8' : '#9CA3AF',
      tickDark: dark ? '#cbd5e1' : '#4B5563',
      tooltip: dark ? '#1e293b' : '#1F2937',
      legend: dark ? '#94a3b8' : '#6B7280',
      barInactive: dark ? 'rgba(129, 140, 248, 0.2)' : '#E0E7FF',
      pointBorder: dark ? '#1e293b' : '#fff',
    };
  }

  function init() {
    render();

    // Listen for data changes
    DataStore.onDataChange('change', () => {
      render();
    });
  }

  function setTimePeriod(period) {
    currentPeriod = period;

    // Update UI filter buttons
    document.querySelectorAll('#dashboard-time-filter .time-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === period);
    });

    render();
  }

  function render() {
    const range = Utils.getDateRange(currentPeriod);
    const transactions = DataStore.getTransactionsInRange(range.start, range.end);

    // Also get previous period for comparison
    const periodDays = Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(range.start);
    prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(range.start);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
    const prevTransactions = DataStore.getTransactionsInRange(prevStart, prevEnd);

    renderStatCards(transactions, prevTransactions, periodDays);
    renderSpendingTrend(transactions, range);
    renderCategoryBreakdown(transactions);
    renderTopExpenses(transactions);
    renderBudgetComparison(transactions);
  }

  function renderStatCards(transactions, prevTransactions, periodDays) {
    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const prevTotalSpent = prevTransactions.reduce((sum, t) => sum + t.amount, 0);
    const change = Utils.percentChange(totalSpent, prevTotalSpent);

    const actualDays = Math.max(1, periodDays);
    const avgDaily = Math.round(totalSpent / actualDays);

    const highest = transactions.length > 0
      ? transactions.reduce((max, t) => t.amount > max.amount ? t : max, transactions[0])
      : null;

    // Total Spent
    animateValue('stat-total-spent', Utils.formatCurrency(totalSpent));

    // Change indicator
    const changeEl = document.getElementById('stat-total-change');
    if (changeEl) {
      const isUp = change > 0;
      changeEl.className = `stat-card-change ${isUp ? 'up' : 'down'}`;
      changeEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" style="transform:${isUp ? '' : 'rotate(180deg)'}"><path d="M7 14l5-5 5 5z"/></svg>
        <span>${Math.abs(change)}% vs last period</span>
      `;
    }

    // Transaction count
    animateValue('stat-tx-count', transactions.length.toString());

    // Daily average
    animateValue('stat-avg-daily', Utils.formatCurrency(avgDaily));

    // Highest expense
    if (highest) {
      animateValue('stat-highest', Utils.formatCurrency(highest.amount));
      const vendorEl = document.getElementById('stat-highest-vendor');
      if (vendorEl) vendorEl.innerHTML = `<span>${highest.vendor}</span>`;
    }
  }

  function animateValue(elementId, targetText) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.textContent = targetText;
    el.style.animation = 'countUp 0.4s ease both';
  }

  function renderSpendingTrend(transactions, range) {
    const canvas = document.getElementById('chart-spending-trend');
    if (!canvas) return;
    const cc = chartColors();

    // Group by day
    const dailySpend = {};
    const current = new Date(range.start);
    while (current <= range.end) {
      const key = Utils.formatDate(current, 'input');
      dailySpend[key] = 0;
      current.setDate(current.getDate() + 1);
    }

    transactions.forEach(t => {
      const key = Utils.formatDate(t.date, 'input');
      if (dailySpend[key] !== undefined) {
        dailySpend[key] += t.amount;
      }
    });

    const labels = Object.keys(dailySpend).map(d => {
      const date = new Date(d);
      return `${date.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][date.getMonth()]}`;
    });
    const data = Object.values(dailySpend);

    if (charts.trend) charts.trend.destroy();

    charts.trend = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily Spending',
          data,
          borderColor: cc.primary,
          backgroundColor: cc.primaryFill,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: cc.primary,
          pointHoverBorderColor: cc.pointBorder,
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cc.tooltip,
            titleColor: '#fff',
            bodyColor: '#D1D5DB',
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => Utils.formatCurrency(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: cc.tick,
              maxTicksLimit: 7
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: cc.grid },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: cc.tick,
              callback: (val) => Utils.formatCurrency(val)
            }
          }
        }
      }
    });
  }

  function renderCategoryBreakdown(transactions) {
    const canvas = document.getElementById('chart-category-breakdown');
    if (!canvas) return;
    const cc = chartColors();

    const groups = Utils.groupByCategory(transactions);
    const categories = Object.keys(groups).sort((a, b) => groups[b].total - groups[a].total);
    const labels = categories.map(c => Utils.getCategoryById(c).name);
    const data = categories.map(c => groups[c].total);
    const colors = categories.map(c => Utils.getCategoryColor(c));

    if (charts.category) charts.category.destroy();

    charts.category = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 8,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              font: { size: 11, family: 'Inter' },
              color: cc.legend
            }
          },
          tooltip: {
            backgroundColor: cc.tooltip,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                return ` ${ctx.label}: ${Utils.formatCurrency(ctx.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderTopExpenses(transactions) {
    const canvas = document.getElementById('chart-top-expenses');
    if (!canvas) return;
    const cc = chartColors();

    const sorted = [...transactions].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const labels = sorted.map(t => t.vendor.length > 18 ? t.vendor.substring(0, 18) + '...' : t.vendor);
    const data = sorted.map(t => t.amount);
    const colors = sorted.map(t => Utils.getCategoryColor(t.category));

    if (charts.topExpenses) charts.topExpenses.destroy();

    charts.topExpenses = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.map(c => c + '33'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cc.tooltip,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => Utils.formatCurrency(ctx.parsed.x)
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: cc.grid },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: cc.tick,
              callback: (val) => Utils.formatCurrency(val)
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: cc.tickDark
            }
          }
        }
      }
    });
  }

  function renderBudgetComparison(transactions) {
    const container = document.getElementById('budget-list');
    if (!container) return;

    const budgets = DataStore.getBudgets();
    const categorySpend = Utils.groupByCategory(transactions);

    let html = '';
    Utils.CATEGORIES.forEach(cat => {
      const budget = budgets[cat.id] || 0;
      if (budget === 0) return;

      const spent = categorySpend[cat.id]?.total || 0;
      const percentage = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 150) : 0;
      const barWidth = Math.min(percentage, 100);
      const status = percentage > 100 ? 'over' : percentage > 80 ? 'warn' : 'safe';

      html += `
        <div class="budget-item">
          <div class="budget-item-header">
            <div class="budget-item-name">
              <div class="category-dot" style="background:${cat.color}"></div>
              ${cat.name}
            </div>
            <div class="budget-item-amounts">
              ${Utils.formatCurrency(spent)} / ${Utils.formatCurrency(budget)}
            </div>
          </div>
          <div class="budget-bar">
            <div class="budget-bar-fill ${status}" style="width:${barWidth}%"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html || '<p class="text-secondary text-sm text-center p-md">No budgets set. Go to Settings to add budgets.</p>';
  }

  return {
    init,
    setTimePeriod,
    render
  };
})();
