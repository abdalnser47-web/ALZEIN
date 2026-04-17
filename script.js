/* ============================================
   مدير الديون والمصاريف - JavaScript
   ============================================ */

// ===== البيانات الأساسية =====
const APP_KEY = 'debt_manager_v1';

function getDB() {
    const def = {
        people: [],
        debts: [],
        transactions: [],
        archive: { debts: [], people: [], transactions: [] },
        settings: {
            vibration: true,
            currency: 'IQD',
            animations: true,
            dashboardCards: ['balance', 'owed', 'owe', 'expenses', 'incomes', 'net', 'lastOp', 'nearestDebt', 'topDebtor', 'peopleCount', 'unpaidCount', 'lateCount', 'usage', 'lastNotif'],
            cardStyle: 'default'
        },
        activation: {
            status: 'free', // free, activated, expired, suspended
            code: null,
            usedActions: 0,
            maxFreeActions: 300
        },
        notifications: [],
        backupDate: null,
        admin: {
            adminPassword: 'admin123',
            customAlerts: []
        }
    };
    try {
        const stored = localStorage.getItem(APP_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...def, ...parsed };
        }
    } catch (e) { /* ignore */ }
    return def;
}

function saveDB(db) {
    try {
        localStorage.setItem(APP_KEY, JSON.stringify(db));
    } catch (e) {
        showToast('خطأ في حفظ البيانات', 'error');
    }
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatMoney(amount) {
    const db = getDB();
    const curr = db.settings.currency || 'IQD';
    const num = Number(amount) || 0;
    return num.toLocaleString('ar-IQ') + ' ' + curr;
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getToday() {
    return new Date().toISOString().split('T')[0];
}

// ===== التنقل =====
let currentPage = 'page-home';
let pageHistory = [];

function MapsTo(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));

    const target = document.getElementById(pageId);
    if (!target) {
        showToast('الصفحة غير موجودة', 'error');
        return;
    }

    if (currentPage !== pageId) {
        pageHistory.push(currentPage);
    }

    target.classList.add('active');
    currentPage = pageId;

    // تحديث أزرار التنقل
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // إظهار/إخفاء FAB حسب الصفحة
    const fab = document.getElementById('fab-btn');
    if (fab) {
        const fabPages = ['page-home', 'page-debts', 'page-people', 'page-transactions'];
        fab.style.display = fabPages.includes(pageId) ? 'flex' : 'none';
    }

    // تحديث محتوى الصفحة
    refreshPage(pageId);

    // اهتزاز
    hapticFeedback();
}

function goBack() {
    if (pageHistory.length > 0) {
        const prev = pageHistory.pop();
        MapsTo(prev);
    } else {
        MapsTo('page-home');
    }
}

function refreshPage(pageId) {
    switch (pageId) {
        case 'page-home': renderDashboard(); break;
        case 'page-debts': renderDebts(); break;
        case 'page-people': renderPeople(); break;
        case 'page-transactions': renderTransactions(); break;
        case 'page-calculator': break;
        case 'page-reports': renderReports(); break;
        case 'page-archive': renderArchive(); break;
        case 'page-activation': renderActivation(); break;
        case 'page-settings': renderSettings(); break;
        case 'page-admin': renderAdmin(); break;
        case 'page-notifications': renderNotifications(); break;
    }
}

// ===== الاهتزاز =====
function hapticFeedback() {
    const db = getDB();
    if (db.settings.vibration && navigator.vibrate) {
        navigator.vibrate(15);
    }
}

