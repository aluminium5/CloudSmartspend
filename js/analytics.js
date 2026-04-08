// ========================================
// CloudSmartSpend — Analytics Module
// Deep spending insights and predictions
// ========================================

const Analytics = (() => {
  let charts = {};

  // Theme-aware chart colors
  function chartColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      primary: dark ? '#818cf8' : '#5b5bf6',
      primaryFill: dark ? 'rgba(129, 140, 248, 0.12)' : 'rgba(91, 91, 246, 0.05)',
      grid: dark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
      tick: dark ? '#94a3b8' : '#9CA3AF',
      tooltip: dark ? '#1e293b' : '#1F2937',
      legend: dark ? '#94a3b8' : '#6B7280',
      barInactive: dark ? 'rgba(129, 140, 248, 0.2)' : '#E0E7FF',
      predicted: dark ? '#a5b4fc' : '#A5B4FC',
      pointBorder: dark ? '#1e293b' : '#fff',
    };
  }

  function init() {
    render();

    DataStore.onDataChange('change', () => {
      render();
    });
  }

  function render() {
    renderSummaryStats();
    renderMonthlyComparison();
    renderCategoryTrends();
    renderHeatmap();
    renderPrediction();
  }

  function renderSummaryStats() {
    const allTx = DataStore.getTransactions();
    if (allTx.length === 0) return;

    // Monthly average (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentTx = allTx.filter(t => new Date(t.date) >= threeMonthsAgo);
    const totalRecent = recentTx.reduce((sum, t) => sum + t.amount, 0);
    const monthlyAvg = Math.round(totalRecent / 3);

    // Daily average (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30 = allTx.filter(t => new Date(t.date) >= thirtyDaysAgo);
    const total30 = last30.reduce((sum, t) => sum + t.amount, 0);
    const dailyAvg = Math.round(total30 / 30);

    const monthlyEl = document.getElementById('analytics-monthly-avg');
    const dailyEl = document.getElementById('analytics-daily-avg');
    const totalEl = document.getElementById('analytics-total-tx');

    if (monthlyEl) monthlyEl.textContent = Utils.formatCurrency(monthlyAvg);
    if (dailyEl) dailyEl.textContent = Utils.formatCurrency(dailyAvg);
    if (totalEl) totalEl.textContent = allTx.length;
  }

  function renderMonthlyComparison() {
    const canvas = document.getElementById('chart-monthly-comparison');
    if (!canvas) return;
    const cc = chartColors();

    const allTx = DataStore.getTransactions();

    // Group by month (last 6 months)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: Utils.formatDate(d, 'month'),
        year: d.getFullYear(),
        month: d.getMonth(),
        total: 0
      });
    }

    allTx.forEach(t => {
      const d = new Date(t.date);
      const month = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
      if (month) month.total += t.amount;
    });

    if (charts.monthly) charts.monthly.destroy();

    charts.monthly = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [{
          label: 'Monthly Spending',
          data: months.map(m => m.total),
          backgroundColor: months.map((m, i) =>
            i === months.length - 1 ? cc.primary : cc.barInactive
          ),
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: cc.tooltip,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => Utils.formatCurrency(ctx.parsed.y)
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: 'Inter' }, color: cc.tick }
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

  function renderCategoryTrends() {
    const canvas = document.getElementById('chart-category-trends');
    if (!canvas) return;
    const cc = chartColors();

    const allTx = DataStore.getTransactions();

    // Last 3 months, grouped by month and category
    const months = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: Utils.formatDate(d, 'month'),
        year: d.getFullYear(),
        month: d.getMonth()
      });
    }

    // Get top 5 categories
    const catTotals = {};
    allTx.forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const topCats = Object.entries(catTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const datasets = topCats.map(catId => {
      const cat = Utils.getCategoryById(catId);
      const data = months.map(m => {
        return allTx
          .filter(t => {
            const d = new Date(t.date);
            return t.category === catId && d.getFullYear() === m.year && d.getMonth() === m.month;
          })
          .reduce((sum, t) => sum + t.amount, 0);
      });

      return {
        label: cat.name,
        data,
        borderColor: cat.color,
        backgroundColor: cat.color + '18',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: cat.color,
        pointBorderColor: cc.pointBorder,
        pointBorderWidth: 2
      };
    });

    if (charts.catTrends) charts.catTrends.destroy();

    charts.catTrends = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        interaction: {
          mode: 'index',
          intersect: false
        },
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
              label: (ctx) => ` ${ctx.dataset.label}: ${Utils.formatCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11, family: 'Inter' }, color: cc.tick }
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

  function renderHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;

    const allTx = DataStore.getTransactions();
    const dailyTotals = {};

    // Calculate daily spend for last 35 days
    const now = new Date();
    for (let i = 34; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = Utils.formatDate(d, 'input');
      dailyTotals[key] = 0;
    }

    allTx.forEach(t => {
      const key = Utils.formatDate(t.date, 'input');
      if (dailyTotals[key] !== undefined) {
        dailyTotals[key] += t.amount;
      }
    });

    const values = Object.values(dailyTotals);
    const maxSpend = Math.max(...values, 1);

    // Determine starting day offset
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 34);
    const startDay = startDate.getDay();

    // Add empty cells for offset
    let html = '';
    for (let i = 0; i < startDay; i++) {
      html += '<div style="aspect-ratio:1"></div>';
    }

    Object.entries(dailyTotals).forEach(([dateKey, amount]) => {
      const level = amount === 0 ? 0 : Math.min(5, Math.ceil((amount / maxSpend) * 5));
      const d = new Date(dateKey);
      const tooltip = `${Utils.formatDate(d, 'short')}: ${Utils.formatCurrency(amount)}`;
      html += `<div class="heatmap-cell level-${level}" title="${tooltip}"></div>`;
    });

    grid.innerHTML = html;
  }

  function renderPrediction() {
    const canvas = document.getElementById('chart-prediction');
    if (!canvas) return;
    const cc = chartColors();

    const allTx = DataStore.getTransactions();

    // Daily spend for last 45 days
    const dailyData = [];
    const labels = [];
    const now = new Date();

    for (let i = 44; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = Utils.formatDate(d, 'input');
      const dayTotal = allTx
        .filter(t => Utils.formatDate(t.date, 'input') === key)
        .reduce((sum, t) => sum + t.amount, 0);
      dailyData.push(dayTotal);
      labels.push(`${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`);
    }

    // Simple moving average for prediction (extending 15 days)
    const ma = Utils.movingAverage(dailyData, 7);
    const lastMA = ma[ma.length - 1];

    // Extend predictions
    const predictedLabels = [...labels];
    const predictedData = [...dailyData];
    const predictionLine = new Array(dailyData.length).fill(null);

    // Start prediction from last actual day
    predictionLine[predictionLine.length - 1] = lastMA;

    for (let i = 1; i <= 15; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      predictedLabels.push(`${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`);
      predictedData.push(null);

      // Add some variance to prediction
      const variance = (Math.random() - 0.5) * lastMA * 0.3;
      predictionLine.push(Math.max(0, Math.round(lastMA + variance)));
    }

    if (charts.prediction) charts.prediction.destroy();

    charts.prediction = new Chart(canvas, {
      type: 'line',
      data: {
        labels: predictedLabels,
        datasets: [
          {
            label: 'Actual Spending',
            data: predictedData,
            borderColor: cc.primary,
            backgroundColor: cc.primaryFill,
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5
          },
          {
            label: 'Predicted',
            data: predictionLine,
            borderColor: cc.predicted,
            borderWidth: 2,
            borderDash: [6, 4],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2,
        interaction: {
          mode: 'index',
          intersect: false
        },
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
                if (ctx.parsed.y === null) return '';
                return ` ${ctx.dataset.label}: ${Utils.formatCurrency(ctx.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11, family: 'Inter' },
              color: cc.tick,
              maxTicksLimit: 8
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

  return {
    init,
    render
  };
})();
