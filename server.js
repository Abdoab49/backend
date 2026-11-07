// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ============================================
// MONGODB
// ============================================
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing. Configure it in your hosting environment.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// ============================================
// ADMIN
// ============================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// ============================================
// GOOGLE OAUTH
// ============================================
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ============================================
// GMAIL
// ============================================
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_PASS = process.env.GMAIL_PASS || '';

const transporter = (GMAIL_USER && GMAIL_PASS)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    })
  : null;

// ============================================
// GIVEAWAY CONFIG
// ============================================
const GIVEAWAY_DISCOUNT_PERCENT = Number(process.env.GIVEAWAY_DISCOUNT_PERCENT || 20);
const GIVEAWAY_VALID_DAYS = Number(process.env.GIVEAWAY_VALID_DAYS || 30);

// ============================================
// ORDER SCHEMA
// ============================================
const orderSchema = new mongoose.Schema({
  userId: { type: String, default: 'anonymous' },
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
  shipping: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  promoCode: { type: String, default: '' },
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
// USER SCHEMA
// ============================================
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, default: '' },
  googleId: { type: String, default: '' },
  googleVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  picture: { type: String, default: '' },
  provider: { type: String, default: 'local' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(this.password, salt, 1000, 64, 'sha512').toString('hex');
  this.password = `${salt}:${hash}`;
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  const [salt, hash] = this.password.split(':');
  const candidateHash = crypto.pbkdf2Sync(candidatePassword, salt, 1000, 64, 'sha512').toString('hex');
  return hash === candidateHash;
};

const User = mongoose.model('User', userSchema);

// ============================================
// PROMO CODE SCHEMA (normal)
// ============================================
const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  isActive: { type: Boolean, default: true },
  maxUses: { type: Number, default: 100 },
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

// ============================================
// USED CODE SCHEMA
// ============================================
const usedCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true },
  userId: { type: String, required: true },
  usedAt: { type: Date, default: Date.now }
});

usedCodeSchema.index({ code: 1, userId: 1 }, { unique: true });

const UsedCode = mongoose.model('UsedCode', usedCodeSchema);

// ============================================
// GIVEAWAY REWARD SCHEMA (jdid)
// ============================================
const giveawayRewardSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  googleId: { type: String, required: true, unique: true },
  email: { type: String, required: true, lowercase: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  status: {
    type: String,
    enum: ['available', 'redeemed', 'expired'],
    default: 'available'
  },
  expiresAt: { type: Date, required: true },
  redeemedAt: { type: Date, default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  createdAt: { type: Date, default: Date.now }
});

const GiveawayReward = mongoose.model('GiveawayReward', giveawayRewardSchema);

// ============================================
// PASSWORD RESET SCHEMA
// ============================================
const passwordResetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

