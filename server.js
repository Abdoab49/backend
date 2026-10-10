// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ✅ رابط MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://abdllaah:abhaniabhani@cluster0.66kxfeo.mongodb.net/shop?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ============================================
//  🔐 ADMIN PASSWORD
// ============================================
const ADMIN_PASSWORD = 'lanada2026admin';   // ✅ Bdel hadi b password dyalek
const ADMIN_TOKEN = 'lanada_admin_token_2026';

// ============================================
//  📦 ORDER SCHEMA — b userId + region
// ============================================
const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: 'anonymous'
  },
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    size: String,
    image: String,
    category: String,
    brand: String
  }],
  totalAmount: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    region: { type: String, default: '' },
    street: { type: String, required: true },
    state: { type: String, default: 'Casablanca-Settat' },
    zipCode: { type: String, default: '20000' },
    country: { type: String, default: 'Morocco' }
  },
  paymentMethod: {
    type: String,
    enum: ['cash_on_delivery', 'credit_card', 'paypal'],
    default: 'cash_on_delivery'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ============================================
//  🎯 USED CODE SCHEMA
// ============================================
const usedCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true },
  userId: { type: String, required: true },
  usedAt: { type: Date, default: Date.now }
});

usedCodeSchema.index({ code: 1, userId: 1 }, { unique: true });

const UsedCode = mongoose.model('UsedCode', usedCodeSchema);

// ============================================
//  📦 API ROUTES — ORDERS (CLIENT)
// ============================================

// ✅ GET: orders dyal client (b userId)
app.get('/api/orders', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
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

// ✅ POST: créer une commande (b userId)
app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId,
      items,
      totalAmount,
      subtotal,
      discount,
      shippingAddress,
      paymentMethod
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.city || !shippingAddress.street) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all shipping information'
      });
    }

    const order = new Order({
      userId: userId || 'anonymous',
      items: items,
      totalAmount: totalAmount || 0,
      subtotal: subtotal || totalAmount || 0,
      discount: discount || 0,
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        city: shippingAddress.city,
        region: shippingAddress.region || '',
        street: shippingAddress.street,
        state: shippingAddress.state || 'Casablanca-Settat',
        zipCode: shippingAddress.zipCode || '20000',
        country: shippingAddress.country || 'Morocco'
      },
      paymentMethod: paymentMethod || 'cash_on_delivery',
      status: 'pending',
      paymentStatus: 'pending'
    });

    await order.save();

    console.log('📦 New Order saved to MongoDB:', {
      id: order._id,
      userId: order.userId,
      customer: order.shippingAddress.fullName,
      region: order.shippingAddress.region,
      total: order.totalAmount,
      items: order.items.length
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: order,
      totalAmount: order.totalAmount
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

// ============================================
//  🔐 API ROUTES — ADMIN
// ============================================

// ✅ POST: login admin
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: 'Password ghalat'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      token: ADMIN_TOKEN
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ GET: koul orders (ghir admin)
app.get('/api/admin/orders', async (req, res) => {
  try {
    const { token } = req.query;

    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// ✅ PUT: bdel status dyal order (ghir admin)
app.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { token } = req.query;
    const { status } = req.body;

    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

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

    console.log('✅ Order status updated:', {
      id: order._id,
      status: order.status
    });

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

// ✅ DELETE: حذف طلب (admin)
app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    const { token } = req.query;

    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

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
//  🎯 API ROUTES — PROMO CODES
// ============================================

app.post('/api/promo/check-code', async (req, res) => {
  const { code, userId } = req.body;

  if (!code || !userId) {
    return res.status(400).json({
      valid: false,
      error: 'Code wla userId manquant'
    });
  }

  try {
    const existing = await UsedCode.findOne({
      code: code.toUpperCase(),
      userId
    });

    if (existing) {
      return res.json({
        valid: false,
        message: 'Hada l\'code deja msta3mel'
      });
    }

    await UsedCode.create({
      code: code.toUpperCase(),
      userId
    });

    res.json({ valid: true });

  } catch (error) {
    console.error('❌ Promo error:', error);

    if (error.code === 11000) {
      return res.json({
        valid: false,
        message: 'Hada l\'code deja msta3mel'
      });
    }

    res.status(500).json({
      valid: false,
      error: 'Mochkil f server'
    });
  }
});

app.get('/api/promo/used/:userId', async (req, res) => {
  try {
    const codes = await UsedCode.find({ userId: req.params.userId });
    res.json({ codes: codes.map(c => c.code) });
  } catch (error) {
    res.status(500).json({ error: 'Mochkil f server' });
  }
});

// ============================================
//  🚀 START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/orders`);
  console.log(`🔐 Admin: http://localhost:${PORT}/api/admin/orders`);
  console.log(`📡 Promo: http://localhost:${PORT}/api/promo/check-code`);
});