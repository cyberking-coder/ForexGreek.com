async function makeWebhook(status, student) {
  const url = status === 'paid' ? process.env.MAKE_WEBHOOK_PAID : process.env.MAKE_WEBHOOK_FAILED;
  if (!url || url.includes('xxxxxxxxxx')) return;
  const payload = {
    status, name: student.name, phone: student.phone, email: student.email,
    amount: student.plan_price, enrolled_at: new Date().toISOString(),
    payment_link: (process.env.BASE_URL || 'http://localhost:3000') + '/payment?user_id=' + student.id,
  };
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    console.log('[Make.com] Webhook fired:', status, '→ HTTP', res.status);
  } catch (err) {
    console.error('[Make.com] Webhook failed (non-blocking):', err.message);
  }
}
module.exports = { makeWebhook };
