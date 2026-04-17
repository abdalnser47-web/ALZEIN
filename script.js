/* ==========================================
   تطبيق محاسب - script.js
   ========================================== */

// ==========================================
// حالة التطبيق
// ==========================================
const AppState = {
  currentPage: "page-home",
  settings: {
    darkMode: true,
    haptic: true,
    animations: true,
    cardStyle: "rounded",
    currency: "SAR",
    currencySymbol: "ر.س",
  },
  data: {
    transactions: [],
    people: [],
    accounts: [],
    products: [],
    invoices: [],
    archive: { transactions: [], invoices: [], people: [] },
    calcHistory: [],
  },
  undoStack: null,
  undoTimeout: null,
};

// ==========================================
// التهيئة
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  applySettings();
  updateDashboard();
  renderPeople();
  renderAccounts();
  renderProducts();
  renderInvoices();
  generateReport();
  renderArchive();
  renderDashboardOrder();

  // إخفاء شاشة التحميل
  setTimeout(() => {
    const ls = document.getElementById("loading-screen");
    if (ls) {
      ls.classList.add("fade-out");
      setTimeout(() => ls.remove(), 500);
    }
  }, 800);
});

// ==========================================
// إدارة البيانات
// ==========================================
function loadData() {
  try {
    const saved = localStorage.getItem("muhasib_data");
    if (saved) {
      const parsed = JSON.parse(saved);
      AppState.data = { ...AppState.data, ...parsed };
    }
    const savedSettings = localStorage.getItem("muhasib_settings");
    if (savedSettings) {
      AppState.settings = {
        ...AppState.settings,
        ...JSON.parse(savedSettings),
      };
    }
  } catch (e) {
    console.error("Error loading data:", e);
  }
  // تأكد من وجود الحساب الافتراضي
  if (AppState.data.accounts.length === 0) {
    AppState.data.accounts.push({
      id: generateId(),
      name: "الصندوق النقدي",
      type: "cash",
      currency: AppState.settings.currency,
      rate: 1,
      balance: 0,
    });
    saveData();
  }
}

function saveData() {
  try {
    localStorage.setItem("muhasib_data", JSON.stringify(AppState.data));
  } catch (e) {
    console.error("Error saving data:", e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem("muhasib_settings", JSON.stringify(AppState.settings));
  } catch (e) {
    console.error("Error saving settings:", e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ==========================================
// التنقل - MapsTo
// ==========================================
function MapsTo(pageId) {
  // التحقق من وجود الصفحة
  const pages = document.querySelectorAll(".page");
  if (!pages.length) return;

  pages.forEach((p) => p.classList.remove("active"));

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add("active");
    AppState.currentPage = pageId;
  }

  // تحديث أزرار التنقل
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.page === pageId) {
      btn.classList.add("active");
    }
  });

  // تحديث عنوان الصفحة
  updatePageTitle(pageId);

  // تحديث FAB
  updateFabPosition();

  // تحديث البيانات عند الدخول
  if (pageId === "page-home") updateDashboard();
  if (pageId === "page-people") renderPeople();
  if (pageId === "page-accounts") renderAccounts();
  if (pageId === "page-products") renderProducts();
  if (pageId === "page-invoices") renderInvoices();
  if (pageId === "page-reports") generateReport();
  if (pageId === "page-archive") renderArchive();

  hapticFeedback();
}

function updatePageTitle(pageId) {
  const titles = {
    "page-home": "الرئيسية",
    "page-people": "الأشخاص",
    "page-person-detail": "تفاصيل الشخص",
    "page-accounts": "الحسابات",
    "page-calculator": "الحاسبة",
    "page-settings": "الإعدادات",
    "page-products": "المنتجات والمخزون",
    "page-reports": "التقارير",
    "page-invoices": "الفواتير",
    "page-archive": "الأرشيف",
  };
  const titleEl = document.getElementById("page-title");
  if (titleEl) {
    titleEl.textContent = titles[pageId] || "محاسب";
  }
}

function updateFabPosition() {
  const fab = document.getElementById("fab-btn");
  if (!fab) return;
  // FAB always visible, context-dependent action handled by handleFabClick
}

function handleFabClick() {
  hapticFeedback();
  const page = AppState.currentPage;
  switch (page) {
    case "page-home":
    case "page-transactions":
      openTransactionForm();
      break;
    case "page-people":
      openPersonForm();
      break;
    case "page-accounts":
      openAccountForm();
      break;
    case "page-products":
      openProductForm();
      break;
    case "page-invoices":
      openInvoiceForm();
      break;
    case "page-calculator":
      MapsTo("page-calculator");
      break;
    default:
      openTransactionForm();
  }
}

// ==========================================
// النوافذ المنبثقة
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    populateFormSelects();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
  }
}

function toggleGlobalSearch() {
  const bar = document.getElementById("global-search-bar");
  if (bar) {
    bar.classList.toggle("hidden");
    if (!bar.classList.contains("hidden")) {
      const input = document.getElementById("global-search-input");
      if (input) input.focus();
    }
  }
}

function performGlobalSearch(query) {
  if (!query || query.length < 2) return;
  // بحث في كل شيء
  const results = [];
  AppState.data.transactions.forEach((t) => {
    if (t.description && t.description.includes(query))
      results.push("معاملة: " + t.description);
  });
  AppState.data.people.forEach((p) => {
    if (p.name && p.name.includes(query)) results.push("شخص: " + p.name);
  });
  AppState.data.products.forEach((pr) => {
    if (pr.name && pr.name.includes(query)) results.push("منتج: " + pr.name);
  });
  AppState.data.invoices.forEach((inv) => {
    if (inv.number && inv.number.includes(query))
      results.push("فاتورة: " + inv.number);
  });
  showToast("نتائج البحث: " + results.length);
}

// ==========================================
// الإعدادات
// ==========================================
function applySettings() {
  const s = AppState.settings;

  // الوضع الليلي
  if (s.darkMode) {
    document.body.classList.remove("light-mode");
  } else {
    document.body.classList.add("light-mode");
  }

  // الأنيميشن
  if (!s.animations) {
    document.body.classList.add("no-animation");
  } else {
    document.body.classList.remove("no-animation");
  }

  // تحديث عناصر الإعدادات
  const dm = document.getElementById("setting-dark-mode");
  if (dm) dm.checked = s.darkMode;
  const ha = document.getElementById("setting-haptic");
  if (ha) ha.checked = s.haptic;
  const an = document.getElementById("setting-animations");
  if (an) an.checked = s.animations;
  const cs = document.getElementById("setting-card-style");
  if (cs) cs.value = s.cardStyle;
  const cu = document.getElementById("setting-currency");
  if (cu) cu.value = s.currency;
  const csym = document.getElementById("setting-currency-symbol");
  if (csym) csym.value = s.currencySymbol;

  // أنماط البطاقات
  applyCardStyle(s.cardStyle);
}

function updateSetting(key, value) {
  AppState.settings[key] = value;
  saveSettings();
  applySettings();

  if (key === "currency") {
    updateDashboard();
    renderAccounts();
  }
}

function toggleThemeMode() {
  AppState.settings.darkMode = !AppState.settings.darkMode;
  updateSetting("darkMode", AppState.settings.darkMode);
}

function applyCardStyle(style) {
  const cards = document.querySelectorAll(
    ".glass-card, .summary-card, .dash-card, .list-item",
  );
  cards.forEach((card) => {
    switch (style) {
      case "sharp":
        card.style.borderRadius = "0";
        break;
      case "pill":
        card.style.borderRadius = "50px";
        break;
      default:
        card.style.borderRadius = "";
    }
  });
}

function resetApp() {
  if (confirm("هل أنت متأكد من إعادة ضبط التطبيق؟ سيتم حذف جميع البيانات.")) {
    localStorage.removeItem("muhasib_data");
    localStorage.removeItem("muhasib_settings");
    location.reload();
  }
}

