// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// ============================================
// ✅ POST /api/orders — Créer une commande
// ============================================
router.post('/', async (req, res) => {
  try {
    const {
      items,
      subtotal,
      shipping,
      discountPercent,
      discountAmount,
      totalAmount,
      paymentMethod,
      shippingAddress,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must have at least one item',
      });
    }

    const newOrder = new Order({
      items: items.map(item => ({
        name: item.name || 'Unknown Product',
        price: item.price || 0,
        quantity: item.quantity || 1,
        size: item.size || 'M',
        image: item.image || '',
        category: item.category || 'T-Shirts',
      })),
      subtotal: subtotal || 0,
      shipping: shipping || 0,
      discountPercent: discountPercent || 0,
      discountAmount: discountAmount || 0,
      totalAmount: totalAmount || 0,
      paymentMethod: paymentMethod || 'cash_on_delivery',
      shippingAddress: {
        fullName: shippingAddress?.fullName || '',
        phone: shippingAddress?.phone || '',
        city: shippingAddress?.city || '',
        region: shippingAddress?.region || '',     // ✅ HADA LI BGHITI
        street: shippingAddress?.street || '',
        state: shippingAddress?.state || 'Casablanca-Settat',
        zipCode: shippingAddress?.zipCode || '20000',
        country: shippingAddress?.country || 'Morocco',
      },
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date(),
    });

    const savedOrder = await newOrder.save();

    console.log('📦 New Order:', savedOrder);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: savedOrder,
      totalAmount: savedOrder.totalAmount,
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
});

// ============================================
// ✅ GET /api/orders — Récupérer toutes les commandes
// ============================================
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
});

module.exports = router;