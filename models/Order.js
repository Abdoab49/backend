// backend/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,   // ✅ Beddelna l false — 7it Cart ma kayb3etch userId
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: false,   // ✅ Beddelna l false
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
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  shippingAddress: {
    fullName: { type: String, default: '' },           // ✅ Jdid
    phone: { type: String, default: '' },              // ✅ Jdid
    city: { type: String, default: '' },
    region: { type: String, default: '' },             // ✅ Jdid — HADA LI BGHITI
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
    required: true,
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
});

module.exports = mongoose.model('Order', OrderSchema);