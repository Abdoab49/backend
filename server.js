// backend/server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ✅ الاتصال بـ MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://abdllaah:abhaniabhani@cluster0.66kxfeo.mongodb.net/shop?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// ============================================
//  ORDER SCHEMA
// ============================================
const orderSchema = new mongoose.Schema({
  customer: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' }
  },
  shippingAddress: {
    city: { type: String, required: true },
    street: { type: String, required: true },
    state: { type: String, default: 'Casablanca-Settat' },
    zipCode: { type: String, default: '20000' },
    country: { type: String, default: 'Morocco' }
  },
  items: [{
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: 'M' },
    image: { type: String, default: '/Assets/ShoeStore/tshirt1.png' },
    category: { type: String, default: 'T-Shirts' },
    brand: { type: String, default: 'National Team' }
  }],
  totals: {
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 }
  },
  payment: {
    method: { type: String, default: 'cash_on_delivery' },
    status: { type: String, default: 'pending' }
  },
  status: { type: String, default: 'pending' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ============================================
//  API ROUTES
// ============================================

// ✅ GET: جلب جميع الطلبات
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ POST: إنشاء طلب جديد
app.post('/api/orders', async (req, res) => {
  try {
    console.log('📦 Received:', req.body);

    const { fullName, phone, city, address, items, totalAmount, promoPrice } = req.body;

    // ✅ التحقق
    if (!fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer name and phone'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    // ✅ إنشاء الطلب
    const order = new Order({
      customer: {
        fullName: fullName,
        phone: phone,
        email: ''
      },
      shippingAddress: {
        city: city || '',
        street: address || '',
        state: 'Casablanca-Settat',
        zipCode: '20000',
        country: 'Morocco'
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
        subtotal: totalAmount || 0,
        discount: promoPrice || 0,
        totalAmount: totalAmount || 0
      },
      payment: {
        method: 'cash_on_delivery',
        status: 'pending'
      },
      status: 'pending',
      notes: ''
    });

    await order.save();

    console.log('✅ Order saved:', order._id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: order
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create order', 
      error: error.message 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});