const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const Groq = require('groq-sdk');
const express = require('express');
const path = require('path');
require('dotenv').config();

// =====================================================
// WHATSAPP AI BOT — Template by Yusril (@yusrilasrul_)
// =====================================================

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const { executablePath } = require('puppeteer');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || executablePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    }
});

// =====================
// CONFIG — Sesuaikan di sini
// =====================
let botAktif = true;
let handleHotLeadAktif = false; // aktifkan deteksi hot lead atau tidak
let botMenu = true; // tampilkan menu di awal chat atau tidak
const BOT_START_TIME = Math.floor(Date.now() / 1000);
const BOT_START_MS   = Date.now();
const MAX_HISTORY = 5; // jumlah riwayat chat yang diingat AI per user
const ADMIN_ID = process.env.ADMIN_ID;  // nomor admin untuk notifikasi handover
const batasiPesanPerHari = true; // aktifkan pembatasan pesan per hari
const MAX_PESAN_PER_HARI = 20; // batas pesan ke AI per user per hari
const MAX_CHARS_INPUT = 300; // batas karakter pesan user



// =====================
// TIPE MEDIA YANG TIDAK DIDUKUNG
// Pesan dengan tipe ini akan ditolak kecuali ada caption
// =====================
const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'];

// =====================
// SYSTEM PROMPT AI
// Ubah sesuai bisnis/kebutuhan kamu
// =====================
const SYSTEM_PROMPT = `Kamu adalah Hana, admin KelasWeb3.

Gaya:
- ramah, santai, persuasif
- jawab singkat dan to the point
- emoji minimal

Fokus:
- hanya jawab tentang KelasWeb3
- jangan bahas teknis mendalam, agama(kecuali jawab salam), politik, dll
- jika ada yang tanya tentang modul atau materi, arahkan ke website atau instagram

Catatan penting:
- Jika ada label [User mengirim gambar], artinya user mengirim gambar yang tidak bisa kamu lihat
- Tetap jawab pertanyaannya berdasarkan teks yang dikirim, dan beritahu bahwa kamu tidak bisa melihat isi gambarnya jika diperlukan
- jika user ingin berbicara dengan CS manusia, arahkan untuk balas dengan angka "6"

Informasi KelasWeb3:
- Deskripsi: kelas online untuk belajar bangun aplikasi Web terintegrasi blockchain
- Instagram: https://www.instagram.com/kelasweb3/
- Website: https://kelasweb3.com
- Harga promo: Rp149.000 (lifetime/seumur hidup) dari harga normal Rp350.000
- Target: pemula hingga developer yang mau naik level ke Web3
- Pengajar: Yusril, developer Web2 & Web3
- Instagram pengajar: https://www.instagram.com/yusrilasrul_/`;

// =====================
// MENU TEXT
// Teks ini ditampilkan di akhir balasan AI (hanya untuk 2 pesan pertama)
// =====================
const jumlahPesanPertama = 2; // ubah jumlah pesan pertama sesuai kebutuhan
const MENU_TEXT = `

Untuk Info Lainnya, Kamu bisa balas dengan angka (1-6) untuk pilihan berikut:
1. 💸 Info harga & Promo
2. 📃 Cara daftar
3. 📚 Materi yang dipelajari
4. 📝 Sudah daftar tapi belum masuk komunitas
5. 🙋‍♂️ Siapa Pengajarnya
6. 🙋 bantuan CS manusia`;

// =====================
// STATE — Jangan diubah
// =====================
const chatHistory = {};
const userCooldown = {};
const handoverUsers = {}; // user yang sudah request CS manusia
const handoverWarned = {}; // user yang sudah dapat balasan "mohon tunggu" sekali
const userMessageCount = {}; // { id: { count: 0, date: 'YYYY-MM-DD' } }

// =====================
// WEB DASHBOARD STATE
// =====================
let currentQRCode   = null; // QR string mentah dari whatsapp-web.js
let currentQRImage  = null; // QR sebagai data URL (base64 PNG)
let isConnected     = false; // apakah WA sudah terhubung
let totalMessagesToday = 0;  // counter pesan hari ini

// =====================
// UTILS
// =====================

// Ambil riwayat chat user
const getHistory = (id) => chatHistory[id] || [];