// ============================================
// HELPERS — GIVEAWAY
// ============================================
function generateGiveawayCode() {
  return `LANADA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

async function ensureGiveawayReward(user) {
  const userId = `user_${user._id.toString()}`;
  let reward = await GiveawayReward.findOne({ userId });

  if (!reward) {
    try {
      reward = await GiveawayReward.create({
        userId,
        googleId: user.googleId,
        email: user.email,
        code: generateGiveawayCode(),
        discountPercent: GIVEAWAY_DISCOUNT_PERCENT,
        expiresAt: new Date(Date.now() + GIVEAWAY_VALID_DAYS * 24 * 60 * 60 * 1000)
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      reward = await GiveawayReward.findOne({
        $or: [{ userId }, { googleId: user.googleId }]
      });
      if (!reward) throw error;
    }
  }

  if (reward.status === 'available' && reward.expiresAt <= new Date()) {
    reward.status = 'expired';
    await reward.save();
  }

  return reward;
}

// ============================================
// PROMO AUTO-CREATE (kima kan)
// ============================================
function generatePromoCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function autoCreateNewPromo() {
  try {
    const newCode = generatePromoCode();
    const promo = new PromoCode({
      code: newCode,
      discountPercent: 20,
      maxUses: 1,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true
    });
    await promo.save();
    console.log(`Auto-created new promo code: ${newCode}`);
  } catch (error) {
    console.error('Error auto-creating promo:', error.message);
  }
}

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, fullName, phone } = req.body;

    if (!password || !fullName) {
      return res.status(400).json({ success: false, message: 'Password w full name — koulhom khassin' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password khass ykoun 3la l9al 6 characters' });
    }

    if (email && email.trim()) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: "Hada l'email deja msta3mel" });
      }
    }

    const finalEmail = email && email.trim()
      ? email.toLowerCase().trim()
      : `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@lanada.local`;

    const user = new User({
      email: finalEmail,
      password,
      fullName,
      phone: phone || '',
      provider: 'local'
    });

    await user.save();

    const userId = 'user_' + user._id.toString();

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      userId,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Mochkil f server', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email w password — koulhom khassin' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email wla password ghalat' });
    }

    const isMatch = user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email wla password ghalat' });
    }

    const userId = 'user_' + user._id.toString();

    res.json({
      success: true,
      message: 'Login réussi',
      userId,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Mochkil f server', error: error.message });
  }
});

app.get('/api/auth/me/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const realId = userId.replace('user_', '');
    const user = await User.findById(realId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// GOOGLE LOGIN + GIVEAWAY
// ============================================
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Credential is required' });
    }

    let userInfo;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID
      });
      userInfo = ticket.getPayload();
      userInfo.id = userInfo.sub;
    } catch (err) {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${credential}` }
      });
      userInfo = await userInfoResponse.json();
      if (!userInfo || !userInfo.email) {
        return res.status(401).json({ success: false, message: 'Google token invalide' });
      }
    }

    const { email, name: fullName, picture, id: googleId } = userInfo;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not found in Google account' });
    }

    // ✅ Gmail only for giveaway
    const isGmail = /@gmail\.com$/i.test(email);

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        password: 'google_' + googleId + '_' + Date.now(),
        fullName: fullName || 'Google User',
        phone: '',
        googleId: googleId,
        googleVerified: true,
        emailVerified: true,
        picture: picture || '',
        provider: 'google'
      });
      await user.save();
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = picture || '';
        user.provider = 'google';
      }
      user.googleVerified = true;
      user.emailVerified = true;
      await user.save();
    }

    const userId = 'user_' + user._id.toString();

    // ✅ Giveaway — Gmail only
    let giveaway = null;
    let giveawayStatus = 'not_eligible';

    if (isGmail && user.googleVerified) {
      try {
        const reward = await ensureGiveawayReward(user);
        giveawayStatus = reward.status;

        if (reward.status === 'available' && reward.expiresAt > new Date()) {
          giveaway = {
            code: reward.code,
            discountPercent: reward.discountPercent,
            expiresAt: reward.expiresAt,
            status: reward.status
          };
        }
      } catch (error) {
        console.error('Giveaway reward error:', error.message);
      }
    }

    res.json({
      success: true,
      message: 'Google login successful',
      userId,
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        picture: user.picture,
        googleVerified: user.googleVerified
      },
      giveaway,
      giveawayStatus
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ success: false, message: 'Google token invalide', error: error.message });
  }
});

// ============================================
// FORGOT / RESET PASSWORD
// ============================================
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.json({ success: true, message: 'Ila email kayn, ghadi tsift lik link' });
    }

    if (user.email.includes('@lanada.local')) {
      return res.status(400).json({ success: false, message: 'Hada compte ma3ndouch email — ma y9derch yreset password' });
    }

    await PasswordReset.deleteMany({ userId: user._id.toString() });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await PasswordReset.create({
      userId: user._id.toString(),
      email: user.email,
      token,
      expiresAt
    });

    const resetLink = `https://lanada.shop/reset-password/${token}`;

    if (!transporter) {
      return res.status(503).json({ success: false, message: 'Email service is not configured.' });
    }

    const mailOptions = {
      from: `"LANADA Shop" <${GMAIL_USER}>`,
      to: user.email,
      subject: 'Reset your password — LANADA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #000;">Reset Password</h2>
          <p>Salut ${user.fullName},</p>
          <p>Talabti reset password dyalek. Kliki 3la link:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 14px 30px; background: teal; color: white; text-decoration: none; border-radius: 20px; font-weight: 700;">Reset Password</a>
          </div>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">${resetLink}</p>
          <p style="color: #999; font-size: 12px;">Hada link kaykhdem ghir 1 hour.</p>
          <p style="color: #999; font-size: 12px;">— LANADA Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Ila email kayn, ghadi tsift lik link' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Mochkil f server', error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token w password — koulhom khassin' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password khass ykoun 3la l9al 6 characters' });
    }

    const resetRecord = await PasswordReset.findOne({ token });

    if (!resetRecord) {
      return res.status(400).json({ success: false, message: 'Token invalide wla expiré' });
    }

    if (resetRecord.used) {
      return res.status(400).json({ success: false, message: 'Hada token deja msta3mel' });
    }

    if (new Date() > resetRecord.expiresAt) {
      return res.status(400).json({ success: false, message: 'Token expiré. Talab reset jdid.' });
    }

    const user = await User.findById(resetRecord.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    resetRecord.used = true;
    await resetRecord.save();

    res.json({ success: true, message: 'Password bdel mzyan. T9der tdkhol daba.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Mochkil f server', error: error.message });
  }
});

