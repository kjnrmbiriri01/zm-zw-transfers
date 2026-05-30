const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  try {
    // Get the latest rate from Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rates?select=rate,raw_text,created_at&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) throw new Error('Supabase fetch failed');

    const data = await response.json();
    if (!data || data.length === 0) throw new Error('No rate in database yet');

    const { rate, raw_text, created_at } = data[0];
    return res.status(200).json({
      rate,
      raw_text,
      created_at,
      source: 'supabase'
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
