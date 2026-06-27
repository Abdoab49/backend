// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ رابط MongoDB
const MONGODB_URI = 'mongodb+srv://abdllaah:abhaniabhani@cluster0.66kxfeo.mongodb.net/shop?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
//  📦 ORDER SCHEMA (نموذج الطلب المحسن)
// ============================================

const orderSchema = new mongoose.Schema({
  // ✅ معلومات الزبون (Customer Info)
  customer: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    }
  },

  // ✅ عنوان الشحن (Shipping Address)
  shippingAddress: {
    city: {
      type: String,
      required: true,
      trim: true
    },
    street: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      default: 'Casablanca-Settat'
    },
    zipCode: {
      type: String,
      default: '20000'
    },
    country: {
      type: String,
      default: 'Morocco'
    }
  },

  // ✅ المنتجات (Items)
  items: [{
    productId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: {
      type: String,
      default: 'M'
    },
    image: {
      type: String,
      default: '/Assets/ShoeStore/tshirt1.png'
    },
    category: {
      type: String,
      default: 'T-Shirts'
    },
    brand: {
      type: String,
      default: 'National Team'
    }
  }],

  // ✅ المبالغ (Amounts)
  totals: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    }
  },

  // ✅ طريقة الدفع (Payment)
  payment: {
    method: {
      type: String,
      enum: ['cash_on_delivery', 'credit_card', 'paypal'],
      default: 'cash_on_delivery'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    }
  },

  // ✅ حالة الطلب (Order Status)
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },

  // ✅ ملاحظات (Notes)
  notes: {
    type: String,
    default: ''
  },

  // ✅ تاريخ الإنشاء (Created At)
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // ✅ إضافة خيارات إضافية
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ ✅ ✅ إضافة علاقة (Virtual) لحساب عدد المنتجات
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ✅ ✅ ✅ إضافة علاقة (Virtual) لعرض المنتجات كـ String
orderSchema.virtual('itemsSummary').get(function() {
  return this.items.map(item => `${item.name} x${item.quantity}`).join(', ');
});

const Order = mongoose.model('Order', orderSchema);

// ============================================
//  📦 API ROUTES
// ============================================

// ✅ GET: جلب جميع الطلبات (مع البيانات المحسنة)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch orders', 
      error: error.message 
    });
  }
});

// ✅ GET: جلب طلب محدد
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: 'Order not found' 
      });
    }
    res.json(order);
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch order', 
      error: error.message 
    });
  }
});

// ✅ POST: إنشاء طلب جديد
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, shippingAddress, items, totals, payment, notes } = req.body;

    // ✅ التحقق من وجود العناصر
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    // ✅ التحقق من معلومات الزبون
    if (!customer || !customer.fullName || !customer.phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer name and phone'
      });
    }

    // ✅ التحقق من عنوان الشحن
    if (!shippingAddress || !shippingAddress.city || !shippingAddress.street) {
      return res.status(400).json({
        success: false,
        message: 'Please provide shipping address (city and street)'
      });
    }

    // ✅ إنشاء الطلب
    const order = new Order({
      customer: {
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email || ''
      },
      shippingAddress: {
        city: shippingAddress.city,
        street: shippingAddress.street,
        state: shippingAddress.state || 'Casablanca-Settat',
        zipCode: shippingAddress.zipCode || '20000',
        country: shippingAddress.country || 'Morocco'
      },
      items: items.map(item => ({
        productId: item.productId || item.id || Date.now().toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        size: item.size || 'M',
        image: item.image || '/Assets/ShoeStore/tshirt1.png',
        category: item.category || 'T-Shirts',
        brand: item.brand || 'National Team'
      })),
      totals: {
        subtotal: totals?.subtotal || 0,
        discount: totals?.discount || 0,
        totalAmount: totals?.totalAmount || 0
      },
      payment: {
        method: payment?.method || 'cash_on_delivery',
        status: 'pending'
      },
      status: 'pending',
      notes: notes || ''
    });

    // ✅ حفظ في MongoDB
    await order.save();

    console.log('📦 New Order saved to MongoDB:', {
      id: order._id,
      customer: order.customer.fullName,
      total: order.totals.totalAmount,
      items: order.items.length
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: order
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create order', 
      error: error.message 
    });
  }
});

// ✅ PUT: تحديث حالة الطلب
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      order
    });

  } catch (error) {
    console.error('❌ Error updating order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update order', 
      error: error.message 
    });
  }
});

// ✅ DELETE: حذف طلب
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete order', 
      error: error.message 
    });
  }
});

// ============================================
//  🚀 START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/orders`);
});