// ============================================
// ORDERS (client)
// ============================================
app.get('/api/orders', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const {
      userId,
      items,
      totalAmount,
      subtotal,
      discount,
      discountPercent,
      discountAmount,
      promoCode,
      shippingAddress,
      paymentMethod
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.city || !shippingAddress.street) {
      return res.status(400).json({ success: false, message: 'Please fill in all shipping information' });
    }

    // ✅ Ila kan Giveaway code — verifi mn DB
    let finalDiscountPercent = Number(discountPercent) || 0;
    let finalDiscountAmount = Number(discountAmount) || 0;
    let finalPromoCode = (promoCode || '').toUpperCase();
    let giveawayReward = null;

    if (finalPromoCode.startsWith('LANADA-')) {
      giveawayReward = await GiveawayReward.findOne({
        code: finalPromoCode,
        userId
      });

      if (!giveawayReward) {
        return res.status(400).json({ success: false, message: 'Giveaway reward not found for this account.' });
      }

      if (giveawayReward.status !== 'available') {
        return res.status(400).json({ success: false, message: 'Giveaway reward is not available (used or expired).' });
      }

      if (giveawayReward.expiresAt <= new Date()) {
        giveawayReward.status = 'expired';
        await giveawayReward.save();
        return res.status(400).json({ success: false, message: 'Giveaway reward has expired.' });
      }

      // Server-side re-calc
      finalDiscountPercent = giveawayReward.discountPercent;
      finalDiscountAmount = Math.round(subtotal * finalDiscountPercent) / 100;
    }

    // ✅ Giveaway wla normal code — verifi UsedCode
    let usedCodeRecord = null;
    if (finalPromoCode) {
      usedCodeRecord = await UsedCode.findOne({
        code: finalPromoCode,
        userId
      });
      if (usedCodeRecord) {
        return res.status(400).json({ success: false, message: 'This code has already been used by your account.' });
      }
    }

    const order = new Order({
      userId: userId || 'anonymous',
      items,
      totalAmount: totalAmount || 0,
      subtotal: subtotal || totalAmount || 0,
      discount: discount || 0,
      discountPercent: finalDiscountPercent,
      discountAmount: finalDiscountAmount,
      promoCode: finalPromoCode,
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

    // ✅ Mark code as used ONLY after order saved
    if (finalPromoCode) {
      try {
        await UsedCode.create({ code: finalPromoCode, userId });
      } catch (err) {
        if (err.code === 11000) {
          // already used
        }
      }
    }

    // ✅ Mark giveaway as redeemed ONLY after order saved
    if (giveawayReward) {
      giveawayReward.status = 'redeemed';
      giveawayReward.redeemedAt = new Date();
      giveawayReward.orderId = order._id;
      await giveawayReward.save();
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
      totalAmount: order.totalAmount
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
  }
});

// ============================================
// ADMIN — ORDERS
// ============================================
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, message: 'Password ghalat' });
    }

    res.json({ success: true, message: 'Login successful', token: ADMIN_TOKEN });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/orders', async (req, res) => {
  try {
    const { token } = req.query;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
});

app.put('/api/admin/orders/:id/status', async (req, res) => {
  try {
    const { token } = req.query;
    const { status } = req.body;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated', order });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, message: 'Failed to update order', error: error.message });
  }
});

app.delete('/api/admin/orders/:id', async (req, res) => {
  try {
    const { token } = req.query;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, message: 'Failed to delete order', error: error.message });
  }
});