// ==========================================
// لوحة التحكم
// ==========================================
function updateDashboard() {
  const txs = AppState.data.transactions;
  const totalIncome = txs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalExpense = txs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatMoney(val);
  };
  set("dash-total-income", totalIncome);
  set("dash-total-expense", totalExpense);
  set("dash-net-profit", netProfit);

  // آخر معاملة
  const lastTx = txs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const ltEl = document.getElementById("dash-last-tx");
  if (ltEl)
    ltEl.textContent = lastTx
      ? `${lastTx.description || lastTx.category} - ${formatMoney(lastTx.amount)}`
      : "لا توجد معاملات";

  // أعلى مصروف هذا الشهر
  const now = new Date();
  const monthTxs = txs.filter((t) => {
    const d = new Date(t.date);
    return (
      t.type === "expense" &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });
  const topExpense = monthTxs.sort(
    (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
  )[0];
  const teEl = document.getElementById("dash-top-expense");
  if (teEl)
    teEl.textContent = topExpense
      ? `${topExpense.category} - ${formatMoney(topExpense.amount)}`
      : "لا توجد مصروفات";

  // أكثر عميل مديون
  const people = AppState.data.people;
  const withBalance = people
    .map((p) => ({ ...p, balance: getPersonBalance(p.id) }))
    .filter((p) => p.balance < 0);
  const topDebtor = withBalance.sort((a, b) => a.balance - b.balance)[0];
  const tdEl = document.getElementById("dash-top-debtor");
  if (tdEl)
    tdEl.textContent = topDebtor
      ? `${topDebtor.name} (${formatMoney(Math.abs(topDebtor.balance))})`
      : "لا يوجد عملاء";

  // أكثر منتج مبيعاً
  const products = AppState.data.products;
  const topProduct = products.sort(
    (a, b) => (b.soldCount || 0) - (a.soldCount || 0),
  )[0];
  const tpEl = document.getElementById("dash-top-product");
  if (tpEl)
    tpEl.textContent = topProduct
      ? `${topProduct.name} (${topProduct.soldCount || 0} مبيعة)`
      : "لا توجد منتجات";

  // آخر فاتورة
  const invoices = AppState.data.invoices;
  const lastInv = invoices.sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  )[0];
  const liEl = document.getElementById("dash-last-invoice");
  if (liEl)
    liEl.textContent = lastInv
      ? `${lastInv.number} - ${formatMoney(lastInv.grandTotal)}`
      : "لا توجد فواتير";

  // العدادات
  const setCount = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setCount("dash-invoice-count", invoices.length);
  setCount("dash-people-count", people.length);
  setCount("dash-products-count", products.length);

  // آخر النشاطات
  renderRecentActivities();
}

function renderRecentActivities() {
  const container = document.getElementById("recent-activities");
  if (!container) return;

  const activities = [];

  AppState.data.transactions
    .slice(-5)
    .reverse()
    .forEach((t) => {
      activities.push({
        icon: t.type === "income" ? "fas fa-arrow-down" : "fas fa-arrow-up",
        iconClass: t.type,
        title: t.description || t.category,
        date: formatDate(t.date),
        amount: t.amount,
        type: t.type,
      });
    });

  AppState.data.invoices
    .slice(-3)
    .reverse()
    .forEach((inv) => {
      activities.push({
        icon: "fas fa-file-invoice",
        iconClass: "invoice",
        title: `فاتورة ${inv.number}`,
        date: formatDate(inv.date),
        amount: inv.grandTotal,
        type: "income",
      });
    });

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = activities.length
    ? activities
        .slice(0, 10)
        .map(
          (a) => `
        <div class="activity-item">
            <div class="activity-icon ${a.iconClass}"><i class="${a.icon}"></i></div>
            <div class="activity-info">
                <div class="activity-title">${a.title}</div>
                <div class="activity-date">${a.date}</div>
            </div>
            <div class="activity-amount ${a.type}">${formatMoney(a.amount)}</div>
        </div>
    `,
        )
        .join("")
    : '<div class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد نشاطات بعد</p></div>';
}

// ==========================================
// المعاملات
// ==========================================
let currentTxType = "income";

function openTransactionForm(editId) {
  const form = document.getElementById("transaction-form");
  if (form) form.reset();
  currentTxType = "income";
  updateTxTypeButtons();

  const modalTitle = document.getElementById("tx-modal-title");
  const submitBtn = document.getElementById("tx-submit-btn");
  if (modalTitle)
    modalTitle.textContent = editId ? "تعديل المعاملة" : "معاملة جديدة";
  if (submitBtn) submitBtn.textContent = editId ? "تحديث" : "حفظ";

  const idField = document.getElementById("tx-id");
  if (idField) idField.value = "";

  // تعيين التاريخ الحالي
  const dateField = document.getElementById("tx-date");
  if (dateField) dateField.value = new Date().toISOString().slice(0, 16);

  // تعبئة القوائم
  populateFormSelects();

  if (editId) {
    const tx = AppState.data.transactions.find((t) => t.id === editId);
    if (tx) {
      if (idField) idField.value = tx.id;
      setTxType(tx.type);
      const amt = document.getElementById("tx-amount");
      if (amt) amt.value = tx.amount;
      const cat = document.getElementById("tx-category");
      if (cat) cat.value = tx.category;
      const acc = document.getElementById("tx-account");
      if (acc) acc.value = tx.accountId;
      const per = document.getElementById("tx-person");
      if (per) per.value = tx.personId || "";
      const desc = document.getElementById("tx-description");
      if (desc) desc.value = tx.description || "";
      const notes = document.getElementById("tx-notes");
      if (notes) notes.value = tx.notes || "";
      const dt = document.getElementById("tx-date");
      if (dt)
        dt.value = tx.date ? new Date(tx.date).toISOString().slice(0, 16) : "";
    }
  }

  openModal("transaction-modal");
}

function setTxType(type) {
  currentTxType = type;
  updateTxTypeButtons();
}

function updateTxTypeButtons() {
  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.type === currentTxType);
  });
}

function saveTransaction(e) {
  if (e) e.preventDefault();

  const id = document.getElementById("tx-id").value;
  const amount = parseFloat(document.getElementById("tx-amount").value);
  const category = document.getElementById("tx-category").value;
  const accountId = document.getElementById("tx-account").value;
  const personId = document.getElementById("tx-person").value;
  const description = document.getElementById("tx-description").value;
  const notes = document.getElementById("tx-notes").value;
  const date = document.getElementById("tx-date").value;

  if (!amount || !category || !accountId) {
    showToast("يرجى ملء جميع الحقول المطلوبة");
    return;
  }

  const tx = {
    id: id || generateId(),
    type: currentTxType,
    amount,
    category,
    accountId,
    personId: personId || null,
    description,
    notes,
    date: date || new Date().toISOString(),
    createdAt: id
      ? AppState.data.transactions.find((t) => t.id === id)?.createdAt ||
        new Date().toISOString()
      : new Date().toISOString(),
  };

  if (id) {
    const idx = AppState.data.transactions.findIndex((t) => t.id === id);
    if (idx !== -1) AppState.data.transactions[idx] = tx;
  } else {
    AppState.data.transactions.push(tx);
  }

  // تحديث رصيد الحساب
  updateAccountBalance(accountId, amount, currentTxType, id);

  // تحديث رصيد الشخص
  if (personId) {
    updatePersonBalance(personId, amount, currentTxType);
  }

  saveData();
  closeModal("transaction-modal");
  showToast(id ? "تم تحديث المعاملة" : "تم حفظ المعاملة");
  updateDashboard();
  renderRecentActivities();
}

function deleteTransaction(id) {
  const idx = AppState.data.transactions.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const tx = AppState.data.transactions[idx];

  // حفظ للتراجع
  AppState.undoStack = { type: "transaction", data: tx, index: idx };

  AppState.data.transactions.splice(idx, 1);
  updateAccountBalance(
    tx.accountId,
    -tx.amount,
    tx.type === "income" ? "expense" : "income",
    id,
  );
  if (tx.personId) {
    updatePersonBalance(
      tx.personId,
      -tx.amount,
      tx.type === "income" ? "expense" : "income",
    );
  }

  saveData();
  showToast("تم حذف المعاملة");
  updateDashboard();

  // إظهار زر التراجع
  showUndoBar("تم حذف المعاملة");
}

function archiveTransaction(id) {
  const idx = AppState.data.transactions.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const tx = AppState.data.transactions.splice(idx, 1)[0];
  tx.archivedAt = new Date().toISOString();
  AppState.data.archive.transactions.push(tx);
  saveData();
  showToast("تم أرشفة المعاملة");
  updateDashboard();
  renderArchive();
}

function showUndoBar(message) {
  const bar = document.getElementById("undo-bar");
  const msg = document.getElementById("undo-message");
  if (bar) bar.classList.remove("hidden");
  if (msg) msg.textContent = message;

  clearTimeout(AppState.undoTimeout);
  AppState.undoTimeout = setTimeout(() => {
    AppState.undoStack = null;
    if (bar) bar.classList.add("hidden");
  }, 5000);
}

function undoDelete() {
  if (!AppState.undoStack) return;

  const { type, data } = AppState.undoStack;

  if (type === "transaction") {
    AppState.data.transactions.push(data);
    updateAccountBalance(data.accountId, data.amount, data.type, data.id);
    if (data.personId) {
      updatePersonBalance(data.personId, data.amount, data.type);
    }
  }

  AppState.undoStack = null;
  saveData();
  showToast("تم التراجع");
  updateDashboard();

  const bar = document.getElementById("undo-bar");
  if (bar) bar.classList.add("hidden");
}

function updateAccountBalance(accountId, amount, type, txId) {
  const account = AppState.data.accounts.find((a) => a.id === accountId);
  if (!account) return;
  account.balance += type === "income" ? amount : -amount;
  saveData();
}