// ===== Toast =====
function showToast(message, type = 'info', actions = []) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} toast-icon"></i>
        <span class="toast-text">${message}</span>
        ${actions.length ? '<div class="toast-actions">' + actions.map(a =>
            `<button class="${a.class}" onclick="${a.action}">${a.label}</button>`
        ).join('') + '</div>' : ''}
    `;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3000);
}

// ===== Modals =====
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

// ===== نظام الحركات =====
function incrementAction() {
    const db = getDB();
    db.activation.usedActions++;
    saveDB(db);

    if (db.activation.status === 'free' && db.activation.usedActions > db.activation.maxFreeActions) {
        db.activation.status = 'expired';
        saveDB(db);
        showToast('انتهت الحركات المجانية! قم بتفعيل الحساب', 'warning');
    }

    updateNotifBadge();
}

function canAct() {
    const db = getDB();
    if (db.activation.status === 'suspended') {
        showToast('الحساب موقوف. تواصل مع الدعم', 'error');
        return false;
    }
    if (db.activation.status === 'expired' && db.activation.usedActions > db.activation.maxFreeActions) {
        showToast('انتهت الحركات المجانية. قم بتفعيل الحساب', 'warning');
        return false;
    }
    return true;
}

// ===== التنبيهات =====
function updateNotifBadge() {
    const db = getDB();
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = db.notifications.filter(n => !n.read).length;
    badge.textContent = count > 0 ? count : '';
    badge.setAttribute('data-count', count);
}

function addNotification(title, desc, type = 'info') {
    const db = getDB();
    db.notifications.unshift({
        id: generateId(),
        title,
        desc,
        type,
        date: new Date().toISOString(),
        read: false
    });
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
    saveDB(db);
    updateNotifBadge();
}

function checkDebtAlerts() {
    const db = getDB();
    const today = getToday();

    db.debts.forEach(debt => {
        if (debt.status === 'مدفوع' || debt.archived) return;

        if (debt.dueDate && debt.dueDate < today && debt.status !== 'متأخر') {
            debt.status = 'متأخر';
            addNotification('دين متأخر', `الدين المرتبط بـ ${debt.personName} متأخر عن السداد`, 'warning');
        }

        if (debt.dueDate) {
            const due = new Date(debt.dueDate);
            const now = new Date();
            const diff = (due - now) / (1000 * 60 * 60 * 24);
            if (diff > 0 && diff <= 3 && debt.status !== 'مدفوع') {
                addNotification('دين قريب الاستحقاق', `الدين المرتبط بـ ${debt.personName} يستحق خلال ${Math.ceil(diff)} أيام`, 'info');
            }
        }
    });

    saveDB(db);
}

// ===== Dashboard =====
function renderDashboard() {
    const db = getDB();
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    const totalOwed = db.debts.filter(d => d.type === 'لي' && d.status !== 'مدفوع').reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalIOwe = db.debts.filter(d => d.type === 'علي' && d.status !== 'مدفوع').reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalExpenses = db.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalIncomes = db.transactions.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const netBalance = totalIncomes - totalExpenses;
    const unpaidDebts = db.debts.filter(d => d.status !== 'مدفوع' && !d.archived).length;
    const lateDebts = db.debts.filter(d => d.status === 'متأخر' && !d.archived).length;
    const remainingActions = Math.max(0, db.activation.maxFreeActions - db.activation.usedActions);

    // أقرب دين مستحق
    const today = getToday();
    const upcomingDebts = db.debts.filter(d => d.dueDate && d.dueDate >= today && d.status !== 'مدفوع' && !d.archived)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const nearestDebt = upcomingDebts[0];

    // أكثر شخص عليه ديون
    const personDebtCount = {};
    db.debts.filter(d => d.status !== 'مدفوع' && !d.archived).forEach(d => {
        personDebtCount[d.personName] = (personDebtCount[d.personName] || 0) + (Number(d.amount) || 0);
    });
    let topDebtor = { name: 'لا يوجد', amount: 0 };
    Object.entries(personDebtCount).forEach(([name, amount]) => {
        if (amount > topDebtor.amount) topDebtor = { name, amount };
    });

    // آخر عملية
    const lastOp = db.transactions.length > 0 ? db.transactions[0] : null;
    const lastNotif = db.notifications.length > 0 ? db.notifications[0] : null;

    const cards = {
        balance: { label: 'الرصيد الحالي', value: formatMoney(netBalance), icon: 'fa-wallet', color: 'cyan' },
        owed: { label: 'مجموع ما لي', value: formatMoney(totalOwed), icon: 'fa-arrow-down', color: 'green' },
        owe: { label: 'مجموع ما علي', value: formatMoney(totalIOwe), icon: 'fa-arrow-up', color: 'red' },
        expenses: { label: 'إجمالي المصروفات', value: formatMoney(totalExpenses), icon: 'fa-minus-circle', color: 'red' },
        incomes: { label: 'إجمالي الإيرادات', value: formatMoney(totalIncomes), icon: 'fa-plus-circle', color: 'green' },
        net: { label: 'صافي الرصيد', value: formatMoney(netBalance), icon: 'fa-balance-scale', color: 'purple' },
        lastOp: { label: 'آخر عملية', value: lastOp ? `${lastOp.type === 'expense' ? 'مصروف' : 'إيراد'} ${formatMoney(lastOp.amount)}` : 'لا توجد', icon: 'fa-clock', color: 'blue' },
        nearestDebt: { label: 'أقرب دين مستحق', value: nearestDebt ? `${nearestDebt.personName} - ${formatMoney(nearestDebt.amount)}` : 'لا يوجد', icon: 'fa-calendar', color: 'yellow' },
        topDebtor: { label: 'أكثر مدين', value: `${topDebtor.name} - ${formatMoney(topDebtor.amount)}`, icon: 'fa-user', color: 'purple' },
        peopleCount: { label: 'عدد الأشخاص', value: db.people.length, icon: 'fa-users', color: 'cyan' },
        unpaidCount: { label: 'ديون غير مدفوعة', value: unpaidDebts, icon: 'fa-exclamation', color: 'red' },
        lateCount: { label: 'ديون متأخرة', value: lateDebts, icon: 'fa-clock', color: 'yellow' },
        usage: { label: 'الحركات المتبقية', value: `${remainingActions} / ${db.activation.maxFreeActions}`, icon: 'fa-bolt', color: 'purple' },
        lastNotif: { label: 'آخر تنبيه', value: lastNotif ? lastNotif.title : 'لا توجد', icon: 'fa-bell', color: 'blue' }
    };

    const order = db.settings.dashboardCards || Object.keys(cards);
    grid.innerHTML = order.map(key => {
        const c = cards[key];
        if (!c) return '';
        return `
            <div class="dash-card">
                <div class="card-icon ${c.color}"><i class="fas ${c.icon}"></i></div>
                <div class="card-label">${c.label}</div>
                <div class="card-value">${c.value}</div>
            </div>
        `;
    }).join('');

    // آخر العمليات
    const recentEl = document.getElementById('recent-operations');
    if (recentEl) {
        const recent = [...db.transactions, ...db.debts.map(d => ({
            ...d,
            type: 'debt',
            amount: d.amount - (d.paid || 0)
        }))].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);

        if (recent.length === 0) {
            recentEl.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>لا توجد عمليات بعد</p></div>';
        } else {
            recentEl.innerHTML = recent.map(op => {
                const isIncome = op.type === 'income';
                const isDebt = op.type === 'debt';
                const icon = isIncome ? 'fa-arrow-down' : isDebt ? 'fa-file-invoice-dollar' : 'fa-arrow-up';
                const color = isIncome ? 'green' : isDebt ? 'purple' : 'red';
                const amountClass = isIncome ? 'positive' : 'negative';
                const title = isDebt ? op.personName : (isIncome ? 'إيراد' : 'مصروف');
                return `
                    <div class="list-item">
                        <div class="item-icon ${color}"><i class="fas ${icon}"></i></div>
                        <div class="item-content">
                            <div class="item-title">${title}</div>
                            <div class="item-subtitle">${formatDate(op.date)}</div>
                        </div>
                        <div class="item-amount ${amountClass}">${isIncome ? '+' : '-'}${formatMoney(op.amount)}</div>
                    </div>
                `;
            }).join('');
        }
    }
}

// ===== الديون =====
function renderDebts() {
    const db = getDB();
    const list = document.getElementById('debts-list');
    if (!list) return;

    let debts = db.debts.filter(d => !d.archived);

    // تطبيق الفلاتر
    const typeFilter = document.getElementById('filter-debt-type');
    const statusFilter = document.getElementById('filter-debt-status');
    const personFilter = document.getElementById('filter-debt-person');

    if (typeFilter && typeFilter.value !== 'all') {
        debts = debts.filter(d => d.type === typeFilter.value);
    }
    if (statusFilter && statusFilter.value !== 'all') {
        debts = debts.filter(d => d.status === statusFilter.value);
    }
    if (personFilter && personFilter.value !== 'all') {
        debts = debts.filter(d => d.personId === personFilter.value);
    }

    // البحث
    const searchInput = document.getElementById('debt-search-input');
    if (searchInput && searchInput.value) {
        const q = searchInput.value.toLowerCase();
        debts = debts.filter(d =>
            d.personName.toLowerCase().includes(q) ||
            (d.notes && d.notes.toLowerCase().includes(q)) ||
            String(d.amount).includes(q)
        );
    }

    debts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalOwed = db.debts.filter(d => d.type === 'لي' && d.status !== 'مدفوع').reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0);
    const totalIOwe = db.debts.filter(d => d.type === 'علي' && d.status !== 'مدفوع').reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0);
    const net = totalOwed - totalIOwe;

    const owedEl = document.getElementById('total-owed-me');
    const iOweEl = document.getElementById('total-i-owe');
    const netEl = document.getElementById('total-net-debts');
    if (owedEl) owedEl.textContent = formatMoney(totalOwed);
    if (iOweEl) iOweEl.textContent = formatMoney(totalIOwe);
    if (netEl) netEl.textContent = formatMoney(net);

    // ملء فلتر الأشخاص
    if (personFilter) {
        personFilter.innerHTML = '<option value="all">جميع الأشخاص</option>';
        db.people.forEach(p => {
            personFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }

    if (debts.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>لا توجد ديون</p></div>';
    } else {
        list.innerHTML = debts.map(d => {
            const remaining = Number(d.amount) - Number(d.paid || 0);
            const statusClass = d.status === 'مدفوع' ? 'status-paid' : d.status === 'متأخر' ? 'status-late' : d.status === 'جزئي' ? 'status-partial' : 'status-unpaid';
            const typeIcon = d.type === 'لي' ? 'fa-arrow-down' : 'fa-arrow-up';
            const typeColor = d.type === 'لي' ? 'green' : 'red';
            const amountClass = d.type === 'لي' ? 'positive' : 'negative';

            return `
                <div class="list-item" data-id="${d.id}" ontouchstart="startSwipe(event, '${d.id}')" ontouchmove="moveSwipe(event)" ontouchend="endSwipe(event, '${d.id}')">
                    <div class="item-icon ${typeColor}"><i class="fas ${typeIcon}"></i></div>
                    <div class="item-content" onclick="viewDebt('${d.id}')">
                        <div class="item-title">${d.personName}</div>
                        <div class="item-subtitle">${formatDate(d.date)} ${d.dueDate ? '| استحقاق: ' + formatDate(d.dueDate) : ''}</div>
                    </div>
                    <span class="item-status ${statusClass}">${d.status}</span>
                    <div class="item-amount ${amountClass}">${formatMoney(remaining)}</div>
                </div>
            `;
        }).join('');
    }
}

function showDebtSearch() {
    const bar = document.getElementById('debt-search-bar');
    if (bar) bar.style.display = 'flex';
    const input = document.getElementById('debt-search-input');
    if (input) input.focus();
}

function hideDebtSearch() {
    const bar = document.getElementById('debt-search-bar');
    if (bar) bar.style.display = 'none';
    const input = document.getElementById('debt-search-input');
    if (input) input.value = '';
    renderDebts();
}

function toggleDebtFilter() {
    const bar = document.getElementById('debt-filter-bar');
    if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

function filterDebts() {
    renderDebts();
}

function toggleDebtType(btn) {
    const group = btn.parentElement;
    group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function saveDebt() {
    if (!canAct()) return;

    const editId = document.getElementById('debt-edit-id').value;
    const type = document.querySelector('#modal-debt .toggle-btn.active')?.dataset.val || 'لي';
    const personId = document.getElementById('debt-person').value;
    const person = getDB().people.find(p => p.id === personId);
    const amount = Number(document.getElementById('debt-amount').value) || 0;
    const paid = Number(document.getElementById('debt-paid').value) || 0;
    const date = document.getElementById('debt-date').value || getToday();
    const dueDate = document.getElementById('debt-due-date').value;
    const status = document.getElementById('debt-status').value;
    const notes = document.getElementById('debt-notes').value;

    if (!personId || !amount) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
        return;
    }

    const db = getDB();

    if (editId) {
        const idx = db.debts.findIndex(d => d.id === editId);
        if (idx !== -1) {
            db.debts[idx] = { ...db.debts[idx], type, personId, personName: person.name, amount, paid, date, dueDate, status, notes };
        }
        showToast('تم تعديل الدين بنجاح', 'success');
    } else {
        db.debts.push({
            id: generateId(),
            type, personId, personName: person.name, amount, paid, date, dueDate, status, notes,
            payments: [],
            archived: false,
            createdAt: new Date().toISOString()
        });
        showToast('تم إضافة الدين بنجاح', 'success');
    }

    saveDB(db);
    incrementAction();
    closeModal('modal-debt');
    renderDebts();
}

function openAddDebt() {
    if (!canAct()) return;
    document.getElementById('modal-debt-title').textContent = 'إضافة دين جديد';
    document.getElementById('debt-edit-id').value = '';
    document.getElementById('debt-amount').value = '';
    document.getElementById('debt-paid').value = '0';
    document.getElementById('debt-date').value = getToday();
    document.getElementById('debt-due-date').value = '';
    document.getElementById('debt-notes').value = '';
    document.getElementById('debt-image-preview').innerHTML = '';

    // ملء قائمة الأشخاص
    const db = getDB();
    const select = document.getElementById('debt-person');
    select.innerHTML = '<option value="">اختر شخص</option>';
    db.people.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });

    // تعيين النوع الافتراضي
    const toggles = document.querySelectorAll('#modal-debt .toggle-btn');
    toggles.forEach(t => t.classList.remove('active'));
    toggles[0]?.classList.add('active');

    // تعيين الحالة الافتراضية
    document.getElementById('debt-status').value = 'غير مدفوع';

    openModal('modal-debt');
}

function openEditDebt(id) {
    const db = getDB();
    const debt = db.debts.find(d => d.id === id);
    if (!debt) return;

    document.getElementById('modal-debt-title').textContent = 'تعديل الدين';
    document.getElementById('debt-edit-id').value = debt.id;
    document.getElementById('debt-amount').value = debt.amount;
    document.getElementById('debt-paid').value = debt.paid;
    document.getElementById('debt-date').value = debt.date;
    document.getElementById('debt-due-date').value = debt.dueDate || '';
    document.getElementById('debt-notes').value = debt.notes || '';

    const select = document.getElementById('debt-person');
    select.innerHTML = '<option value="">اختر شخص</option>';
    db.people.forEach(p => {
        const sel = p.id === debt.personId ? 'selected' : '';
        select.innerHTML += `<option value="${p.id}" ${sel}>${p.name}</option>`;
    });

    const toggles = document.querySelectorAll('#modal-debt .toggle-btn');
    toggles.forEach(t => {
        t.classList.toggle('active', t.dataset.val === debt.type);
    });

    document.getElementById('debt-status').value = debt.status;

    if (debt.image) {
        document.getElementById('debt-image-preview').innerHTML = `<img src="${debt.image}" alt="إيصال">`;
    }

    openModal('modal-debt');
}

function viewDebt(id) {
    const db = getDB();
    const debt = db.debts.find(d => d.id === id);
    if (!debt) return;

    const remaining = Number(debt.amount) - Number(debt.paid || 0);
    showModalAlert(
        `دين: ${debt.personName}`,
        `
        <div class="debt-info-box">
            <p><strong>النوع:</strong> ${debt.type === 'لي' ? 'ما لي' : 'ما علي'}</p>
            <p><strong>المبلغ الكلي:</strong> ${formatMoney(debt.amount)}</p>
            <p><strong>المدفوع:</strong> ${formatMoney(debt.paid || 0)}</p>
            <p><strong>المتبقي:</strong> ${formatMoney(remaining)}</p>
            <p><strong>الحالة:</strong> ${debt.status}</p>
            <p><strong>تاريخ الإنشاء:</strong> ${formatDate(debt.date)}</p>
            <p><strong>تاريخ الاستحقاق:</strong> ${debt.dueDate ? formatDate(debt.dueDate) : 'غير محدد'}</p>
            <p><strong>ملاحظات:</strong> ${debt.notes || 'لا توجد'}</p>
        </div>
        <div class="person-actions" style="margin-top:12px">
            <button onclick="openPayment('${debt.id}')"><i class="fas fa-money-bill-wave"></i> سداد</button>
            <button onclick="viewPaymentHistory('${debt.id}')"><i class="fas fa-history"></i> السجل</button>
            <button onclick="openEditDebt('${debt.id}')"><i class="fas fa-edit"></i> تعديل</button>
        </div>
        `
    );
}

function openPayment(debtId) {
    closeModal('modal-alert');
    const db = getDB();
    const debt = db.debts.find(d => d.id === debtId);
    if (!debt) return;

    const remaining = Number(debt.amount) - Number(debt.paid || 0);
    document.getElementById('payment-debt-id').value = debtId;
    document.getElementById('payment-debt-info').innerHTML = `
        <p><strong>الشخص:</strong> ${debt.personName}</p>
        <p><strong>المتبقي:</strong> ${formatMoney(remaining)}</p>
    `;
    document.getElementById('payment-amount').value = '';
    document.getElementById('payment-date').value = getToday();
    document.getElementById('payment-notes').value = '';

    openModal('modal-payment');
}

function makePayment() {
    if (!canAct()) return;

    const debtId = document.getElementById('payment-debt-id').value;
    const amount = Number(document.getElementById('payment-amount').value) || 0;
    const date = document.getElementById('payment-date').value || getToday();
    const notes = document.getElementById('payment-notes').value;

    if (!debtId || !amount) {
        showToast('يرجى إدخال مبلغ السداد', 'error');
        return;
    }

    const db = getDB();
    const debt = db.debts.find(d => d.id === debtId);
    if (!debt) return;

    const remaining = Number(debt.amount) - Number(debt.paid || 0);
    if (amount > remaining) {
        showToast('مبلغ السداد أكبر من المتبقي', 'error');
        return;
    }

    debt.paid = (Number(debt.paid) || 0) + amount;
    debt.payments = debt.payments || [];
    debt.payments.push({ amount, date, notes, id: generateId() });

    if (debt.paid >= Number(debt.amount)) {
        debt.status = 'مدفوع';
        showToast('تم سداد الدين بالكامل!', 'success');
    } else {
        debt.status = 'جزئي';
        showToast(`تم سداد ${formatMoney(amount)}`, 'success');
    }

    saveDB(db);
    incrementAction();
    closeModal('modal-payment');
    renderDebts();
}

function viewPaymentHistory(debtId) {
    const db = getDB();
    const debt = db.debts.find(d => d.id === debtId);
    if (!debt) return;

    closeModal('modal-alert');
    const list = document.getElementById('payments-history-list');
    if (!list) return;

    if (!debt.payments || debt.payments.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>لا توجد دفعات</p></div>';
    } else {
        list.innerHTML = debt.payments.map(p => `
            <div class="payment-record">
                <div>
                    <div class="pr-amount">${formatMoney(p.amount)}</div>
                    <div class="pr-date">${formatDate(p.date)} ${p.notes ? '| ' + p.notes : ''}</div>
                </div>
            </div>
        `).join('');
    }

    openModal('modal-payments-history');
}

function deleteDebt(id) {
    const db = getDB();
    const idx = db.debts.findIndex(d => d.id === id);
    if (idx === -1) return;

    const deleted = db.debts.splice(idx, 1)[0];

    // حفظ للأرشيف
    db.archive.debts.push({ ...deleted, archived: true, archivedAt: new Date().toISOString() });

    saveDB(db);
    renderDebts();
    showToast('تم حذف الدين', 'info', [
        { label: 'تراجع', class: 'undo-btn', action: `undoDeleteDebt('${id}')` }
    ]);
}

function undoDeleteDebt(id) {
    const db = getDB();
    const archIdx = db.archive.debts.findIndex(d => d.id === id);
    if (archIdx === -1) return;

    const restored = db.archive.debts.splice(archIdx, 1)[0];
    delete restored.archived;
    delete restored.archivedAt;
    db.debts.push(restored);

    saveDB(db);
    renderDebts();
    showToast('تم استعادة الدين', 'success');
}

// ===== الأشخاص =====
function renderPeople() {
    const db = getDB();
    const grid = document.getElementById('people-grid');
    if (!grid) return;

    let people = db.people.filter(p => !p.archived);

    const searchInput = document.getElementById('people-search-input');
    if (searchInput && searchInput.value) {
        const q = searchInput.value.toLowerCase();
        people = people.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.phone && p.phone.includes(q)) ||
            (p.email && p.email.toLowerCase().includes(q))
        );
    }

    if (people.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-users"></i><p>لا يوجد أشخاص</p></div>';
    } else {
        grid.innerHTML = people.map(p => {
            const debtCount = db.debts.filter(d => d.personId === p.id && d.status !== 'مدفوع').length;
            const totalDebt = db.debts.filter(d => d.personId === p.id && d.status !== 'مدfوع').reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0);
            const avatarContent = p.image ? `<img src="${p.image}" alt="${p.name}">` : p.name.charAt(0);
            return `
                <div class="person-card" onclick="openPersonDetail('${p.id}')">
                    <div class="avatar">${avatarContent}</div>
                    <div class="person-name">${p.name}</div>
                    <div class="person-debts">${debtCount} ديون نشطة</div>
                </div>
            `;
        }).join('');
    }
}

function showPeopleSearch() {
    const bar = document.getElementById('people-search-bar');
    if (bar) bar.style.display = 'flex';
    const input = document.getElementById('people-search-input');
    if (input) input.focus();
}

function hidePeopleSearch() {
    const bar = document.getElementById('people-search-bar');
    if (bar) bar.style.display = 'none';
    const input = document.getElementById('people-search-input');
    if (input) input.value = '';
    renderPeople();
}

function filterPeople() {
    renderPeople();
}

function openAddPerson() {
    if (!canAct()) return;
    document.getElementById('modal-person-title').textContent = 'إضافة شخص جديد';
    document.getElementById('person-edit-id').value = '';
    document.getElementById('person-name').value = '';
    document.getElementById('person-phone').value = '';
    document.getElementById('person-email').value = '';
    document.getElementById('person-address').value = '';
    document.getElementById('person-notes').value = '';
    document.getElementById('person-avatar-preview').src = '';
    openModal('modal-person');
}

function openEditPerson(id) {
    const db = getDB();
    const person = db.people.find(p => p.id === id);
    if (!person) return;

    document.getElementById('modal-person-title').textContent = 'تعديل بيانات الشخص';
    document.getElementById('person-edit-id').value = person.id;
    document.getElementById('person-name').value = person.name;
    document.getElementById('person-phone').value = person.phone || '';
    document.getElementById('person-email').value = person.email || '';
    document.getElementById('person-address').value = person.address || '';
    document.getElementById('person-notes').value = person.notes || '';
    if (person.image) {
        document.getElementById('person-avatar-preview').src = person.image;
    }

    openModal('modal-person');
}

function savePerson() {
    if (!canAct()) return;

    const editId = document.getElementById('person-edit-id').value;
    const name = document.getElementById('person-name').value.trim();
    const phone = document.getElementById('person-phone').value.trim();
    const email = document.getElementById('person-email').value.trim();
    const address = document.getElementById('person-address').value.trim();
    const notes = document.getElementById('person-notes').value.trim();
    const avatar = document.getElementById('person-avatar-preview').src;

    if (!name) {
        showToast('يرجى إدخال اسم الشخص', 'error');
        return;
    }

    const db = getDB();

    if (editId) {
        const idx = db.people.findIndex(p => p.id === editId);
        if (idx !== -1) {
            db.people[idx] = { ...db.people[idx], name, phone, email, address, notes, image: avatar.startsWith('data:') ? avatar : db.people[idx].image };
        }
        showToast('تم تعديل البيانات', 'success');
    } else {
        db.people.push({
            id: generateId(),
            name, phone, email, address, notes,
            image: avatar.startsWith('data:') ? avatar : '',
            createdAt: new Date().toISOString(),
            archived: false
        });
        showToast('تم إضافة الشخص', 'success');
    }

    saveDB(db);
    incrementAction();
    closeModal('modal-person');
    renderPeople();
}

function openPersonDetail(id) {
    const db = getDB();
    const person = db.people.find(p => p.id === id);
    if (!person) return;

    const owed = db.debts.filter(d => d.personId === id && d.type === 'لي' && d.status !== 'مدfوع').reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0);
    const iOwe = db.debts.filter(d => d.personId === id && d.type === 'علي' && d.status !== 'مدفوع').reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0);
    const debtCount = db.debts.filter(d => d.personId === id).length;
    const personTxs = db.transactions.filter(t => t.personId === id);

    const avatarContent = person.image ? `<img src="${person.image}" alt="${person.name}">` : person.name.charAt(0);

    document.getElementById('person-detail-name').textContent = person.name;
    document.getElementById('person-detail-content').innerHTML = `
        <div class="person-header-card">
            <div class="pd-avatar">${avatarContent}</div>
            <div class="pd-name">${person.name}</div>
            <div class="pd-id">${person.id}</div>
            <div class="contact-btns" style="margin-top:12px">
                ${person.phone ? `
                    <button onclick="window.open('tel:${person.phone}')"><i class="fas fa-phone"></i> اتصال</button>
                    <button onclick="copyText('${person.phone}')"><i class="fas fa-copy"></i> نسخ</button>
                ` : ''}
            </div>
        </div>
        <div class="person-info-grid">
            <div class="person-info-card">
                <div class="pic-label">مجموع ما له</div>
                <div class="pic-value" style="color:var(--success)">${formatMoney(owed)}</div>
            </div>
            <div class="person-info-card">
                <div class="pic-label">مجموع ما عليه</div>
                <div class="pic-value" style="color:var(--danger)">${formatMoney(iOwe)}</div>
            </div>
            <div class="person-info-card">
                <div class="pic-label">عدد الديون</div>
                <div class="pic-value">${debtCount}</div>
            </div>
            <div class="person-info-card">
                <div class="pic-label">العمليات</div>
                <div class="pic-value">${personTxs.length}</div>
            </div>
        </div>
        ${person.phone ? `
            <div class="person-info-card" style="margin-bottom:10px">
                <div class="pic-label">الهاتف</div>
                <div class="pic-value" style="direction:ltr;text-align:right">${person.phone}</div>
            </div>
        ` : ''}
        ${person.email ? `
            <div class="person-info-card" style="margin-bottom:10px">
                <div class="pic-label">البريد</div>
                <div class="pic-value" style="font-size:13px">${person.email}</div>
            </div>
        ` : ''}
        ${person.address ? `
            <div class="person-info-card" style="margin-bottom:10px">
                <div class="pic-label">العنوان</div>
                <div class="pic-value" style="font-size:13px">${person.address}</div>
            </div>
        ` : ''}
        ${person.notes ? `
            <div class="person-info-card" style="margin-bottom:10px">
                <div class="pic-label">ملاحظات</div>
                <div class="pic-value" style="font-size:13px">${person.notes}</div>
            </div>
        ` : ''}
        <div class="person-actions">
            <button onclick="openEditPerson('${person.id}')"><i class="fas fa-edit"></i> تعديل</button>
            <button onclick="confirmDeletePerson('${person.id}')"><i class="fas fa-trash"></i> حذف</button>
        </div>
        <div class="section-title"><i class="fas fa-file-invoice-dollar"></i> الديون المرتبطة</div>
        <div class="debts-list">
            ${db.debts.filter(d => d.personId === id && !d.archived).map(d => `
                <div class="list-item">
                    <div class="item-icon ${d.type === 'لي' ? 'green' : 'red'}">
                        <i class="fas ${d.type === 'لي' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                    </div>
                    <div class="item-content">
                        <div class="item-title">${d.type === 'لي' ? 'ما لي' : 'ما علي'} - ${formatMoney(d.amount)}</div>
                        <div class="item-subtitle">${formatDate(d.date)}</div>
                    </div>
                    <span class="item-status ${d.status === 'مدفوع' ? 'status-paid' : d.status === 'متأخر' ? 'status-late' : 'status-unpaid'}">${d.status}</span>
                </div>
            `).join('') || '<p style="color:var(--text-muted);text-align:center;padding:10px">لا توجد ديون</p>'}
        </div>
    `;

    MapsTo('page-person-detail');
}

function confirmDeletePerson(id) {
    showModalConfirm('حذف الشخص', 'هل تريد حذف هذا الشخص؟ سيتم أرشفة جميع ديونه.', () => deletePerson(id));
}

function deletePerson(id) {
    const db = getDB();
    const idx = db.people.findIndex(p => p.id === id);
    if (idx === -1) return;

    const deleted = db.people.splice(idx, 1)[0];
    deleted.archived = true;
    deleted.archivedAt = new Date().toISOString();
    db.archive.people.push(deleted);

    // أرشفة الديون المرتبطة
    db.debts.forEach(d => {
        if (d.personId === id) {
            const debtIdx = db.debts.indexOf(d);
            if (debtIdx !== -1) {
                const archDebt = db.debts.splice(debtIdx, 1)[0];
                archDebt.archived = true;
                archDebt.archivedAt = new Date().toISOString();
                db.archive.debts.push(archDebt);
            }
        }
    });

    saveDB(db);
    closeModal('modal-confirm');
    renderPeople();
    showToast('تم حذف الشخص وأرشفة ديونه', 'info', [
        { label: 'تراجع', class: 'undo-btn', action: `undoDeletePerson('${id}')` }
    ]);
}

function undoDeletePerson(id) {
    const db = getDB();
    const archIdx = db.archive.people.findIndex(p => p.id === id);
    if (archIdx === -1) return;

    const restored = db.archive.people.splice(archIdx, 1)[0];
    delete restored.archived;
    delete restored.archivedAt;
    db.people.push(restored);

    // استعادة الديون
    const archDebts = db.archive.debts.filter(d => d.personId === id);
    archDebts.forEach(ad => {
        const aIdx = db.archive.debts.indexOf(ad);
        if (aIdx !== -1) {
            const rd = db.archive.debts.splice(aIdx, 1)[0];
            delete rd.archived;
            delete rd.archivedAt;
            db.debts.push(rd);
        }
    });

    saveDB(db);
    renderPeople();
    showToast('تم استعادة الشخص', 'success');
}

function copyText(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    }
    showToast('تم النسخ', 'success');
}

function handlePersonImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('person-avatar-preview').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function handleDebtImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('debt-image-preview').innerHTML = `<img src="${e.target.result}" alt="إيصال">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function handleTxImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('tx-image-preview').innerHTML = `<img src="${e.target.result}" alt="إيصال">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ===== المصروفات والإيرادات =====
let currentTxTab = 'all';

function renderTransactions() {
    const db = getDB();
    const list = document.getElementById('transactions-list');
    if (!list) return;

    let txs = db.transactions.filter(t => !t.archived);

    if (currentTxTab !== 'all') {
        txs = txs.filter(t => t.type === currentTxTab);
    }

    const searchInput = document.getElementById('tx-search-input');
    if (searchInput && searchInput.value) {
        const q = searchInput.value.toLowerCase();
        txs = txs.filter(t =>
            t.category.toLowerCase().includes(q) ||
            (t.notes && t.notes.toLowerCase().includes(q)) ||
            String(t.amount).includes(q)
        );
    }

    txs.sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalExpenses = db.transactions.filter(t => t.type === 'expense' && !t.archived).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalIncomes = db.transactions.filter(t => t.type === 'income' && !t.archived).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const balance = totalIncomes - totalExpenses;

    const expEl = document.getElementById('total-expenses');
    const incEl = document.getElementById('total-incomes');
    const balEl = document.getElementById('current-balance');
    if (expEl) expEl.textContent = formatMoney(totalExpenses);
    if (incEl) incEl.textContent = formatMoney(totalIncomes);
    if (balEl) balEl.textContent = formatMoney(balance);

    if (txs.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-exchange-alt"></i><p>لا توجد عمليات</p></div>';
    } else {
        list.innerHTML = txs.map(t => {
            const icon = t.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up';
            const color = t.type === 'income' ? 'green' : 'red';
            const amountClass = t.type === 'income' ? 'positive' : 'negative';
            const catIcons = {
                'طعام': '🍔', 'مواصلات': '🚗', 'كهرباء': '💡', 'ماء': '💧',
                'إنترنت': '🌐', 'إيجار': '🏠', 'هاتف': '📱', 'أقساط': '📋',
                'علاج': '💊', 'مشتريات': '🛒', 'راتب': '💰', 'أخرى': '📦'
            };

            return `
                <div class="list-item">
                    <div class="item-icon ${color}"><i class="fas ${icon}"></i></div>
                    <div class="item-content">
                        <div class="item-title">${catIcons[t.category] || '📦'} ${t.category}</div>
                        <div class="item-subtitle">${formatDate(t.date)} ${t.notes ? '| ' + t.notes : ''}</div>
                    </div>
                    <div class="item-amount ${amountClass}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
                </div>
            `;
        }).join('');
    }
}

function switchTxTab(tab) {
    currentTxTab = tab;
    document.querySelectorAll('.tx-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    renderTransactions();
}

function showTxSearch() {
    const bar = document.getElementById('tx-search-bar');
    if (bar) bar.style.display = 'flex';
    const input = document.getElementById('tx-search-input');
    if (input) input.focus();
}

function hideTxSearch() {
    const bar = document.getElementById('tx-search-bar');
    if (bar) bar.style.display = 'none';
    const input = document.getElementById('tx-search-input');
    if (input) input.value = '';
    renderTransactions();
}

function filterTransactions() {
    renderTransactions();
}

function toggleTxType(btn) {
    const group = btn.parentElement;
    group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function openAddTransaction() {
    if (!canAct()) return;
    document.getElementById('modal-tx-title').textContent = 'إضافة عملية جديدة';
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-date').value = getToday();
    document.getElementById('tx-notes').value = '';
    document.getElementById('tx-image-preview').innerHTML = '';
    document.getElementById('tx-category').value = 'أخرى';

    const toggles = document.querySelectorAll('#modal-transaction .toggle-btn');
    toggles.forEach(t => t.classList.remove('active'));
    toggles[0]?.classList.add('active');

    openModal('modal-transaction');
}

function saveTransaction() {
    if (!canAct()) return;

    const type = document.querySelector('#modal-transaction .toggle-btn.active')?.dataset.val || 'expense';
    const amount = Number(document.getElementById('tx-amount').value) || 0;
    const category = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value || getToday();
    const notes = document.getElementById('tx-notes').value;

    if (!amount) {
        showToast('يرجى إدخال المبلغ', 'error');
        return;
    }

    const db = getDB();
    db.transactions.push({
        id: generateId(),
        type, amount, category, date, notes,
        archived: false,
        createdAt: new Date().toISOString()
    });

    saveDB(db);
    incrementAction();
    closeModal('modal-transaction');
    renderTransactions();
    showToast('تم إضافة العملية', 'success');
}

// ===== الحاسبة =====
let calcExpression = '';
let calcCurrent = '';
let calcResult = 0;
let calcHistory = [];

function calcAction(action, value) {
    hapticFeedback();

    if (action === 'clear') {
        calcExpression = '';
        calcCurrent = '';
        calcResult = 0;
    } else if (action === 'backspace') {
        calcCurrent = calcCurrent.slice(0, -1);
    } else if (action === 'num') {
        calcCurrent += value;
    } else if (action === 'dot') {
        if (!calcCurrent.includes('.')) calcCurrent += '.';
    } else if (action === 'op') {
        if (calcCurrent) {
            calcExpression += calcCurrent + ' ' + value + ' ';
            calcCurrent = '';
        }
    } else if (action === 'percent') {
        if (calcCurrent) {
            calcCurrent = String(Number(calcCurrent) / 100);
        }
    } else if (action === 'equals') {
        if (calcCurrent) {
            calcExpression += calcCurrent;
        }
        try {
            calcResult = Function('"use strict"; return (' + calcExpression + ')')();
            if (!isFinite(calcResult)) calcResult = 0;
        } catch (e) {
            calcResult = 0;
        }
        calcExpression = String(calcResult);
        calcCurrent = '';

        // حفظ في السجل
        calcHistory.unshift(calcExpression);
        if (calcHistory.length > 50) calcHistory = calcHistory.slice(0, 50);
        saveCalcHistory();
    }

    updateCalcDisplay();
}

function updateCalcDisplay() {
    const exprEl = document.getElementById('calc-expression');
    const resEl = document.getElementById('calc-result');
    if (exprEl) exprEl.textContent = calcExpression;
    if (resEl) resEl.textContent = calcCurrent || (calcResult || 0);
}

function saveCalcHistory() {
    try {
        localStorage.setItem(APP_KEY + '_calc', JSON.stringify(calcHistory));
    } catch (e) { /* ignore */ }
}

function loadCalcHistory() {
    try {
        const stored = localStorage.getItem(APP_KEY + '_calc');
        if (stored) calcHistory = JSON.parse(stored);
    } catch (e) { /* ignore */ }
    renderCalcHistory();
}

function renderCalcHistory() {
    const el = document.getElementById('calc-history');
    if (!el) return;
    if (calcHistory.length === 0) {
        el.innerHTML = '';
    } else {
        el.innerHTML = calcHistory.slice(0, 10).map(h => `
            <div class="calc-history-item" onclick="useCalcHistory('${h}')">${h}</div>
        `).join('');
    }
}

function useCalcHistory(val) {
    calcExpression = '';
    calcCurrent = val;
    calcResult = Number(val);
    updateCalcDisplay();
}

function adoptCalcAmount() {
    const amount = calcResult || Number(calcCurrent) || 0;
    if (!amount) {
        showToast('لا يوجد مبلغ لاعتماده', 'warning');
        return;
    }

    // فتح نافذة الإضافة المناسبة
    const modalType = prompt('ما نوع الإضافة؟ (1=دين, 2=مصروف/إيراد)', '1');
    if (modalType === '1') {
        closeModal('modal-alert');
        MapsTo('page-debts');
        setTimeout(() => {
            openAddDebt();
            document.getElementById('debt-amount').value = amount;
        }, 300);
    } else if (modalType === '2') {
        MapsTo('page-transactions');
        setTimeout(() => {
            openAddTransaction();
            document.getElementById('tx-amount').value = amount;
        }, 300);
    }
}

// ===== التقارير =====
let currentReport = 'monthly';

function renderReports() {
    const db = getDB();
    const content = document.getElementById('report-content');
    if (!content) return;

    const txs = db.transactions.filter(t => !t.archived);
    const debts = db.debts.filter(d => !d.archived);

    let filteredTxs = [];
    const now = new Date();

    if (currentReport === 'daily') {
        const today = getToday();
        filteredTxs = txs.filter(t => t.date === today);
    } else if (currentReport === 'weekly') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filteredTxs = txs.filter(t => new Date(t.date) >= weekAgo);
    } else if (currentReport === 'monthly') {
        const month = now.getMonth();
        const year = now.getFullYear();
        filteredTxs = txs.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === month && d.getFullYear() === year;
        });
    } else if (currentReport === 'yearly') {
        const year = now.getFullYear();
        filteredTxs = txs.filter(t => new Date(t.date).getFullYear() === year);
    }

    const totalExpenses = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalIncomes = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const net = totalIncomes - totalExpenses;

    const totalOwed = debts.filter(d => d.type === 'لي' && d.status !== 'مدfوع').reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0);
    const totalIOwe = debts.filter(d => d.type === 'علي' && d.status !== 'مدfوع').reduce((s, d) => s + (Number(d.amount) - Number(d.paid || 0)), 0);

    // تصنيف المصروفات
    const catCounts = {};
    filteredTxs.filter(t => t.type === 'expense').forEach(t => {
        catCounts[t.category] = (catCounts[t.category] || 0) + (Number(t.amount) || 0);
    });
    const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

    // أكثر شخص عليه ديون
    const personDebtCount = {};
    debts.filter(d => d.status !== 'مدfوع').forEach(d => {
        personDebtCount[d.personName] = (personDebtCount[d.personName] || 0) + 1;
    });
    const topDebtor = Object.entries(personDebtCount).sort((a, b) => b[1] - a[1])[0];

    const reportNames = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري', yearly: 'سنوي' };

    content.innerHTML = `
        <div class="report-summary">
            <div class="report-card">
                <div class="rc-label">المصروفات</div>
                <div class="rc-value" style="color:var(--danger)">${formatMoney(totalExpenses)}</div>
            </div>
            <div class="report-card">
                <div class="rc-label">الإيرادات</div>
                <div class="rc-value" style="color:var(--success)">${formatMoney(totalIncomes)}</div>
            </div>
            <div class="report-card">
                <div class="rc-label">صافي الرصيد</div>
                <div class="rc-value" style="color:var(--info)">${formatMoney(net)}</div>
            </div>
            <div class="report-card">
                <div class="rc-label">مجموع ما لك</div>
                <div class="rc-value" style="color:var(--success)">${formatMoney(totalOwed)}</div>
            </div>
            <div class="report-card">
                <div class="rc-label">مجموع ما عليك</div>
                <div class="rc-value" style="color:var(--danger)">${formatMoney(totalIOwe)}</div>
            </div>
            <div class="report-card">
                <div class="rc-label">عدد العمليات</div>
                <div class="rc-value">${filteredTxs.length}</div>
            </div>
            <div class="report-card">
                <div class="rc-label">أكثر مصروف</div>
                <div class="rc-value" style="font-size:14px">${topCategory ? topCategory[0] : 'لا يوجد'}</div>
            </div>
            <div class="report-card">
                <div class="rc-label">أكثر مدين</div>
                <div class="rc-value" style="font-size:14px">${topDebtor ? topDebtor[0] : 'لا يوجد'}</div>
            </div>
        </div>
        <div style="text-align:center;color:var(--text-muted);font-size:12px">تقرير ${reportNames[currentReport]} - ${formatDate(now)}</div>
    `;

    // الرسوم البيانية
    renderCharts(filteredTxs, catCounts);
}

function switchReport(type) {
    currentReport = type;
    document.querySelectorAll('.rpt-tab').forEach(t => {
        t.classList.toggle('active', t.textContent.includes(
            type === 'daily' ? 'يومي' : type === 'weekly' ? 'أسبوعي' : type === 'monthly' ? 'شهري' : 'سنوي'
        ));
    });
    renderReports();
}

function renderCharts(txs, catCounts) {
    const section = document.getElementById('charts-section');
    if (!section) return;

    // تدمير الرسوم السابقة
    section.innerHTML = '';

    if (Object.keys(catCounts).length === 0) return;

    const chartDiv = document.createElement('div');
    chartDiv.className = 'chart-container';
    const canvas = document.createElement('canvas');
    canvas.id = 'expense-chart';
    chartDiv.appendChild(canvas);
    section.appendChild(chartDiv);

    const labels = Object.keys(catCounts);
    const data = Object.values(catCounts);
    const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Tajawal' } }
                }
            }
        }
    });

    // رسم بياني شهري
    const monthlyDiv = document.createElement('div');
    monthlyDiv.className = 'chart-container';
    const canvas2 = document.createElement('canvas');
    canvas2.id = 'monthly-chart';
    monthlyDiv.appendChild(canvas2);
    section.appendChild(monthlyDiv);

    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthlyExp = new Array(12).fill(0);
    const monthlyInc = new Array(12).fill(0);
    const year = new Date().getFullYear();

    txs.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === year) {
            if (t.type === 'expense') monthlyExp[d.getMonth()] += Number(t.amount) || 0;
            else monthlyInc[d.getMonth()] += Number(t.amount) || 0;
        }
    });

    new Chart(canvas2, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'المصروفات',
                    data: monthlyExp,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderRadius: 6
                },
                {
                    label: 'الإيرادات',
                    data: monthlyInc,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: '#94a3b8', font: { family: 'Tajawal' } }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8', font: { family: 'Tajawal', size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function showExportMenu() {
    const menu = document.getElementById('export-menu');
    if (menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

function exportReport(format) {
    const db = getDB();
    const txs = db.transactions.filter(t => !t.archived);
    const debts = db.debts.filter(d => !d.archived);

    if (format === 'json') {
        const data = { transactions: txs, debts, exportDate: new Date().toISOString() };
        downloadFile(JSON.stringify(data, null, 2), 'report.json', 'application/json');
    } else if (format === 'csv') {
        let csv = 'النوع,المبلغ,التصنيف,التاريخ,ملاحظات\n';
        txs.forEach(t => {
            csv += `${t.type},${t.amount},${t.category},${t.date},${t.notes || ''}\n`;
        });
        downloadFile(csv, 'report.csv', 'text/csv');
    } else if (format === 'excel') {
        const wsData = [['النوع', 'المبلغ', 'التصنيف', 'التاريخ', 'ملاحظات']];
        txs.forEach(t => {
            wsData.push([t.type, t.amount, t.category, t.date, t.notes || '']);
        });
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
        XLSX.writeFile(wb, 'report.xlsx');
    } else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Financial Report', 10, 20);
        doc.setFontSize(12);
        let y = 40;
        txs.forEach(t => {
            doc.text(`${t.type}: ${t.amount} - ${t.category}`, 10, y);
            y += 10;
        });
        doc.save('report.pdf');
    }

    document.getElementById('export-menu').style.display = 'none';
    showToast('تم تصدير التقرير', 'success');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== الأرشيف =====
let currentArchive = 'debts';

function renderArchive() {
    const db = getDB();
    const list = document.getElementById('archive-list');
    if (!list) return;

    let items = [];

    if (currentArchive === 'debts') {
        items = db.archive.debts || [];
    } else if (currentArchive === 'people') {
        items = db.archive.people || [];
    } else if (currentArchive === 'transactions') {
        items = db.archive.transactions || [];
    }

    if (items.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-archive"></i><p>الأرشيف فارغ</p></div>';
    } else {
        list.innerHTML = items.map(item => {
            const name = item.name || item.personName || item.category || 'بدون اسم';
            const amount = item.amount ? formatMoney(item.amount) : '';
            const date = item.archivedAt ? formatDate(item.archivedAt) : '';
            return `
                <div class="list-item">
                    <div class="item-content">
                        <div class="item-title">${name}</div>
                        <div class="item-subtitle">${amount} | ${date}</div>
                    </div>
                    <div class="person-actions" style="gap:4px">
                        <button onclick="restoreFromArchive('${currentArchive}','${item.id}')" style="padding:6px 10px;font-size:11px">
                            <i class="fas fa-undo"></i> استعادة
                        </button>
                        <button onclick="permanentDelete('${currentArchive}','${item.id}')" style="padding:6px 10px;font-size:11px;color:var(--danger)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function switchArchive(type) {
    currentArchive = type;
    document.querySelectorAll('.arch-tab').forEach(t => {
        t.classList.toggle('active', t.textContent.includes(
            type === 'debts' ? 'ديون' : type === 'people' ? 'أشخاص' : 'عمليات'
        ));
    });
    renderArchive();
}

