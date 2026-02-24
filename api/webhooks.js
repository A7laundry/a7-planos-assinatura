module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { event, payment } = req.body;

    console.log(`[Webhook] Event: ${event}`);

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        console.log(`[Webhook] Payment ${payment.id} confirmed - Customer: ${payment.customer} - Value: R$${payment.value}`);
        break;

      case 'PAYMENT_OVERDUE':
        console.log(`[Webhook] Payment ${payment.id} overdue - Customer: ${payment.customer}`);
        break;

      case 'PAYMENT_REFUNDED':
        console.log(`[Webhook] Payment ${payment.id} refunded - Customer: ${payment.customer}`);
        break;

      default:
        console.log(`[Webhook] Unhandled event: ${event}`, JSON.stringify(req.body).slice(0, 500));
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ received: true });
  }
};