// ==========================================
// الأشخاص
// ==========================================
function openPersonForm(editId) {
  const form = document.getElementById("person-form");
  if (form) form.reset();

  const modalTitle = document.getElementById("person-modal-title");
  const submitBtn = document.getElementById("person-submit-btn");
  if (modalTitle) modalTitle.textContent = editId ? "تعديل الشخص" : "شخص جديد";
  if (submitBtn) submitBtn.textContent = editId ? "تحديث" : "حفظ";

  const idField = document.getElementById("person-id");
  if (idField) idField.value = "";

  if (editId) {
    const person = AppState.data.people.find((p) => p.id === editId);
    if (person) {
      if (idField) idField.value = person.id;
      const name = document.getElementById("person-name");
      if (name) name.value = person.name;
      const type = document.getElementById("person-type");
      if (type) type.value = person.type;
      const phone = document.getElementById("person-phone");
      if (phone) phone.value = person.phone || "";
      const address = document.getElementById("person-address");
      if (address) address.value = person.address || "";
      const notes = document.getElementById("person-notes");
      if (notes) notes.value = person.notes || "";
    }
  }

  openModal("person-modal");
}

function savePerson(e) {
  if (e) e.preventDefault();

  const id = document.getElementById("person-id").value;
  const name = document.getElementById("person-name").value.trim();
  const type = document.getElementById("person-type").value;
  const phone = document.getElementById("person-phone").value.trim();
  const address = document.getElementById("person-address").value.trim();
  const notes = document.getElementById("person-notes").value.trim();

  if (!name) {
    showToast("يرجى إدخال اسم الشخص");
    return;
  }

  const person = {
    id: id || generateId(),
    name,
    type,
    phone,
    address,
    notes,
    balance: 0,
    createdAt: id
      ? AppState.data.people.find((p) => p.id === id)?.createdAt ||
        new Date().toISOString()
      : new Date().toISOString(),
  };

  if (id) {
    const idx = AppState.data.people.findIndex((p) => p.id === id);
    if (idx !== -1) {
      person.balance = AppState.data.people[idx].balance;
      AppState.data.people[idx] = person;
    }
  } else {
    AppState.data.people.push(person);
  }

  saveData();
  closeModal("person-modal");
  showToast(id ? "تم تحديث الشخص" : "تم حفظ الشخص");
  renderPeople();
  updateDashboard();
}

function deletePerson(id) {
  const idx = AppState.data.people.findIndex((p) => p.id === id);
  if (idx === -1) return;

  const person = AppState.data.people[idx];
  AppState.undoStack = { type: "person", data: person, index: idx };
  AppState.data.people.splice(idx, 1);
  saveData();
  showToast("تم حذف الشخص");
  renderPeople();
  showUndoBar("تم حذف الشخص");
}

function getPersonBalance(personId) {
  const txs = AppState.data.transactions.filter((t) => t.personId === personId);
  let balance = 0;
  txs.forEach((t) => {
    if (t.type === "income") balance += parseFloat(t.amount || 0);
    else balance -= parseFloat(t.amount || 0);
  });
  return balance;
}

function renderPeople() {
  const container = document.getElementById("people-list");
  if (!container) return;

  const search =
    document.getElementById("people-search")?.value?.toLowerCase() || "";
  const filter = document.getElementById("people-filter")?.value || "all";

  let people = AppState.data.people.map((p) => ({
    ...p,
    balance: getPersonBalance(p.id),
  }));

  if (search) {
    people = people.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.phone && p.phone.includes(search)),
    );
  }

  if (filter === "customer")
    people = people.filter((p) => p.type === "customer");
  else if (filter === "supplier")
    people = people.filter((p) => p.type === "supplier");
  else if (filter === "debtor") people = people.filter((p) => p.balance < 0);

  // تحديث الإحصائيات
  const allPeople = AppState.data.people.map((p) => ({
    ...p,
    balance: getPersonBalance(p.id),
  }));
  const te = document.getElementById("total-people");
  if (te) te.textContent = allPeople.length;
  const td = document.getElementById("total-debtors");
  if (td) td.textContent = allPeople.filter((p) => p.balance < 0).length;
  const tc = document.getElementById("total-creditors");
  if (tc) tc.textContent = allPeople.filter((p) => p.balance > 0).length;

  container.innerHTML = people.length
    ? people
        .map(
          (p) => `
        <div class="list-item" onclick="viewPerson('${p.id}')">
            <div class="item-icon"><i class="fas fa-user"></i></div>
            <div class="item-info">
                <div class="item-title">${p.name}</div>
                <div class="item-subtitle">${p.phone || "بدون رقم"} • ${p.type === "customer" ? "عميل" : p.type === "supplier" ? "مورد" : "آخر"}</div>
            </div>
            <div class="item-amount ${p.balance >= 0 ? "income" : "expense"}">${formatMoney(Math.abs(p.balance))}</div>
            <div class="item-actions" onclick="event.stopPropagation()">
                <button class="item-action-btn" onclick="openPersonForm('${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="item-action-btn delete" onclick="deletePerson('${p.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `,
        )
        .join("")
    : '<div class="empty-state"><i class="fas fa-users"></i><p>لا يوجد أشخاص</p></div>';
}

function viewPerson(id) {
  const person = AppState.data.people.find((p) => p.id === id);
  if (!person) return;

  const balance = getPersonBalance(id);
  const txs = AppState.data.transactions
    .filter((t) => t.personId === id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const content = document.getElementById("person-detail-content");
  if (!content) return;

  content.innerHTML = `
        <div class="person-detail-header">
            <h2>${person.name}</h2>
            <span class="item-badge badge-${person.type === "customer" ? "active" : person.type === "supplier" ? "badge-expense" : "badge-low"}">${person.type === "customer" ? "عميل" : person.type === "supplier" ? "مورد" : "آخر"}</span>
            <div class="person-balance ${balance >= 0 ? "credit" : "debt"}">${balance >= 0 ? "+" : "-"}${formatMoney(Math.abs(balance))}</div>
            <div class="person-contact-btns">
                ${
                  person.phone
                    ? `
                    <button class="person-contact-btn" onclick="window.open('tel:${person.phone}')"><i class="fas fa-phone"></i> اتصال</button>
                    <button class="person-contact-btn" onclick="copyToClipboard('${person.phone}')"><i class="fas fa-copy"></i> نسخ الرقم</button>
                `
                    : ""
                }
            </div>
        </div>
        <div class="person-info-grid">
            <div class="person-info-item">
                <label>رقم الهاتف</label>
                <span>${person.phone || "-"}</span>
            </div>
            <div class="person-info-item">
                <label>العنوان</label>
                <span>${person.address || "-"}</span>
            </div>
            <div class="person-info-item">
                <label>ملاحظات</label>
                <span>${person.notes || "-"}</span>
            </div>
            <div class="person-info-item">
                <label>عدد المعاملات</label>
                <span>${txs.length}</span>
            </div>
        </div>
        <h3 style="margin-bottom:12px;color:var(--text-primary)"><i class="fas fa-history" style="color:var(--primary-light)"></i> سجل المعاملات</h3>
        <div class="list-container">
            ${
              txs.length
                ? txs
                    .map(
                      (t) => `
                <div class="list-item">
                    <div class="item-icon ${t.type}"><i class="fas fa-${t.type === "income" ? "arrow-down" : "arrow-up"}"></i></div>
                    <div class="item-info">
                        <div class="item-title">${t.description || t.category}</div>
                        <div class="item-subtitle">${formatDate(t.date)}</div>
                    </div>
                    <div class="item-amount ${t.type}">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}</div>
                </div>
            `,
                    )
                    .join("")
                : '<div class="empty-state"><p>لا توجد معاملات</p></div>'
            }
        </div>
    `;

  MapsTo("page-person-detail");
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast("تم نسخ الرقم"));
  } else {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast("تم نسخ الرقم");
  }
}

// ==========================================
// الحسابات
// ==========================================
function openAccountForm(editId) {
  const form = document.getElementById("account-form");
  if (form) form.reset();

  const modalTitle = document.getElementById("account-modal-title");
  const submitBtn = document.getElementById("account-submit-btn");
  if (modalTitle)
    modalTitle.textContent = editId ? "تعديل الحساب" : "حساب جديد";
  if (submitBtn) submitBtn.textContent = editId ? "تحديث" : "حفظ";

  const idField = document.getElementById("account-id");
  if (idField) idField.value = "";

  // تعبئة العملات
  const currSelect = document.getElementById("account-currency");
  if (currSelect) {
    const currencies = [
      "SAR",
      "USD",
      "EUR",
      "EGP",
      "AED",
      "KWD",
      "JOD",
      "IQD",
      "YER",
      "LYD",
      "SDG",
      "MAD",
      "TND",
      "OMR",
      "BHD",
      "QAR",
    ];
    currSelect.innerHTML = currencies
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  }

  if (editId) {
    const acc = AppState.data.accounts.find((a) => a.id === editId);
    if (acc) {
      if (idField) idField.value = acc.id;
      const name = document.getElementById("account-name");
      if (name) name.value = acc.name;
      const type = document.getElementById("account-type");
      if (type) type.value = acc.type;
      const curr = document.getElementById("account-currency");
      if (curr) curr.value = acc.currency;
      const rate = document.getElementById("account-rate");
      if (rate) rate.value = acc.rate;
      const bal = document.getElementById("account-balance");
      if (bal) bal.value = acc.balance;
    }
  }

  openModal("account-modal");
}