// ============================================
// NORMAL PROMO CODES (kima kan)
// ============================================
app.post('/api/promo/check-code', async (req, res) => {
  const { code, userId } = req.body;

  if (!code || !userId) {
    return res.status(400).json({ valid: false, error: 'Code wla userId manquant' });
  }

  try {
    const upperCode = code.toUpperCase();

    const promo = await PromoCode.findOne({ code: upperCode });

    if (!promo) {
      return res.json({ valid: false, message: "Hada l'code ma kaynch" });
    }

    if (!promo.isActive) {
      return res.json({ valid: false, message: "Hada l'code ma b9ach khddam" });
    }

    if (new Date() > promo.expiresAt) {
      return res.json({ valid: false, message: "Hada l'code expira" });
    }

    if (promo.usedCount >= promo.maxUses) {
      return res.json({ valid: false, message: "Hada l'code wssel l'limite dyal les utilisations" });
    }

    const existing = await UsedCode.findOne({ code: upperCode, userId });

    if (existing) {
      return res.json({ valid: false, message: "Hada l'code deja msta3mel" });
    }

    // ⚠️ Hna ma kan3mloch UsedCode — ghir f /orders
    res.json({
      valid: true,
      discountPercent: promo.discountPercent,
      message: `Code tsayeb: -${promo.discountPercent}%`
    });
  } catch (error) {
    console.error('Promo error:', error);
    res.status(500).json({ valid: false, error: 'Mochkil f server' });
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
// GIVEAWAY CHECK-CODE (jdid)
// ============================================
app.post('/api/giveaway/check-code', async (req, res) => {
  try {
    const { code, userId } = req.body;

    if (!code || !userId) {
      return res.status(400).json({ valid: false, message: 'Promo code and user ID are required.' });
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const reward = await GiveawayReward.findOne({ code: normalizedCode, userId });

    if (!reward) {
      return res.json({ valid: false, message: 'This giveaway code does not belong to your account.' });
    }

    if (reward.status === 'redeemed') {
      return res.json({ valid: false, message: 'This giveaway reward has already been redeemed.' });
    }

    if (reward.status === 'expired' || reward.expiresAt <= new Date()) {
      return res.json({ valid: false, message: 'This giveaway reward has expired.' });
    }

    const user = await User.findById(String(userId).replace(/^user_/, ''));

    if (!user || !user.googleVerified || !user.emailVerified) {
      return res.json({ valid: false, message: 'A verified Google Gmail account is required for this reward.' });
    }

    // ⚠️ Ma kan3mloch redeemed hna — ghir f /orders
    return res.json({
      valid: true,
      discountPercent: reward.discountPercent,
      message: `Giveaway code valid: -${reward.discountPercent}%`
    });
  } catch (error) {
    console.error('Giveaway validation error:', error);
    res.status(500).json({ valid: false, message: 'Giveaway validation failed.' });
  }
});

// ============================================
// ADMIN — PROMO CODES
// ============================================
app.post('/api/admin/promo/create', async (req, res) => {
  try {
    const { token, code, discountPercent, maxUses, expiresAt } = req.body;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!code || !discountPercent || !expiresAt) {
      return res.status(400).json({ success: false, message: 'code, discountPercent, expiresAt — koulhom khassin' });
    }

    const existing = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Hada l'code deja kayn" });
    }

    const promo = new PromoCode({
      code: code.toUpperCase(),
      discountPercent: Number(discountPercent),
      maxUses: Number(maxUses) || 100,
      expiresAt: new Date(expiresAt),
      isActive: true
    });

    await promo.save();

    res.status(201).json({ success: true, message: 'Code tsayeb mzyan', promo });
  } catch (error) {
    console.error('Create promo error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/promo/list', async (req, res) => {
  try {
    const { token } = req.query;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const promos = await PromoCode.find().sort({ createdAt: -1 });
    res.json(promos);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/promo/:id/toggle', async (req, res) => {
  try {
    const { token } = req.query;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo not found' });
    }

    promo.isActive = !promo.isActive;
    await promo.save();

    res.json({ success: true, message: promo.isActive ? 'Code activé' : 'Code désactivé', promo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// ADMIN — GIVEAWAY REWARDS (bonus — bach tchof)
// ============================================
app.get('/api/admin/giveaway/list', async (req, res) => {
  try {
    const { token } = req.query;

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const rewards = await GiveawayReward.find().sort({ createdAt: -1 });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});