function restoreFromArchive(type, id) {
    const db = getDB();
    let archArray, mainArray;

    if (type === 'debts') {
        archArray = db.archive.debts;
        mainArray = db.debts;
    } else if (type === 'people') {
        archArray = db.archive.people;
        mainArray = db.people;
    } else {
        archArray = db.archive.transactions;
        mainArray = db.transactions;
    }

    const idx = archArray.findIndex(i => i.id === id);
    if (idx === -1) return;

    const restored = archArray.splice(idx, 1)[0];
    delete restored.archived;
    delete restored.archivedAt;
    mainArray.push(restored);

    saveDB(db);
    renderArchive();
    showToast('تم استعادة العنصر', 'success');
}

function permanentDelete(type, id) {
    const db = getDB();
    let archArray;

    if (type === 'debts') archArray = db.archive.debts;
    else if (type === 'people') archArray = db.archive.people;
    else archArray = db.archive.transactions;

    const idx = archArray.findIndex(i => i.id === id);
    if (idx === -1) return;

    archArray.splice(idx, 1);
    saveDB(db);
    renderArchive();
    showToast('تم الحذف نهائياً', 'info');
}

// ===== التفعيل والاشتراك =====
function renderActivation() {
    const db = getDB();
    const statusCard = document.getElementById('account-status-card');
    const statusIcon = document.getElementById('status-icon');
    const statusTitle = document.getElementById('status-title');
    const statusDesc = document.getElementById('status-desc');
    const usageCount = document.getElementById('usage-count');
    const usageFill = document.getElementById('usage-fill');
    const paymentMethods = document.getElementById('payment-methods');

    if (!statusCard || !statusIcon || !statusTitle || !statusDesc) return;

    const used = db.activation.usedActions;
    const max = db.activation.maxFreeActions;
    const remaining = Math.max(0, max - used);
    const percentage = Math.min(100, (used / max) * 100);

    const statusConfig = {
        free: { icon: 'fa-gift', title: 'الحساب المجاني', desc: `${remaining} حركة متبقية` },
        activated: { icon: 'fa-crown', title: 'حساب مفعّل', desc: 'جميع الميزات متاحة' },
        expired: { icon: 'fa-exclamation-triangle', title: 'انتهت الحركات', desc: 'يرجى تفعيل الحساب' },
        suspended: { icon: 'fa-ban', title: 'حساب موقوف', desc: 'تواصل مع الدعم' }
    };

    const config = statusConfig[db.activation.status] || statusConfig.free;
    statusIcon.innerHTML = `<i class="fas ${config.icon}"></i>`;
    statusTitle.textContent = config.title;
    statusDesc.textContent = config.desc;

    if (usageCount) usageCount.textContent = `${used} / ${max}`;
    if (usageFill) usageFill.style.width = percentage + '%';

    // طرق الدفع
    if (paymentMethods) {
        const methods = [
            { name: 'زين كاش', detail: '0790 XXX XXXX', icon: 'fa-mobile-alt' },
            { name: 'فودافون كاش', detail: '010 XXX XXXX', icon: 'fa-money-bill-wave' },
            { name: 'تحويل بنكي', detail: 'IQ00 XXXX XXXX', icon: 'fa-university' },
            { name: 'PayPal', detail: 'pay@example.com', icon: 'fa-paypal' },
            { name: 'USDT (TRC20)', detail: 'TXxx...xxxx', icon: 'fa-coins' },
            { name: 'بطاقة مصرفية', detail: '4XXX XXXX XXXX XXXX', icon: 'fa-credit-card' }
        ];

        paymentMethods.innerHTML = `
            <h3 style="margin-bottom:12px"><i class="fas fa-credit-card"></i> طرق الدفع</h3>
            ${methods.map(m => `
                <div class="payment-method">
                    <div class="pm-icon"><i class="fas ${m.icon}"></i></div>
                    <div class="pm-info">
                        <div class="pm-name">${m.name}</div>
                        <div class="pm-detail">${m.detail}</div>
                    </div>
                </div>
            `).join('')}
        `;
    }
}

