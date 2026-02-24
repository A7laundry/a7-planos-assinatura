const ASAAS_URL = process.env.ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://api-sandbox.asaas.com/v3';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, email, cpfCnpj, phone, postalCode, addressNumber } = req.body;

    if (!name || !email || !cpfCnpj) {
      return res.status(400).json({ error: 'Nome, email e CPF sao obrigatorios' });
    }

    const response = await fetch(`${ASAAS_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
      },
      body: JSON.stringify({
        name,
        email,
        cpfCnpj,
        phone,
        postalCode,
        addressNumber,
        notificationDisabled: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.errors ? data.errors[0].description : 'Erro ao criar cliente';
      return res.status(response.status).json({ error: errorMsg });
    }

    return res.status(200).json({ id: data.id, name: data.name });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
