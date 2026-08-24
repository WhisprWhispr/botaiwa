const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const Groq = require('groq-sdk');
const express = require('express');
const path = require('path');
const os = require('os');
const { executablePath } = require('puppeteer');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ADMIN_ID = process.env.ADMIN_ID;

let chromePath = executablePath();
if (os.platform() === 'linux') {
    chromePath = '/usr/bin/google-chrome';
}

const bots = {}; // Menyimpan semua sesi bot

const MEDIA_TYPES = ['image', 'video', 'audio', 'document', 'sticker'];
const SYSTEM_PROMPT = `Kamu adalah Hana, admin SukaCoding.

Gaya:
- ramah, santai, persuasif
- jawab singkat dan to the point
- emoji minimal

Fokus:
- hanya jawab tentang SukaCoding
- jangan bahas teknis mendalam, agama(kecuali jawab salam), politik, dll
- jika ada yang tanya tentang modul atau materi, arahkan ke website atau instagram

Catatan penting:
- Jika ada label [User mengirim gambar], artinya user mengirim gambar yang tidak bisa kamu lihat
- Tetap jawab pertanyaannya berdasarkan teks yang dikirim, dan beritahu bahwa kamu tidak bisa melihat isi gambarnya jika diperlukan
- jika user ingin berbicara dengan CS manusia, arahkan untuk balas dengan angka "6"

Informasi SukaCoding:
- Deskripsi: Platform belajar ngoding online terbaik, fokus ke Web Development & AI
- Instagram: https://www.instagram.com/sukacoding/
- Website: https://sukacoding.com
- Harga promo: Rp149.000 (lifetime/seumur hidup) dari harga normal Rp350.000
- Target: pemula hingga mahir yang ingin upgrade skill programming
- Pengajar: Tim SukaCoding, developer berpengalaman`;

const jumlahPesanPertama = 2;
const MENU_TEXT = `\n\nUntuk Info Lainnya, Kamu bisa balas dengan angka (1-6) untuk pilihan berikut:\n1. 💸 Info harga & Promo\n2. 📃 Cara daftar\n3. 📚 Materi yang dipelajari\n4. 📝 Sudah daftar tapi belum masuk komunitas\n5. 🙋‍♂️ Siapa Pengajarnya\n6. 🙋 bantuan CS manusia`;
const MAX_HISTORY = 5;
const batasiPesanPerHari = true;
const MAX_PESAN_PER_HARI = 20;
const MAX_CHARS_INPUT = 300;
const handleHotLeadAktif = false;

const normalize = (text) => text.toLowerCase();

function handleMedia(message) {
    if (!MEDIA_TYPES.includes(message.type)) return { tolak: false, teks: null };
    const caption = message.body ? message.body.trim() : '';
    if (message.type === 'image' && caption === '') return { tolak: true, teks: null, balasan: 'Maaf, saya tidak bisa melihat gambar. 😊\nKalau ada pertanyaan, ketik saja ya!' };
    if (message.type === 'image' && caption !== '') return { tolak: false, teks: `[User mengirim gambar dengan pesan]: ${caption}` };
    return { tolak: true, teks: null, balasan: 'Maaf, saya hanya bisa membalas pesan teks. 😊\nKalau ada pertanyaan, ketik saja ya!' };
}

function handleMenu(text) {
    if (text === '1') return 'Harga promo Rp149.000 (lifetime) dari Rp350.000.\nMau daftar? 👉 https://sukacoding.com\n\nBalas "2" untuk lihat cara daftarnya';
    if (text === '2') return 'Cara daftar gampang banget!\nLangsung ke https://sukacoding.com → klik Daftar → isi data → bayar → langsung akses materi! 😊';
    if (text === '3') return 'Materinya dari nol dan step-by-step.\nBahkan yang belum pernah ngoding pun bisa ikut!\n\nCek materi lengkap di sini:\nhttps://www.instagram.com/p/DXKTzSCj6tQ/?img_index=1\n\nBalas "2" untuk cara daftar';
    if (text === '4') return 'Kalau sudah daftar tapi belum masuk grup, biasanya admin belum accept.\nTunggu ya, paling lama 1x24 jam 😊';
    if (text === '5') return 'Pengajar di SukaCoding adalah developer-developer berpengalaman di industri.\nCek portofolio kami di website: https://sukacoding.com 🚀\n\nBalas "3" untuk lihat materi yang dipelajari';
    return null;
}

function handleHotLead(text) {
    const hotKeywords = ['mau daftar', 'mau beli', 'tertarik', 'gimana cara daftar', 'mau ikut'];
    if (hotKeywords.some(keyword => text.includes(keyword))) return `Mantap kak! 🚀\nLangsung daftar di sini ya:\nhttps://sukacoding.com\n\nPromo masih aktif, jangan sampai kehabisan! 👍`;
    return null;
}

