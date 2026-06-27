// backend/server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// ✅ ملف تخزين الطلبات
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// ✅ قراءة الطلبات من الملف
const readOrders = () => {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error reading orders:', error);
    return [];
  }
};

// ✅ حفظ الطلبات في الملف
const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error writing orders:', error);
  }
};

// ✅ API: جلب جميع الطلبات
app.get('/api/orders', (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// ✅ API: إنشاء طلب جديد
app.post('/api/orders', (req, res) => {
  const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

  const orders = readOrders();
  const order = {
    id: Date.now().toString(),
    items: items || [],
    totalAmount: totalAmount || 0,
    shippingAddress: shippingAddress || {},
    paymentMethod: paymentMethod || 'cash_on_delivery',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  writeOrders(orders);

  console.log('📦 New Order from:', shippingAddress?.fullName);
  console.log('💰 Total:', totalAmount);
  console.log('📊 Total Orders:', orders.length);

  res.status(201).json({ success: true, order });
});

// ✅ تشغيل الخادم
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Orders saved to: ${ORDERS_FILE}`);
});