// Tambah riwayat chat user (dibatasi MAX_HISTORY)
const addHistory = (id, role, content) => {
    chatHistory[id] = [...getHistory(id), { role, content }].slice(-MAX_HISTORY);
};

// Cek apakah user mengirim pesan terlalu cepat (anti spam 3 detik)
const isSpam = (id) => {
    const now = Date.now();
    const last = userCooldown[id] || 0;
    userCooldown[id] = now;
    return now - last < 3000;
};

// Cek dan tambah hitungan pesan user hari ini
const cekLimitHarian = (id) => {
    const hari = new Date().toISOString().slice(0, 10); // format: YYYY-MM-DD
    const data = userMessageCount[id];

    // Jika belum ada data atau sudah hari baru → reset
    if (!data || data.date !== hari) {
        userMessageCount[id] = { count: 1, date: hari };
        return false; // belum kena limit
    }

    // Tambah hitungan
    userMessageCount[id].count++;

    // Cek apakah sudah melewati batas
    return userMessageCount[id].count > MAX_PESAN_PER_HARI;
};

// Normalisasi teks (lowercase)
const normalize = (text) => text.toLowerCase();

// =====================
// HANDLER MEDIA
// Deteksi pesan berupa gambar/media
// Mengembalikan: teks yang sudah diberi konteks, atau null jika harus ditolak
// =====================
const handleMedia = (message) => {
    if (!MEDIA_TYPES.includes(message.type)) return { tolak: false, teks: null };

    const caption = message.body ? message.body.trim() : '';

    // Gambar tanpa caption → tolak
    if (message.type === 'image' && caption === '') {
        return {
            tolak: true,
            teks: null,
            balasan: 'Maaf, saya tidak bisa melihat gambar. 😊\nKalau ada pertanyaan, ketik saja ya!'
        };
    }

    // Gambar dengan caption → beri konteks ke AI
    if (message.type === 'image' && caption !== '') {
        return {
            tolak: false,
            teks: `[User mengirim gambar dengan pesan]: ${caption}`
        };
    }

    // Tipe media lain (video, audio, document, sticker) → tolak semua
    return {
        tolak: true,
        teks: null,
        balasan: 'Maaf, saya hanya bisa membalas pesan teks. 😊\nKalau ada pertanyaan, ketik saja ya!'
    };
};

// =====================
// HANDLER MENU
// Tambah/ubah menu sesuai kebutuhan
// =====================
const handleMenu = (text) => {
    if (text === '1') {
        return 'Harga promo Rp149.000 (lifetime) dari Rp350.000.\nMau daftar? 👉 https://kelasweb3.com\n\nBalas "2" untuk lihat cara daftarnya';
    }
    if (text === '2') {
        return 'Cara daftar gampang banget!\nLangsung ke https://kelasweb3.com → klik Daftar → isi data → bayar → langsung akses materi! 😊';
    }
    if (text === '3') {
        return 'Materinya dari nol dan step-by-step.\n' +
               'Bahkan yang belum pernah ngoding pun bisa ikut!\n\n' +
               'Cek materi lengkap di sini:\nhttps://www.instagram.com/p/DXKTzSCj6tQ/?img_index=1\n\n' +
               'Balas "2" untuk cara daftar';
    }
    if (text === '4') {

        try {
            client.sendMessage(ADMIN_ID, '🔔 Ada user yang sudah daftar tapi belum masuk grup');
        } catch (err) {
            console.error('❌ Gagal kirim notifikasi ke admin:', err.message);
        }
        return 'Kalau sudah daftar tapi belum masuk grup, biasanya admin belum accept.\n' +
               'Tunggu ya, paling lama 1x24 jam 😊';
    }
    if (text === '5') {
        return 'Pengajar di KelasWeb3 adalah Yusril, seorang developer Web2 & Web3.\n' +
               'Follow Instagram-nya: https://www.instagram.com/yusrilasrul_/ 🚀\n\n' +
               'Balas "3" untuk lihat materi yang dipelajari';
    }
    return null;
};

// =====================
// HANDLER HOT LEAD
// Deteksi calon pembeli yang sudah tertarik
// =====================
const handleHotLead = (text) => {
    const hotKeywords = ['mau daftar', 'mau beli', 'tertarik', 'gimana cara daftar', 'mau ikut'];
    if (hotKeywords.some(keyword => text.includes(keyword))) {
        return `Mantap kak! 🚀\nLangsung daftar di sini ya:\nhttps://kelasweb3.com\n\nPromo masih aktif, jangan sampai kehabisan! 👍`;
    }
    return null;
};

