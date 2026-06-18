export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', service: 'AuraAI API', version: '1.0.0' });
  }

  if (req.method === 'POST') {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Security check
    const blockedPatterns = [
      /\b(exploit|payload|backdoor|shellcode|malware|ransomware|trojan|virus|hack|retas|bobol|phish|scam|ddos)\b/i,
      /\b(buat|create|generate).*(virus|malware|ransomware|exploit)\b/i,
      /\b(cara|how|tutorial).*(hack|retas|bobol|nyusup)\b/i,
      /\b(curi|steal|scrape).*(data|password|kredensial)\b/i
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(message.toLowerCase())) {
        return res.status(403).json({
          success: false,
          blocked: true,
          message: '🚫 Permintaan ditolak karena melanggar kebijakan keamanan.'
        });
      }
    }

    // Simple response
    return res.status(200).json({
      success: true,
      data: {
        message: `Saya memahami pesan Anda: "${message}". Saat ini saya berjalan dalam mode serverless Vercel. Untuk pengalaman penuh, gunakan mode client-side.`,
        conversationId: Date.now().toString(36),
        timestamp: new Date().toISOString()
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
