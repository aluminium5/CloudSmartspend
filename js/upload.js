// ========================================
// CloudSmartSpend — Upload & OCR Module
// Bill scanning with Tesseract.js
// ========================================

const Upload = (() => {
  let currentBillImage = null;
  let tesseractLoaded = false;

  function init() {
    setupEventListeners();
  }

  function setupEventListeners() {
    const fileInput = document.getElementById('bill-file-input');
    const uploadZone = document.getElementById('upload-zone');
    const extractedForm = document.getElementById('extracted-form');
    const manualForm = document.getElementById('manual-form');

    if (fileInput) {
      fileInput.addEventListener('change', handleFileSelect);
    }

    if (uploadZone) {
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      });
      uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
      });
      uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          processFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (extractedForm) {
      extractedForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveExtractedTransaction();
      });
    }

    if (manualForm) {
      manualForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveManualTransaction();
      });
    }

    // Set default date to today for manual form
    const manualDate = document.getElementById('manual-date');
    if (manualDate) {
      manualDate.value = Utils.formatDate(new Date(), 'input');
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  }

  function processFile(file) {
    if (!file.type.startsWith('image/')) {
      Utils.showToast('Please select an image file', 'warning');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      Utils.showToast('Image too large. Max 10MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      currentBillImage = e.target.result;
      showPreview(currentBillImage);
      runOCR(currentBillImage);
    };
    reader.readAsDataURL(file);
  }

  function showPreview(imageDataUrl) {
    const preview = document.getElementById('upload-preview');
    const previewImage = document.getElementById('preview-image');
    const uploadZone = document.getElementById('upload-zone');

    if (previewImage) previewImage.src = imageDataUrl;
    if (preview) preview.classList.add('active');
    if (uploadZone) uploadZone.style.display = 'none';

    // Hide manual entry if visible
    const manualForm = document.getElementById('manual-entry-form');
    const manualBtn = document.getElementById('manual-entry-btn');
    if (manualForm) manualForm.classList.remove('active');
    if (manualBtn) manualBtn.style.display = 'none';
  }

  async function runOCR(imageDataUrl) {
    const statusEl = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text');
    const progressBar = document.getElementById('ocr-progress-bar');
    const extractedForm = document.getElementById('extracted-form');

    if (!statusEl || !statusText || !progressBar) return;

    // Show OCR status
    statusEl.style.display = 'flex';
    statusEl.className = 'ocr-status';
    statusText.textContent = 'Loading OCR engine...';
    progressBar.style.width = '5%';

    if (extractedForm) extractedForm.style.display = 'none';

    try {
      // Dynamically load Tesseract.js if not loaded
      if (typeof Tesseract === 'undefined') {
        statusText.textContent = 'Loading OCR library...';
        progressBar.style.width = '10%';

        await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      }

      statusText.textContent = 'Scanning bill...';
      progressBar.style.width = '20%';

      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(20 + (m.progress * 70));
            progressBar.style.width = pct + '%';
            statusText.textContent = `Scanning... ${Math.round(m.progress * 100)}%`;
          }
        }
      });

      progressBar.style.width = '100%';
      statusText.textContent = 'Scan complete! ✓';
      statusEl.className = 'ocr-status success';

      // Hide spinner
      const spinner = statusEl.querySelector('.ocr-spinner');
      if (spinner) spinner.style.display = 'none';

      // Parse extracted text
      const text = result.data.text;
      populateExtractedData(text);

    } catch (error) {
      console.error('OCR Error:', error);
      statusText.textContent = 'Scan failed. Please enter details manually.';
      statusEl.className = 'ocr-status error';

      const spinner = statusEl.querySelector('.ocr-spinner');
      if (spinner) spinner.style.display = 'none';

      // Show empty form
      if (extractedForm) {
        extractedForm.style.display = 'flex';
        document.getElementById('extract-date').value = Utils.formatDate(new Date(), 'input');
      }
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function populateExtractedData(ocrText) {
    const form = document.getElementById('extracted-form');
    if (!form) return;

    // Parse OCR text
    const amount = Utils.parseAmountFromText(ocrText);
    const date = Utils.parseDateFromText(ocrText);
    const vendor = Utils.parseVendorFromText(ocrText);

    // Populate form
    document.getElementById('extract-amount').value = amount || '';
    document.getElementById('extract-date').value = date ? Utils.formatDate(date, 'input') : Utils.formatDate(new Date(), 'input');
    document.getElementById('extract-vendor').value = vendor || '';
    document.getElementById('extract-category').value = '';

    // Show the form
    form.style.display = 'flex';
    form.style.animation = 'slideUp 0.4s ease both';

    // Store raw OCR text
    form.dataset.ocrText = ocrText;

    if (amount) {
      Utils.showToast(`Detected amount: ${Utils.formatCurrency(amount)}`, 'success');
    }
  }

  function saveExtractedTransaction() {
    const amount = parseFloat(document.getElementById('extract-amount').value);
    const date = document.getElementById('extract-date').value;
    const vendor = document.getElementById('extract-vendor').value.trim();
    const category = document.getElementById('extract-category').value;
    const notes = document.getElementById('extract-notes').value.trim();
    const ocrText = document.getElementById('extracted-form').dataset.ocrText || '';

    if (!amount || amount <= 0) {
      Utils.showToast('Please enter a valid amount', 'warning');
      return;
    }

    if (!vendor) {
      Utils.showToast('Please enter a vendor name', 'warning');
      return;
    }

    if (!category) {
      Utils.showToast('Please select a category', 'warning');
      return;
    }

    const transaction = {
      amount,
      vendor,
      category,
      date: new Date(date).toISOString(),
      notes,
      ocrRawText: ocrText,
      billImageUrl: null
    };

    // Save bill image
    const savedTx = DataStore.addTransaction(transaction);
    if (currentBillImage && savedTx) {
      DataStore.saveBillImage(savedTx.id, currentBillImage);
    }

    Utils.showToast('Transaction saved! 🎉', 'success');
    reset();

    // Navigate to dashboard
    setTimeout(() => App.navigate('dashboard'), 300);
  }

  function saveManualTransaction() {
    const amount = parseFloat(document.getElementById('manual-amount').value);
    const date = document.getElementById('manual-date').value;
    const vendor = document.getElementById('manual-vendor').value.trim();
    const category = document.getElementById('manual-category').value;
    const notes = document.getElementById('manual-notes').value.trim();

    if (!amount || amount <= 0) {
      Utils.showToast('Please enter a valid amount', 'warning');
      return;
    }

    if (!vendor) {
      Utils.showToast('Please enter a vendor name', 'warning');
      return;
    }

    if (!category) {
      Utils.showToast('Please select a category', 'warning');
      return;
    }

    DataStore.addTransaction({
      amount,
      vendor,
      category,
      date: new Date(date).toISOString(),
      notes,
      billImageUrl: null,
      ocrRawText: null
    });

    Utils.showToast('Transaction added! 🎉', 'success');

    // Reset manual form
    document.getElementById('manual-form').reset();
    document.getElementById('manual-date').value = Utils.formatDate(new Date(), 'input');

    // Navigate to dashboard
    setTimeout(() => App.navigate('dashboard'), 300);
  }

  function reset() {
    currentBillImage = null;

    const preview = document.getElementById('upload-preview');
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('bill-file-input');
    const extractedForm = document.getElementById('extracted-form');
    const statusEl = document.getElementById('ocr-status');
    const manualBtn = document.getElementById('manual-entry-btn');

    if (preview) preview.classList.remove('active');
    if (uploadZone) uploadZone.style.display = '';
    if (fileInput) fileInput.value = '';
    if (extractedForm) {
      extractedForm.style.display = 'none';
      extractedForm.reset();
    }
    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.className = 'ocr-status';
      const spinner = statusEl.querySelector('.ocr-spinner');
      if (spinner) spinner.style.display = '';
    }
    if (manualBtn) manualBtn.style.display = '';
  }

  function toggleManualEntry() {
    const form = document.getElementById('manual-entry-form');
    if (!form) return;

    const isActive = form.classList.contains('active');
    form.classList.toggle('active');

    if (!isActive) {
      document.getElementById('manual-date').value = Utils.formatDate(new Date(), 'input');
    }
  }

  return {
    init,
    reset,
    toggleManualEntry
  };
})();
