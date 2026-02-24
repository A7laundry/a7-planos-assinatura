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
    const {
      customerId, planKey, addons = [],
      billingType, installmentCount = 1,
      creditCard, creditCardHolderInfo
    } = req.body;

    if (!customerId || !planKey || !billingType) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const plan = PLANS[planKey];
    if (!plan) return res.status(400).json({ error: 'Plano invalido' });

    // Calculate annual total
    let annualTotal = plan.monthly * 12;
    (addons || []).forEach(key => {
      if (ADDONS[key]) annualTotal += ADDONS[key].price * 12;
    });

    // Apply PIX discount
    if (billingType === 'PIX') {
      annualTotal = Math.round(annualTotal * 0.95);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const addonDesc = addons.length > 0
      ? ' + ' + addons.map(k => ADDONS[k] ? ADDONS[k].name : k).join(', ')
      : '';

    const paymentBody = {
      customer: customerId,
      billingType,
      value: annualTotal,
      dueDate: dueDateStr,
      description: `Plano ${plan.name} Anual (13 meses)${addonDesc}`
    };

    if (billingType === 'CREDIT_CARD') {
      if (!creditCard) {
        return res.status(400).json({ error: 'Dados do cartao obrigatorios' });
      }
      paymentBody.creditCard = creditCard;
      paymentBody.creditCardHolderInfo = creditCardHolderInfo;
      if (installmentCount > 1) {
        paymentBody.installmentCount = Math.min(installmentCount, 10);
        paymentBody.installmentValue = Math.ceil(annualTotal / paymentBody.installmentCount * 100) / 100;
      }
    }

    const response = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
      },
      body: JSON.stringify(paymentBody)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.errors ? data.errors[0].description : 'Erro ao processar pagamento';
      return res.status(response.status).json({ error: errorMsg });
    }

    const result = { id: data.id, status: data.status };

    // If PIX, get QR code
    if (billingType === 'PIX' && data.id) {
      try {
        const pixRes = await fetch(`${ASAAS_URL}/payments/${data.id}/pixQrCode`, {
          headers: { 'access_token': process.env.ASAAS_API_KEY }
        });
        const pixData = await pixRes.json();
        if (pixRes.ok) {
          result.pix = {
            encodedImage: pixData.encodedImage,
            payload: pixData.payload
          };
        }
      } catch (_) { /* pix fetch failure */ }
    }

    // Notify company
    try {
      const notifyUrl = `https://${req.headers.host}/api/notify`;
      await fetch(notifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'annual_payment',
          planName: plan.name,
          value: annualTotal,
          billingType,
          addons,
          customerId,
          paymentId: data.id
        })
      });
    } catch (_) { /* notification failure is non-blocking */ }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