function activateAccount() {
    const code = document.getElementById('activation-code').value.trim();
    if (!code) {
        showToast('يرجى إدخال كود التفعيل', 'error');
        return;
    }

    // أكواد تجريبية للتفعيل
    const validCodes = ['ACTIVATE2024', 'PRO123', 'FULL456', 'PREMIUM789'];

    if (validCodes.includes(code)) {
        const db = getDB();
        db.activation.status = 'activated';
        db.activation.code = code;
        saveDB(db);
        renderActivation();
        showToast('تم تفعيل الحساب بنجاح!', 'success');
    } else {
        showToast('كود غير صالح', 'error');
    }
}

// ===== الإعدادات =====
function renderSettings() {
    const db = getDB();
    const list = document.getElementById('settings-list');
    if (!list) return;

    list.innerHTML = `
        <div class="settings-group">
            <div class="settings-item" onclick="toggleSetting('vibration')">
                <div class="si-right">
                    <div class="si-icon" style="background:rgba(124,58,237,0.15);color:var(--primary-light)"><i class="fas fa-vibrate"></i></div>
                    <div>
                        <div class="si-label">الاهتزاز</div>
                        <div class="si-desc">تفعيل الاهتزاز عند الضغط</div>
                    </div>
                </div>
                <div class="toggle-switch ${db.settings.vibration ? 'active' : ''}" id="toggle-vibration"></div>
            </div>
            <div class="settings-item" onclick="toggleSetting('animations')">
                <div class="si-right">
                    <div class="si-icon" style="background:rgba(6,182,212,0.15);color:var(--secondary)"><i class="fas fa-magic"></i></div>
                    <div>
                        <div class="si-label">الأنيميشن</div>
                        <div class="si-desc">تأثيرات الحركة</div>
                    </div>
                </div>
                <div class="toggle-switch ${db.settings.animations ? 'active' : ''}" id="toggle-animations"></div>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-item" onclick="changeCurrency()">
                <div class="si-right">
                    <div class="si-icon" style="background:rgba(16,185,129,0.15);color:var(--success)"><i class="fas fa-coins"></i></div>
                    <div>
                        <div class="si-label">العملة</div>
                        <div class="si-desc">${db.settings.currency}</div>
                    </div>
                </div>
                <i class="fas fa-chevron-left" style="color:var(--text-muted)"></i>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-item" onclick="openModal('modal-backup')">
                <div class="si-right">
                    <div class="si-icon" style="background:rgba(59,130,246,0.15);color:var(--info)"><i class="fas fa-cloud-download-alt"></i></div>
                    <div>
                        <div class="si-label">النسخ الاحتياطي</div>
                        <div class="si-desc">آخر نسخة: ${db.backupDate ? formatDate(db.backupDate) : 'لم يتم'}</div>
                    </div>
                </div>
                <i class="fas fa-chevron-left" style="color:var(--text-muted)"></i>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-item" onclick="resetApp()">
                <div class="si-right">
                    <div class="si-icon" style="background:rgba(239,68,68,0.15);color:var(--danger)"><i class="fas fa-undo"></i></div>
                    <div>
                        <div class="si-label">إعادة ضبط التطبيق</div>
                        <div class="si-desc">حذف جميع البيانات</div>
                    </div>
                </div>
                <i class="fas fa-chevron-left" style="color:var(--text-muted)"></i>
            </div>
        </div>

        <div class="settings-group">
            <div class="settings-item" onclick="showAbout()">
                <div class="si-right">
                    <div class="si-icon" style="background:rgba(245,158,11,0.15);color:var(--warning)"><i class="fas fa-info-circle"></i></div>
                    <div>
                        <div class="si-label">حول التطبيق</div>
                        <div class="si-desc">الإصدار 1.0.0</div>
                    </div>
                </div>
                <i class="fas fa-chevron-left" style="color:var(--text-muted)"></i>
            </div>
        </div>

        <div class="contact-section" style="margin-top:16px">
            <h3 style="font-size:14px;margin-bottom:4px"><i class="fas fa-headset"></i> تواصل مع المطور</h3>
            <button onclick="window.open('mailto:developer@example.com')"><i class="fas fa-envelope"></i> إرسال بريد إلكتروني</button>
            <button onclick="window.open('https://t.me/developer')"><i class="fab fa-telegram"></i> فتح تيلجرام</button>
            <button onclick="window.open('https://wa.me/9647XXXXXXXXX')"><i class="fab fa-whatsapp"></i> واتساب</button>
            <button onclick="copyText('developer@example.com | Telegram: @developer | WhatsApp: +9647XXXXXXXXX')"><i class="fas fa-copy"></i> نسخ معلومات التواصل</button>
        </div>
    `;
}