// =====================
// HANDLER HANDOVER
// Proses ketika user minta CS manusia (menu angka 6)
// =====================
const handleHandover = async (nomor, nama) => {
    // Tandai user ini sebagai handover
    handoverUsers[nomor] = true;
    handoverWarned[nomor] = false;

    // Kirim notifikasi ke nomor admin
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
    const notifAdmin =
        `🔔 *Permintaan CS Manusia*\n\n` +
        `👤 Nama: ${nama}\n` +
        `📱 Nomor: wa.me/${nomor}\n` +
        `🕐 Waktu: ${waktu}\n\n` +
        `Silakan balas langsung ke user tersebut.`;

    try {
        await client.sendMessage(ADMIN_ID, notifAdmin);
        console.log(`🔔 Notifikasi handover dikirim ke admin untuk user: ${nama}`);
    } catch (err) {
        console.error('❌ Gagal kirim notifikasi ke admin:', err.message);
    }

    // Balasan ke user
    return `Baik kak, permintaan kamu sudah kami sampaikan ke CS kami. 😊\nMohon tunggu, admin akan segera menghubungi kamu ya!`;
};

// =====================
// HANDLER AI
// =====================
const handleAI = async (id, text, message) => {
    // Mulai typing indicator
    let chat = null;
    try {
        chat = await message.getChat(); // ← cukup sekali
        await chat.sendStateTyping();
    } catch (e) {}


    addHistory(id, 'user', text);

    const res = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        max_tokens: parseInt(process.env.MAX_TOKENS) || 250,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...getHistory(id)
        ]
    });

    const reply = res.choices[0].message.content;
    addHistory(id, 'assistant', reply);

    console.log(`📊 Token: input=${res.usage.prompt_tokens} output=${res.usage.completion_tokens} total=${res.usage.total_tokens}`);

    // Stop typing indicator
    try {
        if (chat) await chat.clearState(); // ← tidak perlu getChat() lagi
    } catch (e) {}

    return reply;
};

// =====================
// MAIN EVENT — Pesan dari orang lain
// =====================
client.on('message', async (message) => {
    try {
        // Skip pesan dari grup
        if (message.from.endsWith('@g.us')) return;

        // Skip saluran/channel
        if (message.from.endsWith('@newsletter')) return;

        // Skip broadcast & status WhatsApp
        if (message.from === 'status@broadcast') return;
        if (message.from.endsWith('@broadcast')) return;

        // Skip pesan sistem
        if (message.type === 'e2e_notification') return;
        if (message.type === 'notification_template') return;

        const id = message.from;

        // Skip pesan lama sebelum bot nyala
        if (message.timestamp < BOT_START_TIME) return;

        // Skip kalau bot nonaktif
        if (!botAktif) return;

        const contact = await message.getContact();
        const nama = contact.name || contact.pushname || 'Unknown';
        console.log(`💬 Pesan dari: ${nama} (${message.from}) (${message.type}) | ${message.body}`);

        // Anti spam
        if (isSpam(id)) return;

        // Tambah counter pesan hari ini
        totalMessagesToday++;

        // =====================
        // CEK HANDOVER
        // Jika user sudah request CS manusia, bot tidak balas lagi
        // =====================
        if (handoverUsers[contact.id.user]) {
            // Hanya balas sekali sebagai pengingat
            if (!handoverWarned[contact.id.user]) {
                handoverWarned[contact.id.user] = true;
                return message.reply('Mohon tunggu, admin segera menghubungi kamu ya! 😊');
            }
            // Setelah peringatan pertama, diam saja
            return;
        }

        // =====================
        // DETEKSI MEDIA
        // =====================
        const media = handleMedia(message);
        if (media.tolak) {
            return message.reply(media.balasan);
        }

        // Gunakan teks dari caption (jika gambar) atau teks biasa
        const rawText = media.teks || message.body;

        // Cek panjang pesan untuk mencegah overload AI
        if (rawText.length > MAX_CHARS_INPUT) {
            return message.reply(
                'Wah, pesannya terlalu panjang nih kak '+nama+' 😊\n' +
                'Coba sampaikan pertanyaannya lebih singkat ya, biar saya bisa bantu dengan lebih baik!'
            );
        }

        const text = normalize(rawText);

        // Cek menu jika botMenu aktif
        // Catatan: menu hanya dicek untuk pesan teks biasa, bukan gambar dengan caption
        if (botMenu && !media.teks) {
            const menuReply = handleMenu(text);
            if (menuReply) return message.reply(menuReply);

            // Menu 6 — request CS manusia
            if (text === '6') {
                const replyHandover = await handleHandover(contact.id.user, nama);
                return message.reply(replyHandover);
            }
        }

        // Cek hot lead
        if (handleHotLeadAktif) {
            const hot = handleHotLead(text);
            if (hot) return message.reply(hot);
        }

        //cek pembatasan pesan per hari
        if (batasiPesanPerHari && cekLimitHarian(contact.id.user)) {
            return message.reply(
                `Maaf Kak ${nama}, batas percakapan harian kakak sudah tercapai. 😊\n` +
                'Silakan chat lagi besok ya!\n\n' +
                'Sementara itu, kamu bisa lihat info lengkap di:\n' +
                'https://kelasweb3.com' +
                MENU_TEXT
            );
        }

        // Jawab pakai AI
        // Kirim rawText (bukan text) agar konteks [User mengirim gambar] tidak dilowercase
        let reply = await handleAI(contact.id.user, rawText, message);

        // Tambahkan menu di 2 pesan pertama
        if (getHistory(contact.id.user).length <= jumlahPesanPertama && botMenu) {
            reply += MENU_TEXT;
        }

        await message.reply(reply);
        console.log('─'.repeat(40));

    } catch (err) {
        console.error('❌ Error:', err.message);
        // botAktif = true; // pastikan bot aktif jika error
        try {
            await message.reply(
                'Ops, saya sedang mengalami kesulitan untuk menjawab. Silakan coba lagi nanti.\n' +
                'Silakan kunjungi https://kelasweb3.com untuk informasi lebih lanjut.' +
                (botAktif ? MENU_TEXT : '')
            );
        } catch (e) {}
    }
});

