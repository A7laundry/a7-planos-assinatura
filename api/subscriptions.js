const ASAAS_URL = process.env.ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

const PLANS = {
  office: { name: 'Office', monthly: 315 },
  individual: { name: 'Individual', monthly: 360 },
  familia: { name: 'Familia', monthly: 640 }
};

const ADDONS = {
  edredons: { name: 'Edredons', price: 79.90 },
  tenis: { name: 'Tenis', price: 59.90 },
  express: { name: 'Express 24h', price: 49.90 },
  impermeabilizacao: { name: 'Impermeabilizacao', price: 99.90 }
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { customerId, planKey, addons = [], creditCard, creditCardHolderInfo } = req.body;

    if (!customerId || !planKey || !creditCard) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ error: 'Plano invalido' });

    let totalMonthly = plan.monthly;
    (addons || []).forEach(key => {
      if (ADDONS[key]) totalMonthly += ADDONS[key].price;
    });

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const dueDateStr = nextDueDate.toISOString().split('T')[0];

    const addonDesc = addons.length > 0
      ? ' + ' + addons.map(k => ADDONS[k] ? ADDONS[k].name : k).join(', ')
      : '';

    const response = await fetch(`${ASAAS_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'CREDIT_CARD',
        cycle: 'MONTHLY',
        value: totalMonthly,
        nextDueDate: dueDateStr,
        description: `Plano ${plan.name} Mensal Recorrente${addonDesc}`,
        creditCard,
        creditCardHolderInfo
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.errors ? data.errors[0].description : 'Erro ao criar assinatura';
      return res.status(response.status).json({ error: errorMsg });
    }

    // Notify company
    try {
      const notifyUrl = `https://${req.headers.host}/api/notify`;
      await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subscription',
          planName: plan.name,
          value: totalMonthly,
          addons,
          customerId,
          subscriptionId: data.id
        })
      });
    } catch (_) { /* notification failure is non-blocking */ }

    return res.status(200).json({ id: data.id, status: data.status });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