function toggleSetting(key) {
    const db = getDB();
    db.settings[key] = !db.settings[key];
    saveDB(db);
    renderSettings();
    hapticFeedback();
}

function changeCurrency() {
    const currencies = ['IQD', 'USD', 'EUR', 'SAR', 'AED', 'EGP'];
    const db = getDB();
    const currentIdx = currencies.indexOf(db.settings.currency);
    const nextIdx = (currentIdx + 1) % currencies.length;
    db.settings.currency = currencies[nextIdx];
    saveDB(db);
    renderSettings();
    showToast(`تم تغيير العملة إلى ${currencies[nextIdx]}`, 'info');
}

function resetApp() {
    showModalConfirm('إعادة ضبط التطبيق', 'سيتم حذف جميع البيانات نهائياً. هل أنت متأكد؟', () => {
        localStorage.removeItem(APP_KEY);
        localStorage.removeItem(APP_KEY + '_calc');
        showToast('تم إعادة ضبط التطبيق', 'info');
        setTimeout(() => location.reload(), 1000);
    });
}

function showAbout() {
    showModalAlert('حول التطبيق', `
        <div style="text-align:center;padding:10px">
            <i class="fas fa-wallet" style="font-size:48px;color:var(--primary-light);margin-bottom:12px"></i>
            <h3>مدير الديون والمصاريف</h3>
            <p style="color:var(--text-secondary);margin:8px 0">الإصدار 1.0.0</p>
            <p style="color:var(--text-muted);font-size:12px">تطبيق شخصي لإدارة الديون والمصاريف المالية</p>
        </div>
    `);
}