// =====================
// MAIN EVENT — Perintah dari nomor sendiri
// Kirim perintah ke nomor sendiri (chat dengan diri sendiri)
// =====================
client.on('message_create', async (message) => {
    if (!message.fromMe) return;

    const text = normalize(message.body);

    if (text === '!on') {
        botAktif = true;
        return message.reply('✅ Bot diaktifkan!');
    }
    if (text === '!off') {
        botAktif = false;
        return message.reply('🔴 Bot dimatikan!');
    }
    if (text === '!menu on') {
        botMenu = true;
        return message.reply('✅ Menu diaktifkan!');
    }
    if (text === '!menu off') {
        botMenu = false;
        return message.reply('🔴 Menu dimatikan!');
    }
    if (text === '!status') {
        return message.reply(`Status bot: ${botAktif ? '✅ Aktif' : '🔴 Nonaktif'}\nMenu: ${botMenu ? '✅ Aktif' : '🔴 Nonaktif'}`);
    }
    if (text === '!reset') {
        Object.keys(chatHistory).forEach(k => chatHistory[k] = []);
        return message.reply('✅ Semua history chat direset!');
    }
    if (text.startsWith('!selesai ')) {
        // Format: !selesai 628XXXXXXXXXX
        // Digunakan setelah admin selesai handle user secara manual
        const nomorTarget = text.replace('!selesai ', '').trim();
        if (handoverUsers[nomorTarget]) {
            delete handoverUsers[nomorTarget];
            delete handoverWarned[nomorTarget];
            return message.reply(`✅ User ${nomorTarget} sudah dilepas dari mode handover. Bot aktif kembali untuk user tersebut.`);
        }
        return message.reply(`⚠️ User ${nomorTarget} tidak sedang dalam mode handover.`);
    }
    if (text === '!limit') {
        const hari = new Date().toISOString().slice(0, 10);
        const aktif = Object.entries(userMessageCount)
            .filter(([_, v]) => v.date === hari)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([id, v]) => `${id.replace('@c.us','').replace('@lid','')} → ${v.count}/${MAX_PESAN_PER_HARI}`)
            .join('\n');

        return message.reply(aktif
            ? `📊 *Pemakaian AI hari ini:*\n\n${aktif}`
            : '📊 Belum ada pemakaian AI hari ini.'
        );
    }
    if (text === '!help') {
        return message.reply(
            '*Daftar Perintah Bot:*\n\n' +
            '!on → Aktifkan bot\n' +
            '!off → Matikan bot\n' +
            '!menu on → Aktifkan menu\n' +
            '!menu off → Matikan menu\n' +
            '!status → Cek status bot\n' +
            '!reset → Reset semua history chat\n' +
            '!selesai 628XXX → Lepas user dari mode handover\n' +
            '!limit → Cek pemakaian AI hari ini\n' +
            '!help → Tampilkan bantuan ini'
        );
    }
});

