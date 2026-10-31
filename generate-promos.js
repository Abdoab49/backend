// backend/generate-promos.js
const fetch = require('node-fetch');

const ADMIN_TOKEN = 'lanada_admin_token_2026';
const BACKEND_URL = 'https://backend-3lyx.onrender.com/api/admin/promo/create';

// ✅ Function bash tgeneri code 3achwa2i
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createPromoCode(code, discountPercent, maxUses) {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: ADMIN_TOKEN,
        code: code,
        discountPercent: discountPercent,
        maxUses: maxUses,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Created: ${code} (${discountPercent}%)`);
    } else {
      console.log(`❌ Failed: ${code} — ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Error with ${code}:`, error.message);
  }
}

async function generateAll() {
  console.log('🚀 Starting to generate 100 promo codes...\n');

  for (let i = 0; i < 100; i++) {
    const code = generateCode();
    await createPromoCode(code, 20, 1); // 20% discount, 1 use
    // ✅ Sber chwiya bash ma ykounch overload
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('\n✅ Done!');
}

generateAll();