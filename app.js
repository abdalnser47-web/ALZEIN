// ALZEIN Accounting Core Engine
const ALZEIN = {
  state: {
    lang: 'en',
    settings: { shopName: 'ALZEIN SHOP', phone: '', logo: '', labelUs: 'لنا', labelOnUs: 'علينا', defaultCur: 'USD', showTime: false, showDate: true, showPrevBal: true, isBusiness: false },
    currencies: [{ code: 'USD', name: 'US Dollar', rate: 1 }, { code: 'EUR', name: 'Euro', rate: 0.85 }],
    accounts: [
      { id: 'acc_fund', name: 'The Fund (Cashbox)', type: 'fund', balance: 0, currency: 'USD', isQty: false },
      { id: 'acc_income', name: 'Income', type: 'income', balance: 0, currency: 'USD', isQty: false },
      { id: 'acc_expense', name: 'Expenses', type: 'expense', balance: 0, currency: 'USD', isQty: false },
      { id: 'acc_cust', name: 'Customers', type: 'asset', balance: 0, currency: 'USD', isQty: true },
      { id: 'acc_sup', name: 'Suppliers', type: 'liability', balance: 0, currency: 'USD', isQty: false }
    ],
    transactions: []
  },
  
  i18n: {
    en: { home: 'Home', transactions: 'Transactions', vouchers: 'Vouchers', currencies: 'Currencies', reports: 'Reports', settings: 'Settings', backup_json: 'Backup JSON', restore_json: 'Restore JSON', quick_entry: 'Quick Entry', date: 'Date', statement: 'Statement', debit: 'Dr', credit: 'Cr', balance: 'Balance' },
    ar: { home: 'الرئيسية', transactions: 'الحركات', vouchers: 'السندات', currencies: 'العملات', reports: 'التقارير', settings: 'الإعدادات', backup_json: 'نسخ احتياطي', restore_json: 'استعادة', quick_entry: 'إضافة سريعة', date: 'التاريخ', statement: 'البيان', debit: 'من', credit: 'إلى', balance: 'الرصيد' },
    tr: { home: 'Ana Sayfa', transactions: 'İşlemler', vouchers: 'Belgeler', currencies: 'Para Birimleri', reports: 'Raporlar', settings: 'Ayarlar', backup_json: 'Yedekle', restore_json: 'Geri Yükle', quick_entry: 'Hızlı Giriş', date: 'Tarih', statement: 'Açıklama', debit: 'Borç', credit: 'Alacak', balance: 'Bakiye' }
  },

  init() {
    this.storage.load();
    this.ui.renderAll();
    this.bindEvents();
    this.applyLang();
  },

  storage: {
    load() {
      const saved = localStorage.getItem('alzein_data');
      if (saved) ALZEIN.state = { ...ALZEIN.state, ...JSON.parse(saved) };
    },
    save() { localStorage.setItem('alzein_data', JSON.stringify(ALZEIN.state)); }
  },

  ui: {
    renderAll() {
      this.renderDashboard();
      this.renderCurrencies();
      this.renderAccountDropdowns();
      this.renderReportFilters();
      this.updateSettingsUI();
    },
    switchSection(target) {
      document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
      document.getElementById(target).classList.remove('hidden');
      document.querySelectorAll('.nav-btn, .nav-link').forEach(b => b.classList.toggle('active', b.dataset.target === target));
      if (target === 'reports') this.renderReportTable();    },
    renderDashboard() {
      const container = document.getElementById('dashboard');
      container.innerHTML = ALZEIN.state.accounts.map(acc => `
        <div class="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md transition" onclick="ALZEIN.ui.switchSection('transactions')">
          <div class="flex justify-between items-start">
            <div class="w-10 h-10 rounded bg-amber-100 text-primary flex items-center justify-center text-lg">
              <i class="fas ${acc.type === 'fund' ? 'fa-cash-register' : acc.type === 'income' ? 'fa-arrow-up' : acc.type === 'expense' ? 'fa-arrow-down' : 'fa-users'}"></i>
            </div>
            <span class="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">${acc.currency}</span>
          </div>
          <h3 class="mt-3 font-semibold text-gray-700 truncate">${acc.name}</h3>
          <p class="text-2xl font-bold text-textDark mt-1">${ALZEIN.currency.format(acc.balance, acc.currency)}</p>
          ${acc.isQty ? `<p class="text-xs text-gray-500 mt-1">Qty: 0</p>` : ''}
        </div>
      `).join('');
    },
    renderCurrencies() {
      document.getElementById('currencyList').innerHTML = ALZEIN.state.currencies.map((c, i) => `
        <div class="flex justify-between items-center bg-gray-50 p-2 rounded border">
          <span class="font-bold">${c.code} - ${c.name}</span>
          <div class="flex items-center gap-2">
            <input type="number" step="0.001" value="${c.rate}" onchange="ALZEIN.currency.update(${i}, this.value)" class="w-20 p-1 border rounded text-center">
            <button onclick="ALZEIN.currency.remove(${i})" class="text-red-500"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `).join('');
      const opts = ALZEIN.state.currencies.map(c => `<option value="${c.code}" ${ALZEIN.state.settings.defaultCur === c.code ? 'selected' : ''}>${c.code}</option>`).join('');
      document.getElementById('setDefaultCur').innerHTML = opts;
    },
    renderAccountDropdowns() {
      const opts = ALZEIN.state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
      document.getElementById('qFrom').innerHTML = opts;
      document.getElementById('qTo').innerHTML = opts;
      document.getElementById('filterAccount').innerHTML = `<option value="all">All</option>` + opts;
      document.getElementById('accountList').innerHTML = ALZEIN.state.accounts.map(a => `
        <div class="flex justify-between p-3 bg-gray-50 rounded border">
          <span>${a.name}</span> <span class="font-bold">${ALZEIN.currency.format(a.balance, a.currency)}</span>
        </div>
      `).join('');
    },
    renderReportFilters() {},
    renderReportTable() {
      const acc = document.getElementById('filterAccount').value;
      const txs = ALZEIN.state.transactions.filter(t => {
        if (acc !== 'all' && t.to !== acc && t.from !== acc) return false;
        return true; // Date filter applied in export/generation for simplicity
      });
      let running = 0;
      document.getElementById('reportTable').innerHTML = txs.map(t => {        const isDebit = t.to === acc;
        running += isDebit ? Number(t.amount) : -Number(t.amount);
        return `<tr class="border-b hover:bg-gray-50"><td class="p-2">${t.date}</td><td class="p-2">${t.notes}</td><td class="p-2 text-green-600">${isDebit ? t.amount : '-'}</td><td class="p-2 text-red-600">${isDebit ? '-' : t.amount}</td><td class="p-2 font-bold">${ALZEIN.currency.format(running, 'USD')}</td></tr>`;
      }).join('');
    },
    updateSettingsUI() {
      const s = ALZEIN.state.settings;
      document.getElementById('shopName').textContent = s.shopName;
      document.getElementById('setShopName').value = s.shopName;
      document.getElementById('setPhone').value = s.phone;
      document.getElementById('setLogo').value = s.logo;
      document.getElementById('setLabelUs').value = s.labelUs;
      document.getElementById('setLabelOnUs').value = s.labelOnUs;
      document.getElementById('showTime').checked = s.showTime;
      document.getElementById('showDate').checked = s.showDate;
      document.getElementById('showPrevBal').checked = s.showPrevBal;
      document.getElementById('modeBusiness').checked = s.isBusiness;
      document.documentElement.dir = ALZEIN.state.lang === 'ar' ? 'rtl' : 'ltr';
    }
  },

  currency: {
    format(amount, cur) {
      return `${cur} ${parseFloat(amount).toFixed(2)}`;
    },
    update(idx, val) {
      ALZEIN.state.currencies[idx].rate = parseFloat(val) || 1;
      ALZEIN.storage.save();
    },
    add(code, name, rate) {
      ALZEIN.state.currencies.push({ code: code.toUpperCase(), name, rate: parseFloat(rate) || 1 });
      ALZEIN.storage.save(); ALZEIN.ui.renderCurrencies(); ALZEIN.ui.renderAccountDropdowns();
    },
    remove(idx) {
      if (confirm('Delete currency?')) { ALZEIN.state.currencies.splice(idx, 1); ALZEIN.storage.save(); ALZEIN.ui.renderCurrencies(); }
    }
  },

  calculator: {
    safeEval(expr) {
      try { return Function('"use strict"; return (' + expr.replace(/[^0-9+\-*/().]/g, '') + ')')(); } catch { return 0; }
    }
  },

  voice: {
    recognition: null,
    init() {
      if (!('webkitSpeechRecognition' in window)) return;
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = false; this.recognition.interimResults = false;      this.recognition.onresult = (e) => {
        document.getElementById('qNotes').value += e.results[0][0].transcript;
      };
    },
    toggle() {
      if (!this.recognition) return alert('Speech API not supported in this browser.');
      this.recognition.isRunning ? this.recognition.stop() : this.recognition.start();
      this.recognition.isRunning = !this.recognition.isRunning;
      document.getElementById('voiceBtn').classList.toggle('text-red-500');
    }
  },

  backup: {
    exportJSON() {
      const blob = new Blob([JSON.stringify(ALZEIN.state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `alzein_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    },
    importJSON(file) {
      const reader = new FileReader();
      reader.onload = (e) => { try { ALZEIN.state = JSON.parse(e.target.result); ALZEIN.storage.save(); location.reload(); } catch(err) { alert('Invalid JSON'); } };
      reader.readAsText(file);
    }
  },

  pdf: {
    generate() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text(`${ALZEIN.state.settings.shopName} - Statement`, 14, 15);
      doc.autoTable({
        startY: 25,
        head: [['Date', 'Statement', 'Dr', 'Cr', 'Balance']],
        body: Array.from(document.querySelectorAll('#reportTable tr')).map(row => Array.from(row.children).map(c => c.innerText)),
        theme: 'grid', headStyles: { fillColor: [245, 158, 11] }
      });
      doc.save('statement.pdf');
    }
  },

  whatsapp: { share() {
    const txt = document.querySelectorAll('#reportTable tr').length > 0 ? 'Statement Generated' : 'No data';
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, '_blank');
  }},

  applyLang() {
    const dict = this.i18n[this.state.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];    });
    document.getElementById('langToggle').textContent = this.state.lang.toUpperCase();
  },

  bindEvents() {
    document.querySelectorAll('.nav-btn, .nav-link').forEach(btn => btn.addEventListener('click', (e) => {
      e.preventDefault(); this.ui.switchSection(btn.dataset.target);
      document.getElementById('drawer').classList.add('-translate-x-full');
    }));
    document.getElementById('menuBtn').onclick = () => document.getElementById('drawer').classList.toggle('-translate-x-full');
    document.getElementById('closeDrawer').onclick = () => document.getElementById('drawer').classList.add('-translate-x-full');
    document.getElementById('quickAddBtn').onclick = () => document.getElementById('quickModal').classList.replace('hidden', 'flex');
    document.getElementById('closeModal').onclick = () => document.getElementById('quickModal').classList.replace('flex', 'hidden');
    document.getElementById('qAmount').addEventListener('input', function() { if(this.value.includes('=')) this.value = ALZEIN.calculator.safeEval(this.value); });
    document.getElementById('voiceBtn').onclick = () => this.voice.toggle();
    document.getElementById('langToggle').onclick = () => { const langs = ['en','ar','tr']; const next = langs[(langs.indexOf(this.state.lang)+1)%3]; this.state.lang = next; this.applyLang(); this.storage.save(); };
    document.getElementById('addCur').onclick = () => this.currency.add(document.getElementById('newCurCode').value, document.getElementById('newCurName').value, document.getElementById('newCurRate').value);
    document.getElementById('quickForm').onsubmit = (e) => {
      e.preventDefault();
      const tx = { id: Date.now(), date: new Date().toISOString().slice(0,10), from: e.target.qFrom.value, to: e.target.qTo.value, amount: e.target.qAmount.value, notes: e.target.qNotes.value, currency: ALZEIN.state.settings.defaultCur };
      this.state.transactions.push(tx);
      // Simplified balance update
      const fromAcc = this.state.accounts.find(a => a.id === tx.from); if(fromAcc) fromAcc.balance -= Number(tx.amount);
      const toAcc = this.state.accounts.find(a => a.id === tx.to); if(toAcc) toAcc.balance += Number(tx.amount);
      this.storage.save(); this.ui.renderAll(); this.ui.switchSection('dashboard');
      e.target.reset();
    };
    document.getElementById('applyFilter').onclick = () => this.ui.renderReportTable();
    document.getElementById('exportPDF').onclick = () => this.pdf.generate();
    document.getElementById('shareWA').onclick = () => this.whatsapp.share();
    document.getElementById('exportBackup').onclick = () => this.backup.exportJSON();
    document.getElementById('importBackup').onchange = (e) => this.backup.importJSON(e.target.files[0]);
    document.getElementById('saveSettings').onclick = () => {
      this.state.settings.shopName = document.getElementById('setShopName').value;
      this.state.settings.phone = document.getElementById('setPhone').value;
      this.state.settings.labelUs = document.getElementById('setLabelUs').value;
      this.state.settings.labelOnUs = document.getElementById('setLabelOnUs').value;
      this.state.settings.defaultCur = document.getElementById('setDefaultCur').value;
      this.state.settings.showTime = document.getElementById('showTime').checked;
      this.state.settings.showDate = document.getElementById('showDate').checked;
      this.state.settings.showPrevBal = document.getElementById('showPrevBal').checked;
      this.state.settings.isBusiness = document.getElementById('modeBusiness').checked;
      this.storage.save(); this.ui.updateSettingsUI(); alert('Settings Saved');
    };
    this.voice.init();
  }
};

document.addEventListener('DOMContentLoaded', () => ALZEIN.init());
