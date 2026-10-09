// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,
      },
      name: String,
      price: Number,
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      size: String,
      image: String,
      category: String,
    },
  ],
  subtotal: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    city: { type: String, default: '' },
    region: { type: String, default: '' },     // ✅ HADA LI BGHITI
    street: { type: String, default: '' },
    state: { type: String, default: 'Casablanca-Settat' },
    zipCode: { type: String, default: '20000' },
    country: { type: String, default: 'Morocco' },
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'cash_on_delivery'],
    default: 'cash_on_delivery',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { strict: false });   // ✅ Hadi l'mochkil — bla hadi, region ma kaytsavech

module.exports = mongoose.model('Order', OrderSchema);