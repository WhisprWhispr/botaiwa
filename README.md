# 🤖 WhatsApp AI Bot — Template by Yusril

Bot WhatsApp otomatis berbasis AI menggunakan **Groq API (Gratis)** dan **whatsapp-web.js**.
Cocok untuk CS otomatis, admin toko online, atau kelas online kamu!

> Dibuat oleh [@yusrilasrul_](https://www.instagram.com/yusrilasrul_/)

---

## 📱 Tutorial Video Cara Penggunaan

- YouTube: [Tutorial Lengkap](https://youtu.be/dI1IyrzaLEQ)

---

## ✨ Fitur

- 🤖 Balas pesan otomatis pakai AI (Groq — Gratis!)
- 📋 Menu pilihan angka (1-6) tanpa token AI
- 🔥 Deteksi hot lead otomatis (Opsional)
- 🧠 AI ingat riwayat chat per user
- 🚫 Anti spam (cooldown 3 detik)
- 🔇 Skip grup, saluran, broadcast, status
- 🎮 Kontrol bot dari nomor sendiri 
- 💪 Bot tidak crash meski ada error
- 🙋 Handover ke CS manusia + notifikasi admin otomatis
- 📵 Pembatasan pesan per hari per user (Opsional)
- 🖼️ Deteksi & handling pesan media

---

## 📦 Kebutuhan

- Node.js v18 atau lebih baru
- Akun Groq (gratis) → https://console.groq.com
- WhatsApp aktif untuk di-scan QR

---

## 🚀 Cara Install

### 1. Clone / Download project ini

```bash
# Ekstrak folder hasil download
cd whatsapp-ai-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment

```bash
# Salin file contoh
cp .env.example .env
```

Buka file `.env` dan isi API key kamu:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Cara dapat API Key Groq (Gratis)

1. Buka https://console.groq.com
2. Daftar / login pakai Google
3. Klik **"API Keys"** di sidebar
4. Klik **"Create API Key"**
5. Copy API key → paste ke file `.env`

### 5. Jalankan bot

```bash
node index.js
```

6. Scan QR Code yang muncul di terminal pakai WhatsApp kamu
7. Bot siap digunakan! ✅

---

## ⚙️ Kustomisasi

### Ubah kepribadian AI

Buka `index.js`, cari bagian `SYSTEM_PROMPT` dan ubah sesuai bisnis kamu:

```javascript
const SYSTEM_PROMPT = `Kamu adalah [nama admin], admin [nama bisnis kamu].

Gaya:
- ramah, santai
- jawab singkat

Informasi bisnis:
- Nama: [nama bisnis]
- Website: [website kamu]
- Harga: [harga produk]
- ...`;
```

### Ubah menu

Cari bagian `handleMenu` dan ubah teks balasan sesuai kebutuhan:

```javascript
const handleMenu = (text) => {
    if (text === '1') {
        return 'Balasan untuk menu 1...';
    }
    if (text === '2') {
        return 'Balasan untuk menu 2...';
    }
    // tambah menu lainnya...
};
```

### Ubah deteksi hot lead

Cari `hotKeywords` dan tambahkan kata kunci yang relevan:

```javascript
const hotKeywords = ['mau daftar', 'mau beli', 'tertarik', 'berapa harganya'];
```

---

## 🎮 Perintah Kontrol Bot

Kirim perintah ini ke **nomor kamu sendiri** (chat dengan diri sendiri di WhatsApp):

| Perintah | Fungsi |
|----------|--------|
| `!on` | Aktifkan bot |
| `!off` | Matikan bot (kamu yang balas manual) |
| `!status` | Cek status bot aktif/nonaktif |
| `!reset` | Reset semua riwayat chat |
| `!help` | Tampilkan daftar perintah |

---

## 🖥️ Deploy dengan PM2 (Agar Bot Jalan Terus)
 
### Install PM2
 
```bash
npm install -g pm2
```
 
### Jalankan bot dengan PM2
 
```bash
pm2 start index.js --name wabot
pm2 save
```
 
### Perintah PM2 yang berguna
 
```bash
pm2 list              # Lihat status bot
pm2 logs wabot        # Lihat logs & QR Code
pm2 restart wabot     # Restart bot
pm2 stop wabot        # Stop bot
pm2 delete wabot      # Hapus bot dari PM2
```
 
### Auto start saat Windows restart
 
Buat file `start-bot.bat`:
 
```bat
@echo off
pm2 resurrect
```

Buat file `start-bot.vbs`:
 
```bat
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /k D:\YOUR_LOCATION\start-bot.bat", 1, False
```
 
Letakkan shortcut file start-bot.vbs ini di:
 
```
C:\Users\[username]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
```
 
---

## 📊 Limit Groq Gratis

| Model | Request/menit | Token/hari |
|-------|--------------|------------|
| llama-3.1-8b-instant | 30 | 500.000 |
| llama-3.3-70b-versatile | 30 | 100.000 |

Dengan penggunaan ~300 token/pesan, kamu bisa handle **±1.600 pesan/hari secara gratis!**

---

## ❓ FAQ

**Q: Apakah nomor WhatsApp bisa kena banned?**
A: Risiko ada tapi kecil selama tidak dipakai untuk spam. Bot ini dirancang untuk CS, bukan blast pesan massal.

**Q: Apakah perlu bayar?**
A: Groq API gratis dengan limit harian yang cukup besar. Tidak perlu kartu kredit.

**Q: Bisa dipakai untuk bisnis apa saja?**
A: Bisa! Tinggal ubah `SYSTEM_PROMPT` dan `handleMenu` sesuai bisnis kamu.

**Q: Bagaimana kalau QR expired?**
A: Jalankan ulang `node index.js` atau `pm2 restart wabot`, scan QR baru.

---

## 📱 Kontak & Support

- Instagram: [@yusrilasrul_](https://www.instagram.com/yusrilasrul_/)
- YouTube: [Tutorial Lengkap](https://youtube.com/link-kamu)
---

## 📄 Lisensi

Template ini untuk penggunaan pribadi dan komersial.

© 2026 Yusril