function saveAccount(e) {
  if (e) e.preventDefault();

  const id = document.getElementById("account-id").value;
  const name = document.getElementById("account-name").value.trim();
  const type = document.getElementById("account-type").value;
  const currency = document.getElementById("account-currency").value;
  const rate = parseFloat(document.getElementById("account-rate").value) || 1;
  const balance =
    parseFloat(document.getElementById("account-balance").value) || 0;

  if (!name) {
    showToast("يرجى إدخال اسم الحساب");
    return;
  }

  const account = {
    id: id || generateId(),
    name,
    type,
    currency,
    rate,
    balance: id
      ? AppState.data.accounts.find((a) => a.id === id)?.balance || balance
      : balance,
  };

  if (id) {
    const idx = AppState.data.accounts.findIndex((a) => a.id === id);
    if (idx !== -1) AppState.data.accounts[idx] = account;
  } else {
    AppState.data.accounts.push(account);
  }

  saveData();
  closeModal("account-modal");
  showToast(id ? "تم تحديث الحساب" : "تم حفظ الحساب");
  renderAccounts();
}

function deleteAccount(id) {
  const idx = AppState.data.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return;
  AppState.data.accounts.splice(idx, 1);
  saveData();
  showToast("تم حذف الحساب");
  renderAccounts();
}

function openTransferForm() {
  const form = document.getElementById("transfer-form");
  if (form) form.reset();

  const from = document.getElementById("transfer-from");
  const to = document.getElementById("transfer-to");
  if (from) {
    from.innerHTML = AppState.data.accounts
      .map((a) => `<option value="${a.id}">${a.name}</option>`)
      .join("");
  }
  if (to) {
    to.innerHTML = AppState.data.accounts
      .map((a) => `<option value="${a.id}">${a.name}</option>`)
      .join("");
  }

  openModal("transfer-modal");
}

