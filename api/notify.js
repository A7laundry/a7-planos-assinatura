module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { type, planName, value, billingType, addons, customerId, paymentId, subscriptionId } = req.body;

    const addonsList = (addons || []).length > 0 ? addons.join(', ') : 'Nenhum';

    const message = [
      `Nova ${type === 'subscription' ? 'Assinatura Recorrente' : 'Compra Anual'}!`,
      `Plano: ${planName}`,
      `Valor: R$${Number(value).toFixed(2)}`,
      type === 'annual_payment' ? `Forma: ${billingType}` : 'Forma: Cartao Recorrente',
      `Add-ons: ${addonsList}`,
      `Cliente Asaas: ${customerId}`,
      type === 'subscription' ? `Assinatura: ${subscriptionId}` : `Pagamento: ${paymentId}`
    ].join('\n');

    // Log to Vercel (visible in dashboard logs)
    console.log('=== NOVA VENDA ===');
    console.log(message);
    console.log('==================');

    // Optional: send WhatsApp notification to company
    // Can be integrated with WhatsApp Business API or Z-API
    // For now, relying on Asaas native notifications + Vercel logs

    return res.status(200).json({ success: true, message: 'Notificacao registrada' });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ error: 'Erro ao notificar' });
  }
};
