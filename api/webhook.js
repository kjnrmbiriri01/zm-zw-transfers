const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const post = body.channel_post || body.message;

    if (!post) return res.status(200).json({ ok: true, skipped: 'no post' });

    // Only process messages from our channel
    if (CHANNEL_ID && String(post.chat.id) !== String(CHANNEL_ID)) {
      return res.status(200).json({ ok: true, skipped: 'wrong channel' });
    }

    const text = post.text || post.caption || '';

    // Extract rate after = sign e.g. "1usd=18.70zmw" or "Rate=20.50"
    const match = text.match(/=\s*(\d+\.?\d*)/i);
    if (!match) return res.status(200).json({ ok: true, skipped: 'no rate found' });

    const rate = parseFloat(match[1]);
    if (!rate || rate <= 0) return res.status(200).json({ ok: true, skipped: 'invalid rate' });

    // Save to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ rate, raw_text: text })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error('Supabase error: ' + err);
    }

    return res.status(200).json({ ok: true, rate });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