function saveTransfer(e) {
  if (e) e.preventDefault();

  const fromId = document.getElementById("transfer-from").value;
  const toId = document.getElementById("transfer-to").value;
  const amount = parseFloat(document.getElementById("transfer-amount").value);
  const notes = document.getElementById("transfer-notes").value;

  if (fromId === toId) {
    showToast("لا يمكن التحويل لنفس الحساب");
    return;
  }
  if (!amount || amount <= 0) {
    showToast("يرجى إدخال مبلغ صحيح");
    return;
  }

  const fromAcc = AppState.data.accounts.find((a) => a.id === fromId);
  const toAcc = AppState.data.accounts.find((a) => a.id === toId);
  if (!fromAcc || !toAcc) return;

  fromAcc.balance -= amount;
  toAcc.balance += amount;

  // إضافة معاملات التحويل
  AppState.data.transactions.push({
    id: generateId(),
    type: "expense",
    amount,
    category: "تحويل",
    accountId: fromId,
    personId: null,
    description: `تحويل إلى ${toAcc.name}`,
    notes,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  AppState.data.transactions.push({
    id: generateId(),
    type: "income",
    amount,
    category: "تحويل",
    accountId: toId,
    personId: null,
    description: `تحويل من ${fromAcc.name}`,
    notes,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  saveData();
  closeModal("transfer-modal");
  showToast("تم التحويل بنجاح");
  renderAccounts();
  updateDashboard();
}

function renderAccounts() {
  const overview = document.getElementById("accounts-overview");
  const list = document.getElementById("accounts-list");

  if (overview) {
    overview.innerHTML = AppState.data.accounts
      .map(
        (a) => `
            <div class="account-card">
                <div class="acc-name">${a.name}</div>
                <div class="acc-balance">${formatMoney(a.balance)} <small style="font-size:12px;color:var(--text-muted)">${a.currency}</small></div>
                <div class="acc-type">${a.type === "cash" ? "نقدي" : a.type === "bank" ? "بنكي" : a.type === "wallet" ? "محفظة" : "آخر"}</div>
            </div>
        `,
      )
      .join("");
  }

  if (list) {
    list.innerHTML =
      AppState.data.accounts
        .map(
          (a) => `
            <div class="list-item">
                <div class="item-icon"><i class="fas fa-${a.type === "cash" ? "money-bill" : a.type === "bank" ? "university" : a.type === "wallet" ? "wallet" : "credit-card"}"></i></div>
                <div class="item-info">
                    <div class="item-title">${a.name}</div>
                    <div class="item-subtitle">${a.currency} • سعر الصرف: ${a.rate}</div>
                </div>
                <div class="item-amount income">${formatMoney(a.balance)}</div>
                <div class="item-actions" onclick="event.stopPropagation()">
                    <button class="item-action-btn" onclick="openAccountForm('${a.id}')"><i class="fas fa-edit"></i></button>
                    <button class="item-action-btn delete" onclick="deleteAccount('${a.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `,
        )
        .join("") || '<div class="empty-state"><p>لا توجد حسابات</p></div>';
  }
}

function populateFormSelects() {
  // حسابات
  const txAccount = document.getElementById("tx-account");
  if (txAccount) {
    txAccount.innerHTML = AppState.data.accounts
      .map((a) => `<option value="${a.id}">${a.name}</option>`)
      .join("");
  }

  // أشخاص
  const txPerson = document.getElementById("tx-person");
  if (txPerson) {
    txPerson.innerHTML =
      '<option value="">بدون شخص</option>' +
      AppState.data.people
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
  }

  const invPerson = document.getElementById("invoice-person");
  if (invPerson) {
    invPerson.innerHTML =
      '<option value="">اختر العميل</option>' +
      AppState.data.people
        .filter((p) => p.type === "customer")
        .map((p) => `<option value="${p.id}">${p.name}</option>`)
        .join("");
  }
}

// ==========================================
// الحاسبة
// ==========================================
let calcDisplay = "0";
let calcExpression = "";
let calcOperator = null;
let calcPreviousValue = null;
let calcNewNumber = true;

function calcNum(n) {
  hapticFeedback();
  if (calcNewNumber) {
    calcDisplay = n;
    calcNewNumber = false;
  } else {
    calcDisplay = calcDisplay === "0" ? n : calcDisplay + n;
  }
  updateCalcDisplay();
}

function calcDot() {
  hapticFeedback();
  if (calcNewNumber) {
    calcDisplay = "0.";
    calcNewNumber = false;
  } else if (!calcDisplay.includes(".")) {
    calcDisplay += ".";
  }
  updateCalcDisplay();
}

function calcOp(op) {
  hapticFeedback();
  const current = parseFloat(calcDisplay);
  if (calcPreviousValue !== null && !calcNewNumber) {
    calcPreviousValue = calculate(calcPreviousValue, current, calcOperator);
    calcDisplay = formatCalcNumber(calcPreviousValue);
  } else {
    calcPreviousValue = current;
  }
  calcOperator = op;
  calcExpression = `${formatCalcNumber(calcPreviousValue)} ${getOpSymbol(op)}`;
  calcNewNumber = true;
  updateCalcDisplay();
}

function calcEquals() {
  hapticFeedback();
  if (calcOperator && calcPreviousValue !== null) {
    const current = parseFloat(calcDisplay);
    const result = calculate(calcPreviousValue, current, calcOperator);
    const expr = `${formatCalcNumber(calcPreviousValue)} ${getOpSymbol(calcOperator)} ${formatCalcNumber(current)} =`;
    calcDisplay = formatCalcNumber(result);
    calcExpression = expr;
    calcPreviousValue = null;
    calcOperator = null;
    calcNewNumber = true;
    addCalcHistory(expr, calcDisplay);
  }
  updateCalcDisplay();
}

function calcClear() {
  hapticFeedback();
  calcDisplay = "0";
  calcExpression = "";
  calcOperator = null;
  calcPreviousValue = null;
  calcNewNumber = true;
  updateCalcDisplay();
}

function calcToggleSign() {
  hapticFeedback();
  calcDisplay = formatCalcNumber(-parseFloat(calcDisplay));
  updateCalcDisplay();
}

function calcPercent() {
  hapticFeedback();
  calcDisplay = formatCalcNumber(parseFloat(calcDisplay) / 100);
  updateCalcDisplay();
}

function calculate(a, b, op) {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b !== 0 ? a / b : 0;
    default:
      return b;
  }
}

function getOpSymbol(op) {
  return { "+": "+", "-": "−", "*": "×", "/": "÷" }[op] || op;
}

function formatCalcNumber(n) {
  return parseFloat(n.toFixed(10)).toString();
}

function updateCalcDisplay() {
  const expr = document.getElementById("calc-expression");
  const result = document.getElementById("calc-result");
  if (expr) expr.textContent = calcExpression;
  if (result) result.textContent = calcDisplay;
}

function addCalcHistory(expr, result) {
  AppState.data.calcHistory.unshift({
    expr,
    result,
    date: new Date().toISOString(),
  });
  if (AppState.data.calcHistory.length > 50)
    AppState.data.calcHistory = AppState.data.calcHistory.slice(0, 50);
  saveData();
  renderCalcHistory();
}

function renderCalcHistory() {
  const list = document.getElementById("calc-history-list");
  if (!list) return;
  list.innerHTML =
    AppState.data.calcHistory
      .map(
        (h, i) => `
        <div class="calc-history-item" onclick="useCalcHistory(${i})">
            ${h.expr} <strong>${h.result}</strong>
        </div>
    `,
      )
      .join("") ||
    '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:10px;">لا يوجد سجل</div>';
}

function useCalcHistory(index) {
  hapticFeedback();
  const h = AppState.data.calcHistory[index];
  if (h) {
    calcDisplay = h.result;
    calcNewNumber = true;
    updateCalcDisplay();
  }
}

function clearCalcHistory() {
  hapticFeedback();
  AppState.data.calcHistory = [];
  saveData();
  renderCalcHistory();
}

function adoptCalcAmount() {
  hapticFeedback();
  const amount = parseFloat(calcDisplay);
  if (isNaN(amount)) return;

  const txAmount = document.getElementById("tx-amount");
  if (txAmount) {
    txAmount.value = amount;
  }

  calcClear();
  closeModal("page-calculator"); // Close calculator isn't a modal, just navigate
  MapsTo("page-home");
  setTimeout(() => openTransactionForm(), 300);
  showToast(`تم اعتماد المبلغ: ${formatMoney(amount)}`);
}

// ==========================================
// المنتجات والمخزون
// ==========================================
function openProductForm(editId) {
  const form = document.getElementById("product-form");
  if (form) form.reset();

  const modalTitle = document.getElementById("product-modal-title");
  const submitBtn = document.getElementById("product-submit-btn");
  if (modalTitle)
    modalTitle.textContent = editId ? "تعديل المنتج" : "منتج جديد";
  if (submitBtn) submitBtn.textContent = editId ? "تحديث" : "حفظ";

  const idField = document.getElementById("product-id");
  if (idField) idField.value = "";

  const preview = document.getElementById("product-image-preview");
  if (preview) preview.classList.add("hidden");

  const qrDiv = document.getElementById("product-qrcode");
  if (qrDiv) qrDiv.innerHTML = "";

  if (editId) {
    const product = AppState.data.products.find((p) => p.id === editId);
    if (product) {
      if (idField) idField.value = product.id;
      const name = document.getElementById("product-name");
      if (name) name.value = product.name;
      const price = document.getElementById("product-price");
      if (price) price.value = product.price;
      const qty = document.getElementById("product-quantity");
      if (qty) qty.value = product.quantity;
      const alert = document.getElementById("product-alert");
      if (alert) alert.value = product.alertLevel || 5;
      const desc = document.getElementById("product-desc");
      if (desc) desc.value = product.description || "";
      const barcode = document.getElementById("product-barcode");
      if (barcode) barcode.value = product.barcode || "";
      if (product.image) {
        if (preview) {
          preview.src = product.image;
          preview.classList.remove("hidden");
        }
      }
      if (product.barcode && typeof QRCode !== "undefined") {
        if (qrDiv) {
          qrDiv.innerHTML = "";
          new QRCode(qrDiv, { text: product.barcode, width: 128, height: 128 });
        }
      }
    }
  }

  openModal("product-modal");
}

function saveProduct(e) {
  if (e) e.preventDefault();

  const id = document.getElementById("product-id").value;
  const name = document.getElementById("product-name").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const quantity = parseInt(document.getElementById("product-quantity").value);
  const alertLevel =
    parseInt(document.getElementById("product-alert").value) || 5;
  const description = document.getElementById("product-desc").value.trim();
  const barcode = document.getElementById("product-barcode").value.trim();

  if (!name || isNaN(price) || isNaN(quantity)) {
    showToast("يرجى ملء جميع الحقول المطلوبة");
    return;
  }

  // معالجة الصورة
  const imageInput = document.getElementById("product-image");
  let imageData = "";
  const processSave = (img) => {
    const product = {
      id: id || generateId(),
      name,
      price,
      quantity,
      alertLevel,
      description,
      barcode,
      image:
        img ||
        (id
          ? AppState.data.products.find((p) => p.id === id)?.image || ""
          : ""),
      soldCount: id
        ? AppState.data.products.find((p) => p.id === id)?.soldCount || 0
        : 0,
      createdAt: id
        ? AppState.data.products.find((p) => p.id === id)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
    };

    if (id) {
      const idx = AppState.data.products.findIndex((p) => p.id === id);
      if (idx !== -1) AppState.data.products[idx] = product;
    } else {
      AppState.data.products.push(product);
    }

    saveData();
    closeModal("product-modal");
    showToast(id ? "تم تحديث المنتج" : "تم حفظ المنتج");
    renderProducts();
    updateDashboard();
  };

  if (imageInput && imageInput.files && imageInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (ev) => processSave(ev.target.result);
    reader.readAsDataURL(imageInput.files[0]);
  } else {
    processSave("");
  }
}

function deleteProduct(id) {
  const idx = AppState.data.products.findIndex((p) => p.id === id);
  if (idx === -1) return;

  const product = AppState.data.products[idx];
  AppState.undoStack = { type: "product", data: product, index: idx };
  AppState.data.products.splice(idx, 1);
  saveData();
  showToast("تم حذف المنتج");
  renderProducts();
  showUndoBar("تم حذف المنتج");
}

function renderProducts() {
  const container = document.getElementById("products-list");
  if (!container) return;

  const search =
    document.getElementById("products-search")?.value?.toLowerCase() || "";
  const filter = document.getElementById("products-filter")?.value || "all";

  let products = [...AppState.data.products];

  if (search) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.barcode && p.barcode.includes(search)),
    );
  }

  if (filter === "low")
    products = products.filter(
      (p) => p.quantity > 0 && p.quantity <= (p.alertLevel || 5),
    );
  else if (filter === "out") products = products.filter((p) => p.quantity <= 0);

  // تحديث الإحصائيات
  const allProducts = AppState.data.products;
  const tp = document.getElementById("total-products");
  if (tp) tp.textContent = allProducts.length;
  const ls = document.getElementById("low-stock");
  if (ls)
    ls.textContent = allProducts.filter(
      (p) => p.quantity <= (p.alertLevel || 5),
    ).length;
  const iv = document.getElementById("inventory-value");
  if (iv)
    iv.textContent = formatMoney(
      allProducts.reduce((s, p) => s + p.price * p.quantity, 0),
    );

  container.innerHTML = products.length
    ? products
        .map((p) => {
          const stockClass =
            p.quantity <= 0
              ? "badge-out"
              : p.quantity <= (p.alertLevel || 5)
                ? "badge-low"
                : "badge-active";
          const stockText = p.quantity <= 0 ? "نفذ" : `${p.quantity} متوفر`;
          return `
            <div class="list-item">
                ${p.image ? `<img src="${p.image}" style="width:44px;height:44px;border-radius:10px;object-fit:cover;flex-shrink:0">` : `<div class="item-icon"><i class="fas fa-box"></i></div>`}
                <div class="item-info">
                    <div class="item-title">${p.name}</div>
                    <div class="item-subtitle">${formatMoney(p.price)} • ${p.barcode ? "باركود: " + p.barcode : ""}</div>
                </div>
                <span class="item-badge ${stockClass}">${stockText}</span>
                <div class="item-actions" onclick="event.stopPropagation()">
                    <button class="item-action-btn" onclick="openProductForm('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="item-action-btn delete" onclick="deleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        })
        .join("")
    : '<div class="empty-state"><i class="fas fa-boxes"></i><p>لا توجد منتجات</p></div>';
}

// ==========================================
// الفواتير
// ==========================================
let invoiceItems = [];

function openInvoiceForm(editId) {
  const form = document.getElementById("invoice-form");
  if (form) form.reset();

  const modalTitle = document.getElementById("invoice-modal-title");
  const submitBtn = document.getElementById("invoice-submit-btn");
  if (modalTitle)
    modalTitle.textContent = editId ? "تعديل الفاتورة" : "فاتورة جديدة";
  if (submitBtn) submitBtn.textContent = editId ? "تحديث" : "حفظ الفاتورة";

  const idField = document.getElementById("invoice-id");
  if (idField) idField.value = "";

  // تعيين التاريخ
  const dateField = document.getElementById("invoice-date");
  if (dateField) dateField.value = new Date().toISOString().slice(0, 16);

  populateFormSelects();

  invoiceItems = [];
  if (editId) {
    const inv = AppState.data.invoices.find((i) => i.id === editId);
    if (inv) {
      if (idField) idField.value = inv.id;
      const per = document.getElementById("invoice-person");
      if (per) per.value = inv.personId || "";
      if (dateField)
        dateField.value = inv.date
          ? new Date(inv.date).toISOString().slice(0, 16)
          : "";
      const disc = document.getElementById("invoice-discount");
      if (disc) disc.value = inv.discount || 0;
      const notes = document.getElementById("invoice-notes");
      if (notes) notes.value = inv.notes || "";
      invoiceItems = inv.items ? JSON.parse(JSON.stringify(inv.items)) : [];
    }
  } else {
    // رقم فاتورة تلقائي
    const nextNum = AppState.data.invoices.length + 1;
    // سيتم إنشاؤه عند الحفظ
    addInvoiceItem();
  }

  renderInvoiceItems();
  updateInvoiceTotals();
  openModal("invoice-modal");
}

function addInvoiceItem() {
  invoiceItems.push({
    productId: "",
    name: "",
    price: 0,
    quantity: 1,
  });
  renderInvoiceItems();
}

function removeInvoiceItem(index) {
  invoiceItems.splice(index, 1);
  renderInvoiceItems();
  updateInvoiceTotals();
}

function renderInvoiceItems() {
  const container = document.getElementById("invoice-items");
  if (!container) return;

  container.innerHTML = invoiceItems
    .map(
      (item, i) => `
        <div class="invoice-item-row">
            <select onchange="updateInvoiceItem(${i}, 'productId', this.value)">
                <option value="">منتج</option>
                ${AppState.data.products.map((p) => `<option value="${p.id}" ${item.productId === p.id ? "selected" : ""}>${p.name}</option>`).join("")}
            </select>
            <input type="number" placeholder="السعر" value="${item.price}" oninput="updateInvoiceItem(${i}, 'price', this.value)" step="0.01">
            <input type="number" placeholder="الكمية" value="${item.quantity}" oninput="updateInvoiceItem(${i}, 'quantity', this.value)" min="1">
            <span style="font-weight:600;font-size:13px">${formatMoney(item.price * item.quantity)}</span>
            <button type="button" class="remove-item" onclick="removeInvoiceItem(${i})"><i class="fas fa-times"></i></button>
        </div>
    `,
    )
    .join("");
}

function updateInvoiceItem(index, field, value) {
  if (field === "productId") {
    const product = AppState.data.products.find((p) => p.id === value);
    if (product) {
      invoiceItems[index].productId = product.id;
      invoiceItems[index].name = product.name;
      invoiceItems[index].price = product.price;
    }
  } else if (field === "price") {
    invoiceItems[index].price = parseFloat(value) || 0;
  } else if (field === "quantity") {
    invoiceItems[index].quantity = parseInt(value) || 1;
  }
  updateInvoiceTotals();
}

function updateInvoiceTotals() {
  const subtotal = invoiceItems.reduce(
    (s, item) => s + item.price * item.quantity,
    0,
  );
  const discount =
    parseFloat(document.getElementById("invoice-discount")?.value) || 0;
  const grandTotal = subtotal - discount;

  const sub = document.getElementById("invoice-subtotal");
  if (sub) sub.textContent = formatMoney(subtotal);
  const grand = document.getElementById("invoice-grand-total");
  if (grand) grand.textContent = formatMoney(grandTotal);
}

function saveInvoice(e) {
  if (e) e.preventDefault();

  const id = document.getElementById("invoice-id").value;
  const personId = document.getElementById("invoice-person").value;
  const date = document.getElementById("invoice-date").value;
  const discount =
    parseFloat(document.getElementById("invoice-discount").value) || 0;
  const notes = document.getElementById("invoice-notes").value;

  if (!personId) {
    showToast("يرجى اختيار العميل");
    return;
  }

  const subtotal = invoiceItems.reduce(
    (s, item) => s + item.price * item.quantity,
    0,
  );
  const grandTotal = subtotal - discount;

  if (invoiceItems.length === 0 || grandTotal <= 0) {
    showToast("يرجى إضافة منتجات للفاتورة");
    return;
  }

  // تحديث مخزون المنتجات
  invoiceItems.forEach((item) => {
    const product = AppState.data.products.find((p) => p.id === item.productId);
    if (product) {
      product.quantity = Math.max(0, product.quantity - item.quantity);
      product.soldCount = (product.soldCount || 0) + item.quantity;
    }
  });

  const invoice = {
    id: id || generateId(),
    number: id
      ? AppState.data.invoices.find((i) => i.id === id)?.number || "INV-001"
      : `INV-${String(AppState.data.invoices.length + 1).padStart(4, "0")}`,
    personId,
    date: date || new Date().toISOString(),
    items: invoiceItems,
    subtotal,
    discount,
    grandTotal,
    notes,
    archived: false,
    createdAt: id
      ? AppState.data.invoices.find((i) => i.id === id)?.createdAt ||
        new Date().toISOString()
      : new Date().toISOString(),
  };

  if (id) {
    const idx = AppState.data.invoices.findIndex((i) => i.id === id);
    if (idx !== -1) AppState.data.invoices[idx] = invoice;
  } else {
    AppState.data.invoices.push(invoice);
  }

  // إضافة معاملة إيراد
  AppState.data.transactions.push({
    id: generateId(),
    type: "income",
    amount: grandTotal,
    category: "مبيعات",
    accountId: AppState.data.accounts[0]?.id || "",
    personId,
    description: `فاتورة ${invoice.number}`,
    notes,
    date: date || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });

  saveData();
  closeModal("invoice-modal");
  showToast(id ? "تم تحديث الفاتورة" : "تم حفظ الفاتورة");
  renderInvoices();
  updateDashboard();
}

function deleteInvoice(id) {
  const idx = AppState.data.invoices.findIndex((i) => i.id === id);
  if (idx === -1) return;

  const inv = AppState.data.invoices[idx];
  AppState.undoStack = { type: "invoice", data: inv, index: idx };
  AppState.data.invoices.splice(idx, 1);
  saveData();
  showToast("تم حذف الفاتورة");
  renderInvoices();
  showUndoBar("تم حذف الفاتورة");
}

function archiveInvoice(id) {
  const idx = AppState.data.invoices.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const inv = AppState.data.invoices.splice(idx, 1)[0];
  inv.archived = true;
  inv.archivedAt = new Date().toISOString();
  AppState.data.archive.invoices.push(inv);
  saveData();
  showToast("تم أرشفة الفاتورة");
  renderInvoices();
  renderArchive();
}

function renderInvoices() {
  const container = document.getElementById("invoices-list");
  if (!container) return;

  const search =
    document.getElementById("invoices-search")?.value?.toLowerCase() || "";
  const filter = document.getElementById("invoices-filter")?.value || "all";

  let invoices = AppState.data.invoices.filter((i) => !i.archived);

  if (filter === "archived")
    invoices = AppState.data.invoices.filter((i) => i.archived);

  if (search) {
    invoices = invoices.filter(
      (i) =>
        i.number.toLowerCase().includes(search) ||
        getPersonName(i.personId).toLowerCase().includes(search),
    );
  }

  container.innerHTML =
    invoices
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(
        (inv) => `
        <div class="list-item">
            <div class="item-icon"><i class="fas fa-file-invoice"></i></div>
            <div class="item-info">
                <div class="item-title">${inv.number}</div>
                <div class="item-subtitle">${getPersonName(inv.personId)} • ${formatDate(inv.date)}</div>
            </div>
            <div class="item-amount income">${formatMoney(inv.grandTotal)}</div>
            <div class="item-actions" onclick="event.stopPropagation()">
                <button class="item-action-btn" onclick="viewInvoice('${inv.id}')"><i class="fas fa-eye"></i></button>
                <button class="item-action-btn" onclick="openInvoiceForm('${inv.id}')"><i class="fas fa-edit"></i></button>
                <button class="item-action-btn archive" onclick="archiveInvoice('${inv.id}')"><i class="fas fa-archive"></i></button>
                <button class="item-action-btn delete" onclick="deleteInvoice('${inv.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `,
      )
      .join("") ||
    '<div class="empty-state"><i class="fas fa-file-invoice"></i><p>لا توجد فواتير</p></div>';
}

function viewInvoice(id) {
  const inv = AppState.data.invoices.find((i) => i.id === id);
  if (!inv) return;

  const person = AppState.data.people.find((p) => p.id === inv.personId);

  const content = document.getElementById("invoice-view-content");
  if (!content) return;

  content.innerHTML = `
        <div class="invoice-print-view" id="invoice-print-area">
            <div class="inv-header">
                <h1>فاتورة</h1>
                <p>رقم: ${inv.number}</p>
                <p>التاريخ: ${formatDate(inv.date)}</p>
            </div>
            <div class="inv-details">
                <div>
                    <strong>العميل:</strong> ${person ? person.name : "غير محدد"}<br>
                    ${person && person.phone ? "<strong>الهاتف:</strong> " + person.phone : ""}
                </div>
                <div style="text-align:left">
                    <strong>المحاسب</strong><br>
                    تطبيق محاسب
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>المنتج</th>
                        <th>السعر</th>
                        <th>الكمية</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    ${(inv.items || [])
                      .map(
                        (item) => `
                        <tr>
                            <td>${item.name || "منتج"}</td>
                            <td>${formatMoney(item.price)}</td>
                            <td>${item.quantity}</td>
                            <td>${formatMoney(item.price * item.quantity)}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
            <div style="text-align:center;margin-top:20px">
                <div>المجموع: ${formatMoney(inv.subtotal)}</div>
                ${inv.discount ? `<div>الخصم: -${formatMoney(inv.discount)}</div>` : ""}
                <div class="inv-total" style="margin-top:10px">الإجمالي: ${formatMoney(inv.grandTotal)}</div>
            </div>
            ${inv.notes ? `<div style="margin-top:20px;font-size:13px;color:#666"><strong>ملاحظات:</strong> ${inv.notes}</div>` : ""}
        </div>
    `;

  openModal("invoice-view-modal");
}

function printInvoice() {
  const content = document.getElementById("invoice-print-area");
  if (content) {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <title>فاتورة</title>
                    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Tajawal', sans-serif; padding: 30px; color: #1a1a2e; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right; }
                        th { background: #7c3aed; color: white; }
                        .inv-header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 20px; }
                        .inv-header h1 { color: #7c3aed; }
                        .inv-total { font-size: 22px; font-weight: 800; color: #7c3aed; }
                    </style>
                </head>
                <body>${content.innerHTML}</body>
                </html>
            `);
      printWindow.document.close();
      printWindow.print();
    }
  }
}

