/**
 * Mengirim reaksi ke WhatsApp Channel melalui API
 * Description: Nih makan uy send React pesan saluran WhatsApp 😹
 * Credit by Zx
 * Sumber: https://whatsapp.com/channel/0029VbDLqe7EquiSF4STU13o
 * Website Uploader: https://zfile.web.id/
 * Web Sewain Nomor WhatsApp: https://linksz.web.id/wa-sewa
 *
 * Catatan: Kalau Mau Di Sher Lagi Pake Credit Atau sumber mas 😹
 *
 * (Versi modul: blok contoh yang auto-jalan dihapus supaya aman di-import
 *  oleh serverless function Vercel. Logika sendreactch tidak diubah.)
 */

/*
kalau ada pesan Error HTTP 400: "Server is busy, please try again in a moment"
itu memang biasa soalnya Ketika server API sibuk (karena limit proxy atau overload)
*/

const axios = require('axios');

const API_URL = 'https://apis.davidcyriltech.my.id/tools/wareact';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
  'Referer': 'https://wa.dclabs.my.id/',
  'Accept': 'application/json',
};

function normalizeWhatsAppPostLink(link) {
  const url = new URL(link);

  const hostname = url.hostname.replace(/^www\./i, '');
  if (hostname !== 'whatsapp.com') {
    throw new Error('Domain harus whatsapp.com');
  }

  const match = url.pathname.match(/^\/channel\/([^\/]+)\/(\d+)\/?$/);
  if (!match) {
    throw new Error(
      'Format link harus berupa https://whatsapp.com/channel/<channelId>/<postId>'
    );
  }

  return `https://whatsapp.com/channel/${match[1]}/${match[2]}`;
}

async function sendreactch(link_saluran_wa, emoji = '❤️', timeoutMs = 30000) {
  const url = normalizeWhatsAppPostLink(link_saluran_wa);

  const res = await axios.get(API_URL, {
    params: {
      url,
      emoji,
    },
    headers: DEFAULT_HEADERS,
    timeout: timeoutMs,
    validateStatus: () => true,
  });

  const data = res.data;

  if (res.status !== 200) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Response API bukan JSON valid.');
  }

  if (!data.success) {
    throw new Error(data.message || 'API mengembalikan success=false.');
  }

  return data;
}

module.exports = { sendreactch, normalizeWhatsAppPostLink };
