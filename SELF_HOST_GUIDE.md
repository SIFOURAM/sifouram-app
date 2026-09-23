# SI FOUR AM — Panduan Menjalankan di Domain / Server Sendiri

Aplikasi ini adalah full-stack:
- **Frontend:** React (folder `frontend/`)
- **Backend:** FastAPI / Python (folder `backend/`)
- **Database:** MongoDB

Isi arsip ini SUDAH lengkap kecuali `node_modules` dan data database (harus di-install ulang / di-import).

---

## 1. Prasyarat Server
- Node.js 18+ dan Yarn
- Python 3.10+
- MongoDB (lokal atau MongoDB Atlas gratis)

## 2. Setup Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Buat / edit file `backend/.env`:
```
MONGO_URL=mongodb://localhost:27017      # atau connection string MongoDB Atlas Anda
DB_NAME=si_four_am
CORS_ORIGINS=https://domain-anda.com
EMERGENT_LLM_KEY=...                      # untuk fitur AI Coach (opsional)
```

Seed database awal (membuat 12 akun default):
```bash
python seed.py
```

Jalankan backend (production):
```bash
uvicorn server:app --host 0.0.0.0 --port 8001
```
> Rekomendasi production: pakai `gunicorn -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001`

## 3. Setup Frontend (React)
```bash
cd frontend
yarn install
```

Edit `frontend/.env`:
```
REACT_APP_BACKEND_URL=https://domain-anda.com
```
> PENTING: semua request API frontend memakai `REACT_APP_BACKEND_URL` + prefix `/api`.
> Backend harus bisa diakses di URL yang sama dengan path `/api/*`.

Build untuk production:
```bash
yarn build
```
Hasil build ada di folder `frontend/build/` — serve dengan nginx / Apache / serve.

## 4. Routing (nginx contoh)
```nginx
server {
    listen 443 ssl;
    server_name domain-anda.com;

    # SSL cert (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/domain-anda.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain-anda.com/privkey.pem;

    # API -> backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    # Frontend build statis
    location / {
        root /var/www/si-four-am/frontend/build;
        try_files $uri /index.html;
    }
}
```

## 5. SSL Gratis (Let's Encrypt)
```bash
sudo certbot --nginx -d domain-anda.com -d www.domain-anda.com
```

## 6. Akun Login Default (setelah seed.py)
- **Superadmin:** baazulfikar@gmail.com / Nai130994 (PIN: 130994)
- **Bar Team:** alif (PIN: 090926)
- **Rider:** fikar (PIN: 211122)
> Segera ganti password & PIN ini setelah login pertama.

## 7. Catatan Integrasi
- **AI Coach** butuh `EMERGENT_LLM_KEY` (dari Emergent) — jika tidak diisi, fitur AI Coach saja yang nonaktif, sisanya tetap jalan.
- **Google Apps Script** (`google-apps-script/Code.gs`) di-deploy manual di Google Apps Script, lalu masukkan URL-nya di menu Settings aplikasi.
- **Object Storage / upload foto**: pada Emergent memakai Emergent Object Storage. Untuk self-host, Anda perlu menyediakan penyimpanan sendiri (folder lokal / S3) — cek endpoint `/api/files/*` di `backend/server.py`.
- **Peta / POI GPS** memakai OpenStreetMap Overpass API (gratis, tanpa API key).

## 8. Import Data Lama (opsional)
Jika Anda sudah punya data di Emergent, export tiap collection (CSV) dari Manage Publishes → Database, lalu import ke MongoDB Anda:
```bash
mongoimport --db si_four_am --collection users --type csv --headerline --file users.csv
```