function exportInvoicePDF() {
  showToast("استخدم زر الطباعة ثم احفظ كـ PDF");
}

// ==========================================
// التقارير
// ==========================================
let reportCharts = {};

function generateReport() {
  const period = document.getElementById("report-period")?.value || "month";
  const txs = AppState.data.transactions;

  const filtered = filterByPeriod(txs, period);

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const count = filtered.length;

  const summary = document.getElementById("report-summary");
  if (summary) {
    summary.innerHTML = `
            <div class="report-card">
                <div class="report-label">الإيرادات</div>
                <div class="report-value income">${formatMoney(totalIncome)}</div>
            </div>
            <div class="report-card">
                <div class="report-label">المصروفات</div>
                <div class="report-value expense">${formatMoney(totalExpense)}</div>
            </div>
            <div class="report-card">
                <div class="report-label">صافي الربح</div>
                <div class="report-value profit">${formatMoney(netProfit)}</div>
            </div>
            <div class="report-card">
                <div class="report-label">عدد المعاملات</div>
                <div class="report-value">${count}</div>
            </div>
        `;
  }

  renderCharts(filtered, totalIncome, totalExpense);
}

function filterByPeriod(data, period) {
  const now = new Date();
  return data.filter((t) => {
    const d = new Date(t.date);
    switch (period) {
      case "today":
        return d.toDateString() === now.toDateString();
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      case "month":
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      case "year":
        return d.getFullYear() === now.getFullYear();
      case "all":
        return true;
      default:
        return true;
    }
  });
}