async function startBot(botId) {
    if (bots[botId]) return bots[botId];

    console.log(`[SYSTEM] Starting bot session: ${botId}`);
    
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: botId }),
        puppeteer: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || chromePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
        }
    });

    const state = {
        id: botId,
        client: client,
        botAktif: true,
        botMenu: true,
        isConnected: false,
        currentQRCode: null,
        currentQRImage: null,
        totalMessagesToday: 0,
        startTime: Date.now(),
        chatHistory: {},
        userCooldown: {},
        handoverUsers: {},
        handoverWarned: {},
        userMessageCount: {}
    };
    bots[botId] = state;

    // UTILS BOUND TO STATE
    const getHistory = (id) => state.chatHistory[id] || [];
    const addHistory = (id, role, content) => { state.chatHistory[id] = [...getHistory(id), { role, content }].slice(-MAX_HISTORY); };
    const isSpam = (id) => { const now = Date.now(); const last = state.userCooldown[id] || 0; state.userCooldown[id] = now; return now - last < 3000; };
    const cekLimitHarian = (id) => {
        const hari = new Date().toISOString().slice(0, 10);
        const data = state.userMessageCount[id];
        if (!data || data.date !== hari) { state.userMessageCount[id] = { count: 1, date: hari }; return false; }
        state.userMessageCount[id].count++;
        return state.userMessageCount[id].count > MAX_PESAN_PER_HARI;
    };

    client.on('qr', async (qr) => {
        state.currentQRCode = qr;
        state.isConnected = false;
        try { state.currentQRImage = await QRCode.toDataURL(qr, { width: 300, margin: 2 }); } catch(e){}
    });

    client.on('ready', () => {
        state.isConnected = true;
        state.currentQRCode = null;
        state.currentQRImage = null;
        console.log(`✅ Bot [${botId}] WhatsApp siap!`);
    });

    client.on('disconnected', () => {
        state.isConnected = false;
        console.log(`⚠️ Bot [${botId}] terputus`);
    });

    client.on('message', async (message) => {
        try {
            if (message.from.endsWith('@g.us')) return;
            if (message.from.endsWith('@newsletter')) return;
            if (message.from === 'status@broadcast' || message.from.endsWith('@broadcast')) return;
            if (message.type === 'e2e_notification' || message.type === 'notification_template') return;
            if (!state.botAktif) return;

            const id = message.from;
            const contact = await message.getContact();
            const nama = contact.name || contact.pushname || 'Unknown';
            
            if (isSpam(id)) return;
            state.totalMessagesToday++;

            if (state.handoverUsers[contact.id.user]) {
                if (!state.handoverWarned[contact.id.user]) {
                    state.handoverWarned[contact.id.user] = true;
                    return message.reply('Mohon tunggu, admin segera menghubungi kamu ya! 😊');
                }
                return;
            }

            const media = handleMedia(message);
            if (media.tolak) return message.reply(media.balasan);
            
            const rawText = media.teks || message.body;
            if (rawText.length > MAX_CHARS_INPUT) return message.reply('Wah, pesannya terlalu panjang nih kak 😊\nCoba sampaikan lebih singkat ya!');

            const text = normalize(rawText);

            if (state.botMenu && !media.teks) {
                const menuReply = handleMenu(text);
                if (menuReply) {
                    if (text === '4') {
                        try { client.sendMessage(ADMIN_ID, `🔔 [${botId}] Ada user daftar belum masuk grup`); } catch(e){}
                    }
                    return message.reply(menuReply);
                }
                if (text === '6') {
                    state.handoverUsers[contact.id.user] = true;
                    state.handoverWarned[contact.id.user] = false;
                    try { await client.sendMessage(ADMIN_ID, `🔔 *Permintaan CS [${botId}]*\n👤 ${nama}\n📱 wa.me/${contact.id.user}`); } catch(e){}
                    return message.reply('Baik kak, permintaan kamu sudah disampaikan ke CS. 😊 Mohon tunggu ya!');
                }
            }

            if (handleHotLeadAktif) {
                const hot = handleHotLead(text);
                if (hot) return message.reply(hot);
            }

            if (batasiPesanPerHari && cekLimitHarian(contact.id.user)) {
                return message.reply(`Maaf Kak ${nama}, batas harian tercapai. 😊 Silakan chat besok!\nhttps://sukacoding.com` + MENU_TEXT);
            }

            // AI
            let chat = null;
            try { chat = await message.getChat(); await chat.sendStateTyping(); } catch (e) {}

            addHistory(contact.id.user, 'user', rawText);
            const res = await groq.chat.completions.create({
                model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                max_tokens: parseInt(process.env.MAX_TOKENS) || 250,
                messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...getHistory(contact.id.user)]
            });
            const reply = res.choices[0].message.content;
            addHistory(contact.id.user, 'assistant', reply);

            try { if (chat) await chat.clearState(); } catch (e) {}
            
            let finalReply = reply;
            if (getHistory(contact.id.user).length <= jumlahPesanPertama && state.botMenu) finalReply += MENU_TEXT;
            
            await message.reply(finalReply);

        } catch (err) {
            console.error(`❌ Error [${botId}]:`, err.message);
            try { await message.reply('Ops, saya sedang mengalami kesulitan. Silakan coba lagi nanti.\nhttps://sukacoding.com' + (state.botAktif ? MENU_TEXT : '')); } catch(e){}
        }
    });

    client.on('message_create', async (message) => {
        if (!message.fromMe) return;
        const text = normalize(message.body);
        if (text === '!on') { state.botAktif = true; return message.reply('✅ Bot aktif!'); }
        if (text === '!off') { state.botAktif = false; return message.reply('🔴 Bot mati!'); }
        if (text === '!menu on') { state.botMenu = true; return message.reply('✅ Menu aktif!'); }
        if (text === '!menu off') { state.botMenu = false; return message.reply('🔴 Menu mati!'); }
        if (text === '!status') return message.reply(`Bot: ${state.botAktif}\nMenu: ${state.botMenu}`);
        if (text === '!reset') { state.chatHistory = {}; return message.reply('✅ History reset!'); }
        if (text.startsWith('!selesai ')) {
            const num = text.replace('!selesai ', '').trim();
            if (state.handoverUsers[num]) { delete state.handoverUsers[num]; delete state.handoverWarned[num]; return message.reply(`✅ User dilepas dari handover.`); }
        }
    });

    client.initialize().catch(err => console.error(`Failed to init bot ${botId}:`, err));
    return state;
}

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/bots', (req, res) => {
    const list = Object.keys(bots).map(id => ({
        id,
        connected: bots[id].isConnected,
        botAktif: bots[id].botAktif
    }));
    res.json({ ok: true, bots: list });
});

