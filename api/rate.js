export default async function handler(req, res) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

  // Step 1: Try fetching latest channel message directly
  try {
    // Use sendMessage workaround: get updates with large negative offset to get latest
    const r = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-10&limit=10&allowed_updates=["channel_post"]`
    );
    const d = await r.json();

    // If webhook is set, getUpdates returns 409 conflict
    if (!d.ok && d.error_code === 409) {
      // Delete the webhook so getUpdates works
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
      // Retry getUpdates
      const r2 = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=-10&limit=10&allowed_updates=["channel_post"]`
      );
      const d2 = await r2.json();
      if (!d2.ok) throw new Error('Telegram error after webhook delete: ' + d2.description);
      return parseAndRespond(d2, CHANNEL_ID, res);
    }

    if (!d.ok) throw new Error('Telegram error: ' + d.description);

    return parseAndRespond(d, CHANNEL_ID, res);

  } catch (e) {
    return res.status(500).json({ error: e.message || 'failed' });
  }
}

function parseAndRespond(d, CHANNEL_ID, res) {
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
    // Found a message but no rate pattern — return it for debugging
    return res.status(500).json({ error: 'Message found but no rate pattern matched', message: t });
  }

  return res.status(500).json({ error: 'No channel post found in last 10 updates' });
}