function renderCharts(filtered, totalIncome, totalExpense) {
  // Chart 1: Income vs Expense
  destroyChart("chart-income-expense");
  const ctx1 = document.getElementById("chart-income-expense");
  if (ctx1) {
    reportCharts["chart-income-expense"] = new Chart(ctx1, {
      type: "bar",
      data: {
        labels: ["الإيرادات", "المصروفات", "صافي الربح"],
        datasets: [
          {
            data: [totalIncome, totalExpense, totalIncome - totalExpense],
            backgroundColor: [
              "rgba(16, 185, 129, 0.6)",
              "rgba(239, 68, 68, 0.6)",
              "rgba(124, 58, 237, 0.6)",
            ],
            borderColor: ["#10b981", "#ef4444", "#7c3aed"],
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#a09cb0" },
            grid: { color: "rgba(124,58,237,0.1)" },
          },
          x: { ticks: { color: "#a09cb0" }, grid: { display: false } },
        },
      },
    });
  }

  // Chart 2: Categories
  destroyChart("chart-categories");
  const categories = {};
  filtered
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categories[t.category] =
        (categories[t.category] || 0) + parseFloat(t.amount || 0);
    });
  const ctx2 = document.getElementById("chart-categories");
  if (ctx2) {
    reportCharts["chart-categories"] = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels: Object.keys(categories),
        datasets: [
          {
            data: Object.values(categories),
            backgroundColor: [
              "#7c3aed",
              "#ec4899",
              "#06b6d4",
              "#f59e0b",
              "#10b981",
              "#ef4444",
              "#8b5cf6",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#a09cb0", font: { family: "Tajawal" } },
          },
        },
      },
    });
  }

  // Chart 3: Top Debtors
  destroyChart("chart-debtors");
  const people = AppState.data.people
    .map((p) => ({ name: p.name, balance: getPersonBalance(p.id) }))
    .filter((p) => p.balance < 0)
    .sort((a, b) => a.balance - b.balance)
    .slice(0, 5);
  const ctx3 = document.getElementById("chart-debtors");
  if (ctx3) {
    reportCharts["chart-debtors"] = new Chart(ctx3, {
      type: "bar",
      data: {
        labels: people.map((p) => p.name),
        datasets: [
          {
            data: people.map((p) => Math.abs(p.balance)),
            backgroundColor: "rgba(239, 68, 68, 0.6)",
            borderColor: "#ef4444",
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: "#a09cb0" },
            grid: { color: "rgba(124,58,237,0.1)" },
          },
          y: {
            ticks: { color: "#a09cb0", font: { family: "Tajawal" } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // Chart 4: Top Products
  destroyChart("chart-top-products");
  const topProducts = [...AppState.data.products]
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 5);
  const ctx4 = document.getElementById("chart-top-products");
  if (ctx4) {
    reportCharts["chart-top-products"] = new Chart(ctx4, {
      type: "bar",
      data: {
        labels: topProducts.map((p) => p.name),
        datasets: [
          {
            data: topProducts.map((p) => p.soldCount || 0),
            backgroundColor: "rgba(124, 58, 237, 0.6)",
            borderColor: "#7c3aed",
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: "#a09cb0" },
            grid: { color: "rgba(124,58,237,0.1)" },
          },
          x: { ticks: { color: "#a09cb0" }, grid: { display: false } },
        },
      },
    });
  }
}

function destroyChart(id) {
  if (reportCharts[id]) {
    reportCharts[id].destroy();
    delete reportCharts[id];
  }
}

function exportReport(format) {
  showToast("جاري تصدير التقرير بصيغة " + format.toUpperCase());
  // تصدير بسيط
  const txs = AppState.data.transactions;
  if (format === "csv") {
    let csv = "النوع,المبلغ,التصنيف,الوصف,التاريخ\n";
    txs.forEach((t) => {
      csv += `${t.type},${t.amount},${t.category},"${t.description || ""}",${formatDate(t.date)}\n`;
    });
    downloadFile(csv, "report.csv", "text/csv");
  } else if (format === "excel") {
    // تصدير بسيط كـ CSV مع امتداد xlsx
    let csv = "النوع,المبلغ,التصنيف,الوصف,التاريخ\n";
    txs.forEach((t) => {
      csv += `${t.type},${t.amount},${t.category},"${t.description || ""}",${formatDate(t.date)}\n`;
    });
    downloadFile(csv, "report.xlsx", "application/vnd.ms-excel");
  } else if (format === "pdf") {
    showToast("استخدم الطباعة ثم احفظ كـ PDF");
  }
}

// ==========================================
// الأرشيف
// ==========================================
function renderArchive() {
  renderArchiveTab(
    "archive-transactions",
    AppState.data.archive.transactions,
    "transaction",
  );
  renderArchiveTab(
    "archive-invoices",
    AppState.data.archive.invoices,
    "invoice",
  );
  renderArchiveTab("archive-people", AppState.data.archive.people, "person");
}

function renderArchiveTab(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = items.length
    ? items
        .map((item) => {
          if (type === "transaction") {
            return `
                <div class="list-item">
                    <div class="item-icon ${item.type}"><i class="fas fa-${item.type === "income" ? "arrow-down" : "arrow-up"}"></i></div>
                    <div class="item-info">
                        <div class="item-title">${item.description || item.category}</div>
                        <div class="item-subtitle">${formatDate(item.archivedAt)}</div>
                    </div>
                    <div class="item-amount ${item.type}">${formatMoney(item.amount)}</div>
                    <div class="item-actions" onclick="event.stopPropagation()">
                        <button class="item-action-btn" onclick="restoreArchiveItem('${type}','${item.id}')"><i class="fas fa-undo"></i></button>
                        <button class="item-action-btn delete" onclick="deleteArchiveItem('${type}','${item.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
          } else if (type === "invoice") {
            return `
                <div class="list-item">
                    <div class="item-icon"><i class="fas fa-file-invoice"></i></div>
                    <div class="item-info">
                        <div class="item-title">${item.number}</div>
                        <div class="item-subtitle">${formatDate(item.archivedAt)}</div>
                    </div>
                    <div class="item-amount income">${formatMoney(item.grandTotal)}</div>
                    <div class="item-actions" onclick="event.stopPropagation()">
                        <button class="item-action-btn" onclick="restoreArchiveItem('${type}','${item.id}')"><i class="fas fa-undo"></i></button>
                        <button class="item-action-btn delete" onclick="deleteArchiveItem('${type}','${item.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
          } else if (type === "person") {
            return `
                <div class="list-item">
                    <div class="item-icon"><i class="fas fa-user"></i></div>
                    <div class="item-info">
                        <div class="item-title">${item.name}</div>
                        <div class="item-subtitle">${formatDate(item.archivedAt)}</div>
                    </div>
                    <div class="item-actions" onclick="event.stopPropagation()">
                        <button class="item-action-btn" onclick="restoreArchiveItem('${type}','${item.id}')"><i class="fas fa-undo"></i></button>
                        <button class="item-action-btn delete" onclick="deleteArchiveItem('${type}','${item.id}')"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
          }
          return "";
        })
        .join("")
    : '<div class="empty-state"><p>لا يوجد عناصر مؤرشفة</p></div>';
}

function restoreArchiveItem(type, id) {
  const archive =
    AppState.data.archive[
      type === "transaction"
        ? "transactions"
        : type === "invoice"
          ? "invoices"
          : "people"
    ];
  const idx = archive.findIndex((i) => i.id === id);
  if (idx === -1) return;

  const item = archive.splice(idx, 1)[0];
  delete item.archivedAt;

  if (type === "transaction") AppState.data.transactions.push(item);
  else if (type === "invoice") AppState.data.invoices.push(item);
  else if (type === "person") AppState.data.people.push(item);

  saveData();
  showToast("تم استرجاع العنصر");
  renderArchive();
  updateDashboard();
}

function deleteArchiveItem(type, id) {
  const archive =
    AppState.data.archive[
      type === "transaction"
        ? "transactions"
        : type === "invoice"
          ? "invoices"
          : "people"
    ];
  const idx = archive.findIndex((i) => i.id === id);
  if (idx === -1) return;

  archive.splice(idx, 1);
  saveData();
  showToast("تم الحذف نهائياً");
  renderArchive();
}

function switchArchiveTab(btn) {
  document
    .querySelectorAll(".archive-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".archive-content")
    .forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  const tabId = btn.dataset.tab;
  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");
}

// ==========================================
// النسخ الاحتياطي
// ==========================================
function backupData() {
  const data = {
    version: "1.0",
    date: new Date().toISOString(),
    settings: AppState.settings,
    transactions: AppState.data.transactions,
    people: AppState.data.people,
    accounts: AppState.data.accounts,
    products: AppState.data.products,
    invoices: AppState.data.invoices,
    archive: AppState.data.archive,
    calcHistory: AppState.data.calcHistory,
  };

  const json = JSON.stringify(data, null, 2);
  downloadFile(
    json,
    `muhasib-backup-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
  );
  showToast("تم تصدير النسخة الاحتياطية");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.transactions) AppState.data.transactions = data.transactions;
      if (data.people) AppState.data.people = data.people;
      if (data.accounts) AppState.data.accounts = data.accounts;
      if (data.products) AppState.data.products = data.products;
      if (data.invoices) AppState.data.invoices = data.invoices;
      if (data.archive) AppState.data.archive = data.archive;
      if (data.calcHistory) AppState.data.calcHistory = data.calcHistory;
      if (data.settings) {
        AppState.settings = { ...AppState.settings, ...data.settings };
        saveSettings();
      }
      saveData();
      showToast("تم استيراد النسخة الاحتياطية بنجاح");
      closeModal("backup-modal");
      location.reload();
    } catch (err) {
      showToast("خطأ في قراءة الملف");
    }
  };
  reader.readAsText(file);
}

function exportData(format) {
  const data = {
    transactions: AppState.data.transactions,
    people: AppState.data.people,
    accounts: AppState.data.accounts,
    products: AppState.data.products,
    invoices: AppState.data.invoices,
  };

  if (format === "json") {
    downloadFile(
      JSON.stringify(data, null, 2),
      "muhasib-export.json",
      "application/json",
    );
  } else if (format === "csv") {
    let csv = "النوع,المبلغ,التصنيف,الوصف,التاريخ,الشخص\n";
    data.transactions.forEach((t) => {
      csv += `${t.type},${t.amount},${t.category},"${t.description || ""}",${formatDate(t.date)},"${getPersonName(t.personId)}"\n`;
    });
    downloadFile(csv, "muhasib-transactions.csv", "text/csv");
  } else if (format === "excel") {
    let csv = "النوع,المبلغ,التصنيف,الوصف,التاريخ,الشخص\n";
    data.transactions.forEach((t) => {
      csv += `${t.type},${t.amount},${t.category},"${t.description || ""}",${formatDate(t.date)},"${getPersonName(t.personId)}"\n`;
    });
    downloadFile(csv, "muhasib-export.xlsx", "application/vnd.ms-excel");
  }
  showToast("تم التصدير");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// ترتيب الصفحة الرئيسية
// ==========================================
function renderDashboardOrder() {
  const container = document.getElementById("dashboard-order");
  if (!container) return;

  const cards = [
    { id: "dash-card-last-tx", name: "آخر معاملة" },
    { id: "dash-card-top-expense", name: "أعلى مصروف" },
    { id: "dash-card-top-debtor", name: "أكثر عميل مديون" },
    { id: "dash-card-top-product", name: "أكثر منتج مبيعاً" },
    { id: "dash-card-last-invoice", name: "آخر فاتورة" },
    { id: "dash-card-invoice-count", name: "عدد الفواتير" },
    { id: "dash-card-people-count", name: "عدد العملاء" },
    { id: "dash-card-products-count", name: "عدد المنتجات" },
  ];

  container.innerHTML = cards
    .map((card) => {
      const el = document.getElementById(card.id);
      const hidden = el ? el.style.display === "none" : false;
      return `
            <div class="order-item" draggable="true" data-card="${card.id}">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <span>${card.name}</span>
                <label class="toggle-switch">
                    <input type="checkbox" ${hidden ? "" : "checked"} onchange="toggleDashCard('${card.id}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    })
    .join("");

  // تفعيل السحب والإفلات
  initDragDrop();
}

function toggleDashCard(cardId, visible) {
  const el = document.getElementById(cardId);
  if (el) {
    el.style.display = visible ? "" : "none";
  }
}

function initDragDrop() {
  const container = document.getElementById("dashboard-order");
  if (!container) return;

  let draggedItem = null;

  container.addEventListener("dragstart", (e) => {
    draggedItem = e.target.closest(".order-item");
    if (draggedItem) draggedItem.style.opacity = "0.5";
  });

  container.addEventListener("dragend", (e) => {
    if (draggedItem) draggedItem.style.opacity = "1";
    draggedItem = null;
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement) {
      container.insertBefore(draggedItem, afterElement);
    } else {
      container.appendChild(draggedItem);
    }
  });

  function getDragAfterElement(container, y) {
    const elements = [
      ...container.querySelectorAll('.order-item:not([style*="opacity: 0.5"])'),
    ];
    return elements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element;
  }
}

// ==========================================
// أدوات مساعدة
// ==========================================
function formatMoney(amount) {
  const num = parseFloat(amount) || 0;
  const symbol = AppState.settings.currencySymbol || "ر.س";
  return (
    num.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) +
    " " +
    symbol
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPersonName(personId) {
  if (!personId) return "بدون شخص";
  const person = AppState.data.people.find((p) => p.id === personId);
  return person ? person.name : "غير محدد";
}

function updatePersonBalance(personId, amount, type) {
  // يتم حساب الرصيد ديناميكياً من المعاملات
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const msg = document.getElementById("toast-message");
  if (toast && msg) {
    msg.textContent = message;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
  }
}

function hideToast() {
  const toast = document.getElementById("toast");
  if (toast) toast.classList.add("hidden");
}

function hapticFeedback() {
  if (AppState.settings.haptic && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

// إضافة حدث لصورة المنتج
document.addEventListener("DOMContentLoaded", () => {
  const productImage = document.getElementById("product-image");
  if (productImage) {
    productImage.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById("product-image-preview");
      if (file && preview) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.src = ev.target.result;
          preview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // إضافة حدث لصورة المعاملة
  const txImage = document.getElementById("tx-image");
  if (txImage) {
    txImage.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById("tx-image-preview");
      if (file && preview) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.src = ev.target.result;
          preview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // إضافة حدث للباركود
  const barcodeInput = document.getElementById("product-barcode");
  if (barcodeInput) {
    barcodeInput.addEventListener("input", () => {
      const qrDiv = document.getElementById("product-qrcode");
      if (qrDiv && typeof QRCode !== "undefined") {
        qrDiv.innerHTML = "";
        const val = barcodeInput.value.trim();
        if (val) {
          new QRCode(qrDiv, { text: val, width: 128, height: 128 });
        }
      }
    });
  }

  // تحديث عرض الحاسبة عند الدخول
  renderCalcHistory();
});
س;
