/**
 * POST /api/react
 * Body: { "link": "https://whatsapp.com/channel/<id>/<postId>", "emojis": ["💐","👍"] }
 *
 * Backend di sisi server: validasi link, whitelist emoji (maks 5),
 * rate-limit per IP, lalu panggil sendreactch dari lib/react_ch.js.
 */
const { sendreactch, normalizeWhatsAppPostLink } = require('../lib/react_ch');

// Emoji diterima jika berupa satu emoji (boleh ZWJ / skin tone / VS16). Teks biasa dan koma ditolak.
const EMOJI_RE = /^\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}])*(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}])*)*$/u;
const isEmoji = (e) => typeof e === 'string' && e.length <= 20 && EMOJI_RE.test(e);
const MAX_EMOJI = 5;

// Rate limit sederhana (best-effort; memori per instance serverless)
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 6;
const hits = new Map();

function isLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function getIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function parseBody(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') {
    try { return JSON.parse(b); } catch (_) { return {}; }
  }
  return b;
}

async function reactAll(link, emojis) {
  if (emojis.length === 1) {
    const r = await sendreactch(link, emojis[0], 30000);
    return { ...r, sent: emojis, failed: [], mode: 'single' };
  }

  // Mode 1 (default): satu request, emoji digabung koma
  if ((process.env.REACT_MODE || 'combined') === 'combined') {
    try {
      const r = await sendreactch(link, emojis.join(','), 25000);
      return { ...r, sent: emojis, failed: [], mode: 'combined' };
    } catch (_) {
      // jatuh ke mode 2 di bawah
    }
  }

  // Mode 2: satu request per emoji, paralel
  const settled = await Promise.allSettled(
    emojis.map((e) => sendreactch(link, e, 25000))
  );
  const sent = [];
  const failed = [];
  let first = null;
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      sent.push(emojis[i]);
      first = first || s.value;
    } else {
      failed.push(emojis[i]);
    }
  });
  if (!sent.length) {
    throw settled.find((s) => s.status === 'rejected').reason;
  }
  return { ...first, sent, failed, mode: 'separate' };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Gunakan metode POST.' });
  }

  if (isLimited(getIp(req))) {
    return res.status(429).json({
      success: false,
      message: 'Terlalu banyak permintaan. Tunggu 1 menit lalu coba lagi.',
    });
  }

  const { link, emojis } = parseBody(req);

  if (typeof link !== 'string' || !link.trim()) {
    return res.status(400).json({ success: false, message: 'Link postingan wajib diisi.' });
  }

  let cleanLink;
  try {
    cleanLink = normalizeWhatsAppPostLink(link.trim());
  } catch (e) {
    const msg = e instanceof TypeError ? 'Link tidak valid.' : e.message;
    return res.status(400).json({ success: false, message: msg });
  }

  if (!Array.isArray(emojis)) {
    return res.status(400).json({ success: false, message: 'Pilih minimal 1 emoji.' });
  }
  const unique = [...new Set(emojis)];
  if (unique.length < 1 || unique.length > MAX_EMOJI) {
    return res.status(400).json({
      success: false,
      message: `Pilih 1 sampai ${MAX_EMOJI} emoji.`,
    });
  }
  if (!unique.every(isEmoji)) {
    return res.status(400).json({ success: false, message: 'Ada karakter yang bukan emoji.' });
  }

  try {
    const r = await reactAll(cleanLink, unique);
    return res.status(200).json({
      success: true,
      message: r.message || 'Reaksi terkirim.',
      target: r.target || cleanLink,
      emojis: r.emojis || r.sent,
      sent: r.sent,
      failed: r.failed,
      mode: r.mode,
      took_ms: r.took_ms == null ? null : r.took_ms,
    });
  } catch (e) {
    const raw = String(e && e.message ? e.message : e);
    const busy = /busy|HTTP 400|HTTP 429|HTTP 5\d\d|timeout/i.test(raw);
    return res.status(busy ? 503 : 502).json({
      success: false,
      message: busy
        ? 'Server reaksi sedang sibuk. Coba lagi beberapa saat.'
        : raw.slice(0, 200),
    });
  }
};