// =====================
// QR CODE & READY
// =====================
client.on('qr', async (qr) => {
    currentQRCode  = qr;
    isConnected    = false;
    console.log('📱 Scan QR Code berikut dengan WhatsApp kamu:');
    qrcode.generate(qr, { small: true });

    // Simpan QR sebagai gambar base64 untuk web dashboard
    try {
        currentQRImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
    } catch (e) {
        console.error('❌ Gagal generate QR image:', e.message);
    }
});

client.on('ready', () => {
    isConnected   = true;
    currentQRCode  = null;
    currentQRImage = null;
    console.log('✅ Bot WhatsApp siap!');
    console.log(`⚙️  Model AI: ${process.env.GROQ_MODEL || 'llama-3.1-8b-instant'}`);
    console.log(`⚙️  Max tokens: ${process.env.MAX_TOKENS || 250}`);
    console.log(`🌐 Dashboard: http://localhost:${process.env.PORT || 3000}`);
});

client.on('disconnected', () => {
    isConnected = false;
    console.log('⚠️ Bot terputus dari WhatsApp');
});

// =====================
// WEB DASHBOARD — Express Server
// =====================
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/status — Status bot lengkap
app.get('/api/status', (req, res) => {
    const hari = new Date().toISOString().slice(0, 10);
    const totalToday = Object.values(userMessageCount)
        .filter(v => v.date === hari)
        .reduce((sum, v) => sum + v.count, 0);

    res.json({
        ok: true,
        connected:         isConnected,
        botAktif:          botAktif,
        botMenu:           botMenu,
        model:             process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        uptimeMs:          Date.now() - BOT_START_MS,
        totalMessagesToday: totalMessagesToday,
        totalUsersToday:   Object.keys(userMessageCount).filter(k => userMessageCount[k].date === hari).length,
        handoverCount:     Object.keys(handoverUsers).length,
    });
});

// GET /api/qr — QR Code sebagai base64 data URL
app.get('/api/qr', (req, res) => {
    if (isConnected) {
        return res.json({ ok: true, connected: true, qr: null });
    }
    res.json({ ok: true, connected: false, qr: currentQRImage || null });
});

// POST /api/control — Kontrol bot
app.post('/api/control', (req, res) => {
    const { action } = req.body;

    switch (action) {
        case 'on':
            botAktif = true;
            console.log('🌐 [Dashboard] Bot diaktifkan');
            return res.json({ ok: true, message: 'Bot diaktifkan' });

        case 'off':
            botAktif = false;
            console.log('🌐 [Dashboard] Bot dimatikan');
            return res.json({ ok: true, message: 'Bot dimatikan' });

        case 'menu-on':
            botMenu = true;
            console.log('🌐 [Dashboard] Menu diaktifkan');
            return res.json({ ok: true, message: 'Menu diaktifkan' });

        case 'menu-off':
            botMenu = false;
            console.log('🌐 [Dashboard] Menu dimatikan');
            return res.json({ ok: true, message: 'Menu dimatikan' });

        case 'reset':
            Object.keys(chatHistory).forEach(k => chatHistory[k] = []);
            console.log('🌐 [Dashboard] History chat direset');
            return res.json({ ok: true, message: 'History direset' });

        default:
            return res.status(400).json({ ok: false, error: 'Aksi tidak dikenali' });
    }
});

// Jalankan web server
app.listen(PORT, () => {
    console.log(`🌐 Dashboard aktif di: http://localhost:${PORT}`);
});

// =====================
// ERROR HANDLER GLOBAL
// Bot tidak akan crash meskipun ada error
// =====================
process.on('unhandledRejection', (reason) => {
    console.error('⚠️ Unhandled error (bot tetap jalan):', reason);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ Uncaught error (bot tetap jalan):', error.message);
});

// Jalankan bot
client.initialize();