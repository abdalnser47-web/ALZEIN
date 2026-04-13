/**
 * Alzein ERP Ultra - Firestore Schema Definition
 * يضمن التوافق مع هيكل التصدير الحالي + التوسع المستقبلي
 */

export const SCHEMA_VERSION = '1.0.0';

export const Collections = {
  USERS: 'users',
  INVENTORY: 'inventory',
  TRANSACTIONS: 'transactions',
  ACCOUNTS: 'accounts',
  INVOICES: 'invoices',
  AUDIT_LOG: 'audit_log',
  SYNC_QUEUE: 'sync_queue'
};

export const UserSchema = {
  uid: { type: 'string', required: true, indexed: true },
  email: { type: 'string', required: true },
  displayName: { type: 'string', required: false },
  clientId: { type: 'string', required: true, indexed: true },
  role: { 
    type: 'string', 
    required: true, 
    enum: ['admin', 'user', 'viewer'],
    default: 'user'
  },
  permissions: { type: 'array', default: [] },
  settings: {
    type: 'map',
    default: {
      currency: 'USD',
      language: 'ar',
      privacyMode: false,
      theme: 'neon-dark'
    }
  },
  subscription: {
    type: 'map',
    default: {
      plan: 'free',
      status: 'active',
      expiresAt: null
    }
  },
  createdAt: { type: 'timestamp', serverTimestamp: true },
  updatedAt: { type: 'timestamp', serverTimestamp: true },
  lastSyncAt: { type: 'timestamp' }
};

export const InventorySchema = {
  id: { type: 'string', required: true, indexed: true },
  userId: { type: 'string', required: true, indexed: true },
  sku: { type: 'string', required: true, unique: true },
  name: { type: 'string', required: true },
  description: { type: 'string', required: false },
  category: { type: 'string', indexed: true },
  unitPrice: { type: 'number', required: true, min: 0 },
  costPrice: { type: 'number', required: false, min: 0 },
  stock: { 
    type: 'map', 
    default: {
      quantity: 0,
      reserved: 0,
      available: 0,
      lowStockThreshold: 10,
      unit: 'piece'
    }
  },
  alerts: {
    type: 'map',
    default: {
      lowStock: false,
      outOfStock: false,
      notifyEmail: true
    }
  },
  metadata: { type: 'map', default: {} },
  createdAt: { type: 'timestamp', serverTimestamp: true },
  updatedAt: { type: 'timestamp', serverTimestamp: true },
  syncedAt: { type: 'timestamp' }
};

export const TransactionSchema = {
  id: { type: 'string', required: true },
  userId: { type: 'string', required: true, indexed: true },
  type: { 
    type: 'string', 
    required: true, 
    enum: ['income', 'expense', 'transfer', 'adjustment'],
    indexed: true 
  },
  amount: { type: 'number', required: true },
  currency: { type: 'string', default: 'USD' },
  accountId: { type: 'string', required: true, indexed: true },
  relatedEntity: {
    type: 'map',
    default: { type: null, id: null, name: null } // customer/supplier
  },
  inventoryRef: {
    type: 'map',
    default: { itemId: null, quantity: 0, direction: null } // 'in' or 'out'
  },
  accounting: {
    type: 'map',
    required: true,
    default: {
      debit: [], // [{ accountId, amount }]
      credit: [],
      balanced: true
    }
  },
  description: { type: 'string', required: false },
  reference: { type: 'string', indexed: true }, // invoice #, receipt #
  status: { 
    type: 'string', 
    default: 'completed',
    enum: ['pending', 'completed', 'cancelled', 'reversed']
  },
  metadata: { type: 'map', default: {} },
  createdAt: { type: 'timestamp', serverTimestamp: true },
  updatedAt: { type: 'timestamp', serverTimestamp: true },
  syncedAt: { type: 'timestamp' }
};

export const AccountSchema = {
  id: { type: 'string', required: true },
  userId: { type: 'string', required: true, indexed: true },
  name: { type: 'string', required: true },
  type: { 
    type: 'string', 
    required: true, 
    enum: ['cash', 'bank', 'wallet', 'receivable', 'payable'],
    indexed: true 
  },
  currency: { type: 'string', default: 'USD' },
  balance: { 
    type: 'map', 
    default: {
      current: 0,
      available: 0,
      reserved: 0,
      lastUpdated: null
    }
  },
  details: { type: 'map', default: {} }, // bank info, wallet address
  isActive: { type: 'boolean', default: true },
  createdAt: { type: 'timestamp', serverTimestamp: true },
  updatedAt: { type: 'timestamp', serverTimestamp: true }
};

export const InvoiceSchema = {
  id: { type: 'string', required: true },
  userId: { type: 'string', required: true, indexed: true },
  number: { type: 'string', required: true, indexed: true },
  type: { type: 'string', enum: ['sale', 'purchase'], required: true },
  entityId: { type: 'string', required: true, indexed: true },
  entityName: { type: 'string', required: true },
  items: { 
    type: 'array', 
    required: true,
    default: [],
    items: {
      inventoryId: 'string',
      sku: 'string',
      name: 'string',
      quantity: 'number',
      unitPrice: 'number',
      discount: 'number',
      tax: 'number',
      total: 'number'
    }
  },
  totals: {
    type: 'map',
    default: {
      subtotal: 0,
      discount: 0,
      tax: 0,
      shipping: 0,
      grandTotal: 0
    }
  },
  payment: {
    type: 'map',
    default: {
      status: 'unpaid',
      method: null,
      paidAmount: 0,
      dueDate: null
    }
  },
  status: { 
    type: 'string', 
    default: 'draft',
    enum: ['draft', 'sent', 'paid', 'cancelled', 'refunded']
  },
  createdAt: { type: 'timestamp', serverTimestamp: true },
  updatedAt: { type: 'timestamp', serverTimestamp: true }
};

// دالة مساعدة لإنشاء مرجع مستند مع التحقق
export function createDocRef(collection, data, userId) {
  return {
    ...data,
    id: data.id || crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
