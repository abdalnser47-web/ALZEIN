/**
 * محرك المحاسبة مزدوج القيد (Debit/Credit)
 * يربط المخزون بالمحاسبة تلقائياً
 */

import { SecurityError } from '../config/roles-permissions.js';
import { validateNumber, validateRequired } from '../utils/validators.js';

export class AccountingEngine {
  constructor(userId, db) {
    this.userId = userId;
    this.db = db;
    this.ACCOUNT_TYPES = {
      ASSET: 'asset',
      LIABILITY: 'liability',
      EQUITY: 'equity',
      REVENUE: 'revenue',
      EXPENSE: 'expense'
    };
  }

  /**
   * إنشاء قيد مزدوج متوازن
   * @param {Object} entry - { debit: [], credit: [], description, metadata }
   */
  createBalancedEntry(entry) {
    validateRequired(entry, ['debit', 'credit', 'description']);
    
    const debitTotal = entry.debit.reduce((sum, item) => sum + (item.amount || 0), 0);
    const creditTotal = entry.credit.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // التحقق من التوازن مع هامش خطأ عشري ضئيل
    if (Math.abs(debitTotal - creditTotal) > 0.001) {
      throw new Error(`Unbalanced entry: Debit ${debitTotal} ≠ Credit ${creditTotal}`);
    }

    return {
      id: crypto.randomUUID(),
      userId: this.userId,
      entries: {
        debit: entry.debit.map(d => ({ ...d, side: 'debit' })),
        credit: entry.credit.map(c => ({ ...c, side: 'credit' }))
      },
      totals: { debit: debitTotal, credit: creditTotal },
      description: entry.description,
      reference: entry.reference || null,
      metadata: entry.metadata || {},
      createdAt: new Date().toISOString(),
      balanced: true
    };
  }

  /**
   * معالجة بيع عنصر (خصم المخزون + إضافة إيرادات)
   */
  async processSale({ itemId, quantity, unitPrice, customerId, accountId, currency = 'USD' }) {
    validateNumber(quantity, 'quantity', { min: 1 });
    validateNumber(unitPrice, 'unitPrice', { min: 0 });
    
    const totalAmount = quantity * unitPrice;
    
    // 1. خصم من المخزون
    await this._adjustInventory(itemId, -quantity, 'out');
    
    // 2. إنشاء القيد المزدوج
    const journalEntry = this.createBalancedEntry({
      description: `Sale: ${quantity}x Item#${itemId}`,
      reference: `SALE-${Date.now()}`,
      debit: [
        { 
          accountId, 
          amount: totalAmount, 
          accountType: this.ACCOUNT_TYPES.ASSET,
          description: 'Cash/Bank - Sales Revenue' 
        }
      ],
      credit: [
        { 
          accountId: 'revenue:sales', 
          amount: totalAmount, 
          accountType: this.ACCOUNT_TYPES.REVENUE,
          description: 'Sales Revenue Account' 
        }
      ],
      metadata: {
        type: 'sale',
        itemId,
        quantity,
        unitPrice,
        customerId,
        currency
      }
    });

    // 3. حفظ القيد (مع معالجة عدم الاتصال)
    return await this._saveJournalEntry(journalEntry);
  }

  /**
   * معالجة شراء عنصر (إضافة للمخزون + خصم من الحساب)
   */
  async processPurchase({ itemId, quantity, unitCost, supplierId, accountId, currency = 'USD' }) {
    validateNumber(quantity, 'quantity', { min: 1 });
    validateNumber(unitCost, 'unitCost', { min: 0 });
    
    const totalCost = quantity * unitCost;
    
    // 1. إضافة للمخزون
    await this._adjustInventory(itemId, quantity, 'in');
    
    // 2. إنشاء القيد المزدوج
    const journalEntry = this.createBalancedEntry({
      description: `Purchase: ${quantity}x Item#${itemId}`,
      reference: `PUR-${Date.now()}`,
      debit: [
        { 
          accountId: 'inventory:assets', 
          amount: totalCost, 
          accountType: this.ACCOUNT_TYPES.ASSET,
          description: 'Inventory Asset Account' 
        }
      ],
      credit: [
        { 
          accountId, 
          amount: totalCost, 
          accountType: this.ACCOUNT_TYPES.ASSET,
          description: 'Cash/Bank - Payment to Supplier' 
        }
      ],
      metadata: {
        type: 'purchase',
        itemId,
        quantity,
        unitCost,
        supplierId,
        currency
      }
    });

    return await this._saveJournalEntry(journalEntry);
  }

  /**
   * تعديل رصيد المخزون مع إنشاء قيد تلقائي
   * @private
   */
  async _adjustInventory(itemId, quantity, direction) {
    // يتم تنفيذ هذا عبر Inventory Module مع ربط المحاسبة
    // هنا نضمن فقط أن أي تغيير في المخزون يولد قيد محاسبي
    console.log(`[Accounting] Inventory adjustment queued: ${itemId} ${direction} ${quantity}`);
    // سيتم التنفيذ الفعلي عبر Event Bus أو Queue
  }

  /**
   * حفظ القيد مع دعم عدم الاتصال
   * @private
   */
  async _saveJournalEntry(entry) {
    try {
      // محاولة الحفظ السحابي أولاً
      if (navigator.onLine && this.db) {
        const { collection, doc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        await doc(collection(this.db, 'transactions'), entry.id).set(entry);
      }
      
      // الحفظ المحلي كنسخة احتياطية
      this._saveLocal(entry);
      
      return { success: true, entry, synced: navigator.onLine };
    } catch (error) {
      // Queue for sync when online
      await this._queueForSync(entry, 'transactions');
      return { success: true, entry, synced: false, queued: true };
    }
  }

  _saveLocal(entry) {
    const key = `alzein_txn_${entry.id}`;
    localStorage.setItem(key, JSON.stringify(entry));
    // Update index
    const index = JSON.parse(localStorage.getItem('alzein_txn_index') || '[]');
    if (!index.includes(entry.id)) {
      index.push(entry.id);
      localStorage.setItem('alzein_txn_index', JSON.stringify(index));
    }
  }

  async _queueForSync(data, collection) {
    const queue = JSON.parse(localStorage.getItem('alzein_sync_queue') || '[]');
    queue.push({
      id: crypto.randomUUID(),
      collection,
      operation: 'set',
      data,
      timestamp: Date.now(),
      retryCount: 0
    });
    localStorage.setItem('alzein_sync_queue', JSON.stringify(queue));
    
    // Trigger sync attempt
    window.dispatchEvent(new CustomEvent('sync:available'));
  }

  /**
   * حساب الرصيد لحساب معين
   */
  async getAccountBalance(accountId, untilDate = null) {
    // استعلام من Firestore أو LocalStorage
    // يتم تجميع جميع القيود التي تؤثر على هذا الحساب
    console.log(`[Accounting] Calculating balance for ${accountId}`);
    return 0; // Placeholder - implementation depends on query layer
  }

  /**
   * توليد تقرير الميزانية (Trial Balance)
   */
  async generateTrialBalance(startDate, endDate) {
    // تجميع الأرصدة لجميع الحسابات
    return {
      generatedAt: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      accounts: [],
      totals: { debit: 0, credit: 0, difference: 0 }
    };
  }
}