// ===== لوحة التحكم =====
function renderAdmin() {
    const db = getDB();
    const content = document.getElementById('admin-content');
    if (!content) return;

    const freeAccounts = 1;
    const activatedAccounts = db.activation.status === 'activated' ? 1 : 0;
    const expiredAccounts = db.activation.status === 'expired' ? 1 : 0;
    const suspendedAccounts = db.activation.status === 'suspended' ? 1 : 0;

    content.innerHTML = `
        <div class="admin-stats">
            <div class="admin-stat">
                <div class="as-value">${db.people.length}</div>
                <div class="as-label">الأشخاص</div>
            </div>
            <div class="admin-stat">
                <div class="as-value">${db.debts.length}</div>
                <div class="as-label">الديون</div>
            </div>
            <div class="admin-stat">
                <div class="as-value">${db.transactions.length}</div>
                <div class="as-label">العمليات</div>
            </div>
            <div class="admin-stat">
                <div class="as-value">${db.activation.usedActions}</div>
                <div class="as-label">الحركات المستخدمة</div>
            </div>
            <div class="admin-stat">
                <div class="as-value" style="color:var(--success)">${freeAccounts}</div>
                <div class="as-label">حسابات مجانية</div>
            </div>
            <div class="admin-stat">
                <div class="as-value" style="color:var(--primary-light)">${activatedAccounts}</div>
                <div class="as-label">حسابات مفعّلة</div>
            </div>
            <div class="admin-stat">
                <div class="as-value" style="color:var(--warning)">${expiredAccounts}</div>
                <div class="as-label">حسابات منتهية</div>
            </div>
            <div class="admin-stat">
                <div class="as-value" style="color:var(--danger)">${suspendedAccounts}</div>
                <div class="as-label">حسابات موقوفة</div>
            </div>
        </div>

        <div class="admin-section">
            <div class="admin-section-title"><i class="fas fa-sliders-h"></i> إدارة الحركات</div>
            <div class="admin-section-body">
                <div class="form-group">
                    <label>عدد الحركات المجانية</label>
                    <div style="display:flex;gap:8px">
                        <input type="number" id="admin-max-actions" value="${db.activation.maxFreeActions}" style="flex:1">
                        <button class="btn-primary" onclick="updateMaxActions()"><i class="fas fa-save"></i> حفظ</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>الحركات المستخدمة</label>
                    <div style="display:flex;gap:8px">
                        <input type="number" id="admin-used-actions" value="${db.activation.usedActions}" style="flex:1">
                        <button class="btn-primary" onclick="updateUsedActions()"><i class="fas fa-save"></i> حفظ</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="admin-section">
            <div class="admin-section-title"><i class="fas fa-key"></i> إدارة الحساب</div>
            <div class="admin-section-body">
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn-primary" onclick="adminSetStatus('activated')"><i class="fas fa-crown"></i> تفعيل</button>
                    <button class="btn-secondary" onclick="adminSetStatus('free')"><i class="fas fa-gift"></i> مجاني</button>
                    <button class="btn-danger" onclick="adminSetStatus('suspended')"><i class="fas fa-ban"></i> إيقاف</button>
                </div>
            </div>
        </div>

        <div class="admin-section">
            <div class="admin-section-title"><i class="fas fa-bell"></i> إدارة التنبيهات</div>
            <div class="admin-section-body">
                <div class="form-group">
                    <label>إرسال تنبيه مخصص</label>
                    <div style="display:flex;gap:8px">
                        <input type="text" id="admin-alert-title" placeholder="عنوان التنبيه" style="flex:1">
                        <input type="text" id="admin-alert-desc" placeholder="وصف التنبيه" style="flex:1">
                        <button class="btn-primary" onclick="adminSendAlert()"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
            </div>
        </div>

        <div class="admin-section">
            <div class="admin-section-title"><i class="fas fa-credit-card"></i> إدارة طرق الدفع</div>
            <div class="admin-section-body">
                <p style="color:var(--text-secondary);font-size:13px">يمكنك تعديل طرق الدفع في كود التطبيق</p>
            </div>
        </div>

        <div class="admin-section">
            <div class="admin-section-title"><i class="fas fa-history"></i> سجل النشاط</div>
            <div class="admin-section-body">
                <p style="color:var(--text-secondary);font-size:13px">إجمالي الحركات: ${db.activation.usedActions}</p>
                <p style="color:var(--text-secondary);font-size:13px">آخر تحديث: ${formatDate(new Date())}</p>
            </div>
        </div>
    `;
}

