const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = '-1004294360619';

exports.handler = async () => {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!data.ok) throw new Error('Telegram API error');
    
    let latest = null;
    for (const update of data.result) {
      const p = update.channel_post;
      if (p && p.chat && String(p.chat.id) === CHANNEL_ID) {
        if (!latest || p.date > latest.date) latest = p;
      }
    }
    
    if (latest) {
      const text = latest.text || latest.caption || '';
      // Match any number: "19.50", "=18.80", "1usd=18.45zmw" etc
      const m = text.match(/(\d+\.?\d*)/);
      if (m) {
        const rate = parseFloat(m[1]);
        if (rate > 0) {
          return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rate, date: latest.date, text })
          };
        }
      }
    }
    
    throw new Error('No valid rate found in channel');
  } catch (e) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rate: 0, error: e.message })
    };
  }
};