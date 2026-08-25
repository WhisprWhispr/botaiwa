<div align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp" />
  <img src="https://img.shields.io/badge/AI-Gemini%20%7C%20Groq-8A2BE2?style=for-the-badge" alt="AI" />
  <br/>
  <h1>🤖 WhatsApp AI Bot Agency</h1>
  <p><strong>Platform Bot WhatsApp Cerdas Berbasis AI dengan Dukungan Multi-Tenant Dashboard</strong></p>
</div>

---

## 🌟 Tentang Proyek

**WhatsApp AI Bot Agency** adalah solusi bot WhatsApp cerdas yang ditenagai oleh **Groq AI** dan **Google Gemini**. Dirancang khusus untuk kebutuhan *Customer Service* (CS) modern, bot ini mampu merespons pesan secara natural, mengingat konteks percakapan, dan memiliki sistem *handover* otomatis ke agen manusia.

Dilengkapi dengan **Web Dashboard Multi-Tenant**, Anda dapat mengelola banyak sesi WhatsApp sekaligus dalam satu tempat dengan mudah dan efisien secara visual!

## ✨ Fitur Unggulan

- 🌐 **Web Dashboard Multi-Tenant**: Kelola banyak nomor/sesi WhatsApp sekaligus melalui antarmuka web yang modern.
- 🧠 **Smart AI Integration**: Terintegrasi penuh dengan Groq AI (Llama 3) dan Google Gemini untuk balasan otomatis yang cerdas.
- 💬 **Context-Aware Memory**: AI mampu mengingat riwayat percakapan per-pengguna secara dinamis.
- 🔘 **Menu Interaktif**: Opsi fallback menu angka (1-6) yang merespons secara instan tanpa mengkonsumsi limit token AI.
- 🔥 **Hot Lead Detection**: Deteksi otomatis kata kunci spesifik (misal: "mau beli", "daftar") untuk respons prioritas langsung.
- 👨‍💻 **Seamless CS Handover**: Pengguna dapat meminta bantuan CS manusia, AI akan berhenti membalas dan memberikan notifikasi ke Admin.
- 🛡️ **Anti-Spam & Limit Harian**: Perlindungan canggih dari *spammer* dengan *cooldown timer* dan batasan pesan harian.
- 🖼️ **Media Handling**: Mendeteksi kiriman gambar/dokumen dan merespons dengan penanganan khusus.

## 🛠️ Persyaratan Sistem

- **Node.js** (Versi 18.x atau lebih baru)
- RAM minimal 1GB (Disarankan 2GB+ untuk penggunaan banyak sesi secara bersamaan).
- Google Chrome atau Chromium (dibutuhkan untuk Puppeteer internal).
- Akun [Groq Cloud](https://console.groq.com) atau [Google AI Studio](https://aistudio.google.com) untuk mendapatkan API Key secara gratis.

## 🚀 Panduan Instalasi (Quick Start)

### 1. Instalasi Repositori
```bash
git clone https://github.com/WhisprWhispr/botaiwa.git
cd whatsapp-ai-bot
npm install
```

### 2. Konfigurasi Lingkungan (*Environment*)
Salin file konfigurasi contoh dan sesuaikan dengan kredensial Anda:
```bash
cp .env.example .env
```
Buka file `.env` dan lengkapi data berikut:
```env
GROQ_API_KEY=api_key_groq_anda
GEMINI_API_KEY=api_key_gemini_anda
AI_PROVIDER=gemini # Pilih salah satu: 'groq' atau 'gemini'
ADMIN_ID=628xxxxxxxxxx # Nomor WhatsApp Admin untuk menerima notifikasi
```

### 3. Menjalankan Aplikasi
```bash
npm run start
```
Sistem akan mulai berjalan secara lokal dan menyediakan *dashboard* pemantauan pada tautan **`http://localhost:3000`**.

### 4. Menyambungkan Klien WhatsApp
1. Buka browser dan arahkan ke `http://localhost:3000`.
2. Klik tombol **"Add New Client"** dan berikan ID sesi yang unik (contoh: `cs-pusat`).
3. Tunggu sistem melakukan *generate*, hingga **QR Code** muncul.
4. Buka aplikasi WhatsApp Anda > Pergi ke **Perangkat Taut** > **Tautkan Perangkat**, lalu pindai QR Code tersebut.
5. Selesai! Bot WhatsApp AI Anda sudah mengudara!

## 🎮 Perintah Bot (Admin)

Gunakan perintah (*command*) berikut dengan mengirim pesan dari nomor Admin Anda langsung ke nomor bot:

| Perintah | Deskripsi Fungsi |
| :--- | :--- |
| `!on` | Mengaktifkan kembali respons otomatis AI |
| `!off` | Mematikan bot (Beralih ke mode balasan manual) |
| `!status` | Cek status aktif/non-aktif bot saat ini |
| `!reset` | Membersihkan seluruh memori dan riwayat percakapan |
| `!selesai [nomor]`| Menutup sesi *handover* CS untuk nomor pelanggan terkait |

## ⚙️ Panduan Deployment (Produksi)

Untuk penggunaan di lingkungan *server* (VPS) secara non-stop (24/7), kami sangat merekomendasikan penggunaan **PM2 Process Manager**.

```bash
# Instalasi PM2 secara global
npm install -g pm2

# Menjalankan bot dengan PM2
pm2 start index.js --name "bot-ai-wabot"

# Menyimpan konfigurasi agar otomatis berjalan saat server restart
pm2 save
pm2 startup
```

---

## ⚖️ Hak Cipta dan Lisensi

**Copyright © 2026 SukaCoding & Yusril. All rights reserved.**

Perangkat lunak ini dilisensikan di bawah **MIT License**.
Anda diberikan kebebasan penuh untuk menggunakan, menyalin, memodifikasi, menggabungkan, menerbitkan, dan mendistribusikan salinan perangkat lunak ini untuk keperluan pribadi maupun komersial, dengan syarat **selalu mencantumkan pemberitahuan hak cipta asli dan salinan lisensi** pada setiap rilis yang didistribusikan.

_Perangkat lunak ini disediakan "APA ADANYA", tanpa jaminan bentuk apapun._

---
<div align="center">
  Didesain dan dikembangkan dengan ❤️ oleh <a href="https://www.instagram.com/yusrilasrul_/">@yusrilasrul_</a> dan Tim <strong>SukaCoding</strong>.
</div>
