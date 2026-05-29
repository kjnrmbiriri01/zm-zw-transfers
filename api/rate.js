export default async function handler(req, res) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    const d = await r.json();

    if (!d.ok) throw new Error('Telegram error');

    let latest = null;
    for (let i = 0; i < d.result.length; i++) {
      const p = d.result[i].channel_post;
      if (p && p.chat && String(p.chat.id) === String(CHANNEL_ID)) {
        if (!latest || p.date > latest.date) latest = p;
      }
    }

    if (latest) {
      const t = latest.text || latest.caption || '';
      const m = t.match(/=\s*(\d+\.?\d*)/);
      if (m && m[1]) {
        const rate = parseFloat(m[1]);
        if (rate > 0) {
          return res.status(200).json({ rate, date: latest.date, source: 'telegram' });
        }
      }
    }

    throw new Error('No rate found in channel');
  } catch (e) {
    return res.status(500).json({ error: e.message || 'failed' });
  }
}