function updateMaxActions() {
    const db = getDB();
    const val = Number(document.getElementById('admin-max-actions').value) || 300;
    db.activation.maxFreeActions = val;
    saveDB(db);
    showToast('تم تحديث عدد الحركات المجانية', 'success');
}

function updateUsedActions() {
    const db = getDB();
    const val = Number(document.getElementById('admin-used-actions').value) || 0;
    db.activation.usedActions = val;
    saveDB(db);
    showToast('تم تحديث الحركات المستخدمة', 'success');
}

function adminSetStatus(status) {
    const db = getDB();
    db.activation.status = status;
    saveDB(db);
    showToast(`تم تغيير حالة الحساب إلى: ${status}`, 'success');
    renderAdmin();
}

function adminSendAlert() {
    const title = document.getElementById('admin-alert-title').value.trim();
    const desc = document.getElementById('admin-alert-desc').value.trim();
    if (!title) {
        showToast('يرجى إدخال عنوان التنبيه', 'error');
        return;
    }
    addNotification(title, desc, 'info');
    document.getElementById('admin-alert-title').value = '';
    document.getElementById('admin-alert-desc').value = '';
    showToast('تم إرسال التنبيه', 'success');
}

// ===== التنبيهات =====
function renderNotifications() {
    const db = getDB();
    const list = document.getElementById('notifications-list');
    if (!list) return;

    // قراءة كل التنبيهات
    db.notifications.forEach(n => n.read = true);
    saveDB(db);
    updateNotifBadge();

    if (db.notifications.length === 0) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>لا توجد تنبيهات</p></div>';
    } else {
        list.innerHTML = db.notifications.map(n => {
            const iconClass = n.type === 'warning' ? 'fa-exclamation-triangle' : n.type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
            const color = n.type === 'warning' ? 'yellow' : n.type === 'error' ? 'red' : 'blue';
            return `
                <div class="notif-item">
                    <div class="notif-icon ${color}"><i class="fas ${iconClass}"></i></div>
                    <div class="notif-content">
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-desc">${n.desc}</div>
                        <div class="notif-time">${formatDateTime(n.date)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// ===== النسخ الاحتياطي =====
function renderBackupInfo() {
    const db = getDB();
    const info = document.getElementById('backup-info');
    if (!info) return;

    info.innerHTML = `
        <p><strong>آخر نسخة احتياطية:</strong> ${db.backupDate ? formatDateTime(db.backupDate) : 'لم يتم إنشاء نسخة'}</p>
        <p><strong>عدد الأشخاص:</strong> ${db.people.length}</p>
        <p><strong>عدد الديون:</strong> ${db.debts.length}</p>
        <p><strong>عدد العمليات:</strong> ${db.transactions.length}</p>
    `;
}

function createBackup(format) {
    const db = getDB();
    db.backupDate = new Date().toISOString();
    saveDB(db);

    if (format === 'json') {
        downloadFile(JSON.stringify(db, null, 2), 'backup_' + getToday() + '.json', 'application/json');
    } else if (format === 'csv') {
        let csv = 'النوع,الاسم,المبلغ,التاريخ,الحالة\n';
        db.debts.forEach(d => {
            csv += `دين,${d.personName},${d.amount},${d.date},${d.status}\n`;
        });
        db.transactions.forEach(t => {
            csv += `${t.type === 'income' ? 'إيراد' : 'مصروف'},${t.category},${t.amount},${t.date},-\n`;
        });
        downloadFile(csv, 'backup_' + getToday() + '.csv', 'text/csv');
    } else if (format === 'excel') {
        const debtsWs = [['الشخص', 'النوع', 'المبلغ', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ']];
        db.debts.forEach(d => {
            debtsWs.push([d.personName, d.type, d.amount, d.paid || 0, d.amount - (d.paid || 0), d.status, d.date]);
        });
        const txsWs = [['النوع', 'المبلغ', 'التصنيف', 'التاريخ', 'ملاحظات']];
        db.transactions.forEach(t => {
            txsWs.push([t.type, t.amount, t.category, t.date, t.notes || '']);
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(debtsWs), 'الديون');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txsWs), 'العمليات');
        XLSX.writeFile(wb, 'backup_' + getToday() + '.xlsx');
    }

    showToast('تم إنشاء النسخة الاحتياطية', 'success');
    closeModal('modal-backup');
}

function restoreBackup(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            if (file.name.endsWith('.json')) {
                const data = JSON.parse(e.target.result);
                if (data.people && data.debts && data.transactions) {
                    showModalConfirm('استعادة النسخة', 'سيتم استبدال جميع البيانات الحالية. هل تريد المتابعة؟', () => {
                        localStorage.setItem(APP_KEY, JSON.stringify(data));
                        showToast('تم استعادة النسخة الاحتياطية', 'success');
                        closeModal('modal-confirm');
                        closeModal('modal-backup');
                        setTimeout(() => location.reload(), 1000);
                    });
                } else {
                    showToast('ملف غير صالح', 'error');
                }
            } else if (file.name.endsWith('.csv')) {
                showToast('استعادة CSV غير مدعومة بشكل كامل', 'warning');
            } else if (file.name.endsWith('.xlsx')) {
                showToast('استعادة Excel غير مدعومة بشكل كامل', 'warning');
            }
        } catch (err) {
            showToast('خطأ في قراءة الملف', 'error');
        }
    };

    reader.readAsText(file);
    input.value = '';
}

// ===== FAB - زر الإضافة العائم =====
function fabAction() {
    hapticFeedback();
    const currentPageEl = currentPage;

    if (currentPageEl === 'page-home') {
        // عرض خيارات
        showAddOptions();
    } else if (currentPageEl === 'page-debts') {
        openAddDebt();
    } else if (currentPageEl === 'page-people') {
        openAddPerson();
    } else if (currentPageEl === 'page-transactions') {
        openAddTransaction();
    }
}

function showAddOptions() {
    const options = [
        { icon: 'fa-file-invoice-dollar', label: 'دين جديد', action: 'openAddDebt()' },
        { icon: 'fa-users', label: 'شخص جديد', action: 'openAddPerson()' },
        { icon: 'fa-exchange-alt', label: 'مصروف/إيراد', action: 'openAddTransaction()' }
    ];

    showModalAlert('إضافة جديد', `
        <div style="display:flex;flex-direction:column;gap:10px">
            ${options.map(o => `
                <button class="btn-secondary full-width" onclick="${o.action}; closeModal('modal-alert')" style="display:flex;align-items:center;gap:10px;justify-content:center;padding:14px">
                    <i class="fas ${o.icon}" style="color:var(--primary-light)"></i>
                    ${o.label}
                </button>
            `).join('')}
        </div>
    `);
}

// ===== نوافذ مساعدة =====
function showModalAlert(title, message) {
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-message').innerHTML = message;
    openModal('modal-alert');
}

function showModalConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const btn = document.getElementById('confirm-action-btn');
    btn.onclick = function() {
        onConfirm();
    };
    openModal('modal-confirm');
}

// ===== سحب للتعديل/الحذف =====
let swipeStartX = 0;
let swipeElement = null;

function startSwipe(e, id) {
    swipeStartX = e.touches[0].clientX;
    swipeElement = e.currentTarget;
    swipeElement.classList.add('swiping');
}

function moveSwipe(e) {
    if (!swipeElement) return;
    const diff = e.touches[0].clientX - swipeStartX;
    if (Math.abs(diff) > 10) {
        swipeElement.style.transform = `translateX(${diff * 0.3}px)`;
    }
}

function endSwipe(e, id) {
    if (!swipeElement) return;
    const diff = e.changedTouches[0].clientX - swipeStartX;

    swipeElement.style.transform = '';
    swipeElement.classList.remove('swiping');

    if (diff > 80) {
        // سحب لليمين - تعديل
        if (currentPage === 'page-debts') {
            openEditDebt(id);
        }
    } else if (diff < -80) {
        // سحب لليسار - حذف
        if (currentPage === 'page-debts') {
            deleteDebt(id);
        }
    }

    swipeElement = null;
}

// ===== تهيئة التطبيق =====
function initApp() {
    // إخفاء شاشة التحميل
    setTimeout(() => {
        const loading = document.getElementById('loading-screen');
        if (loading) loading.classList.add('hidden');
    }, 800);

    // تحميل بيانات الحاسبة
    loadCalcHistory();

    // عرض الصفحة الرئيسية
    MapsTo('page-home');

    // فحص التنبيهات
    checkDebtAlerts();

    // تحديث شارة التنبيهات
    updateNotifBadge();

    // إعداد النسخ الاحتياطي
    const backupInfo = document.getElementById('backup-info');
    if (backupInfo) {
        // يتم استدعاؤه عند فتح النافذة
    }

    // إضافة مستمع لإظهار معلومات النسخ الاحتياطي
    document.getElementById('modal-backup')?.addEventListener('click', function(e) {
        if (e.target === this) renderBackupInfo();
    });
}

// تشغيل التطبيق
document.addEventListener('DOMContentLoaded', initApp);
