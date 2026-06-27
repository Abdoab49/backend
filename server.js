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
//  📦 ORDER SCHEMA
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
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// ✅ POST: إنشاء طلب جديد (معدل نهائياً)
app.post('/api/orders', async (req, res) => {
  try {
    console.log('📦 Received order data:', req.body); // ✅ للتحقق

    const body = req.body;

    // ✅ دعم جميع الهياكل الممكنة
    const customerName = body.customer?.fullName || body.fullName || body.name;
    const customerPhone = body.customer?.phone || body.phone;
    const customerEmail = body.customer?.email || body.email || '';

    // ✅ التحقق من وجود الاسم والهاتف
    if (!customerName || !customerPhone) {
      console.log('❌ Missing customer data:', { customerName, customerPhone });
      return res.status(400).json({
        success: false,
        message: 'Please provide customer name and phone'
      });
    }

    // ✅ التحقق من وجود المنتجات
    if (!body.items || body.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    // ✅ إنشاء الطلب
    const order = new Order({
      customer: {
        fullName: customerName,
        phone: customerPhone,
        email: customerEmail
      },
      shippingAddress: {
        city: body.shippingAddress?.city || body.city || '',
        street: body.shippingAddress?.street || body.address || '',
        state: body.shippingAddress?.state || 'Casablanca-Settat',
        zipCode: body.shippingAddress?.zipCode || '20000',
        country: body.shippingAddress?.country || 'Morocco'
      },
      items: body.items.map(item => ({
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
        subtotal: body.totals?.subtotal || body.subtotal || 0,
        discount: body.totals?.discount || body.discount || 0,
        totalAmount: body.totals?.totalAmount || body.totalAmount || 0
      },
      payment: {
        method: body.payment?.method || body.paymentMethod || 'cash_on_delivery',
        status: 'pending'
      },
      status: 'pending',
      notes: body.notes || ''
    });

    // ✅ حفظ في MongoDB
    await order.save();

    console.log('📦 New Order saved:', {
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

// ✅ POST: إنشاء طلب جديد
app.post('/api/orders', async (req, res) => {
  try {
    const body = req.body;

    // ✅ دعم كلا الهيكلين (الجديد والقديم)
    const customerName = body.customer?.fullName || body.fullName;
    const customerPhone = body.customer?.phone || body.phone;
    const customerEmail = body.customer?.email || '';

    // ✅ التحقق من وجود الاسم والهاتف
    if (!customerName || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer name and phone'
      });
    }

    // ✅ التحقق من وجود المنتجات
    if (!body.items || body.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item'
      });
    }

    // ✅ إنشاء الطلب
    const order = new Order({
      customer: {
        fullName: customerName,
        phone: customerPhone,
        email: customerEmail
      },
      shippingAddress: {
        city: body.shippingAddress?.city || body.city || '',
        street: body.shippingAddress?.street || body.address || '',
        state: body.shippingAddress?.state || 'Casablanca-Settat',
        zipCode: body.shippingAddress?.zipCode || '20000',
        country: body.shippingAddress?.country || 'Morocco'
      },
      items: body.items.map(item => ({
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
        subtotal: body.totals?.subtotal || body.subtotal || 0,
        discount: body.totals?.discount || body.discount || 0,
        totalAmount: body.totals?.totalAmount || body.totalAmount || 0
      },
      payment: {
        method: body.payment?.method || body.paymentMethod || 'cash_on_delivery',
        status: 'pending'
      },
      status: 'pending',
      notes: body.notes || ''
    });

    // ✅ حفظ في MongoDB
    await order.save();

    console.log('📦 New Order saved:', {
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