app.post('/api/bots', async (req, res) => {
    const { botId } = req.body;
    if (!botId || botId.trim() === '') return res.status(400).json({ error: 'Bot ID required' });
    const safeId = botId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (bots[safeId]) return res.json({ ok: true, message: 'Already exists' });
    await startBot(safeId);
    res.json({ ok: true, botId: safeId });
});

app.post('/api/bots/delete-all', async (req, res) => {
    try {
        const botIds = Object.keys(bots);
        for (const id of botIds) {
            const bot = bots[id];
            try { await bot.client.logout(); } catch(e){}
            try { await bot.client.destroy(); } catch(e){}
            delete bots[id];
        }
        res.json({ ok: true, message: 'Semua client dihapus' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/status/:id', (req, res) => {
    const bot = bots[req.params.id];
    if (!bot) return res.status(404).json({ error: 'Not found' });
    const hari = new Date().toISOString().slice(0, 10);
    res.json({
        ok: true,
        connected: bot.isConnected,
        botAktif: bot.botAktif,
        botMenu: bot.botMenu,
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        uptimeMs: Date.now() - bot.startTime,
        totalMessagesToday: bot.totalMessagesToday,
        totalUsersToday: Object.keys(bot.userMessageCount).filter(k => bot.userMessageCount[k].date === hari).length,
        handoverCount: Object.keys(bot.handoverUsers).length
    });
});

app.get('/api/qr/:id', (req, res) => {
    const bot = bots[req.params.id];
    if (!bot) return res.status(404).json({ error: 'Not found' });
    if (bot.isConnected) return res.json({ ok: true, connected: true, qr: null });
    res.json({ ok: true, connected: false, qr: bot.currentQRImage || null });
});

app.post('/api/control/:id', async (req, res) => {
    const bot = bots[req.params.id];
    if (!bot) return res.status(404).json({ error: 'Not found' });
    const { action } = req.body;
    try {
        if (action === 'on') bot.botAktif = true;
        else if (action === 'off') bot.botAktif = false;
        else if (action === 'menu-on') bot.botMenu = true;
        else if (action === 'menu-off') bot.botMenu = false;
        else if (action === 'reset') bot.chatHistory = {};
        else if (action === 'logout') {
            try { await bot.client.logout(); } catch(e){}
            try { await bot.client.destroy(); } catch(e){}
            delete bots[req.params.id];
            return res.json({ ok: true, message: 'Logged out and deleted' });
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Multi-tenant Dashboard aktif di: http://0.0.0.0:${PORT}`);
    // Otomatis nyalakan slot bot 1 saat server jalan
    startBot('slot-1');
});

process.on('unhandledRejection', (r) => console.error('⚠️ Unhandled rejection:', r));
process.on('uncaughtException', (e) => console.error('⚠️ Uncaught exception:', e.message));