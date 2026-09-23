# SI FOUR AM — Google Sheets + Google Drive (Apps Script) Setup

Data tetap tersimpan di database utama (MongoDB). Apps Script ini menjadi **salinan real-time** ke Google Spreadsheet (data) dan Google Drive (foto): absensi (check-in/out + foto), stok rider (+ foto), penjualan POS, tutup harian, setoran, invoice, serah terima kas, penarikan gaji/insentif, dan transaksi inventaris.

## Langkah deploy (±5 menit)
1. Buka https://script.google.com → **New project**.
2. Hapus isi `Code.gs`, tempel isi file `Code.gs` dari folder ini → **Save** (Ctrl+S).
3. (Opsional) Isi `SPREADSHEET_ID` jika ingin memakai spreadsheet yang sudah ada. Jika kosong, script otomatis membuat spreadsheet **"SI FOUR AM Database"** dan folder Drive **"SI FOUR AM Photos"**.
4. Klik **Deploy → New deployment → ⚙ Select type → Web app**.
   - Description: `SI FOUR AM`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Klik **Deploy** → izinkan akses (Authorize access → pilih akun → Advanced → Go to … (unsafe) → Allow).
6. Salin **Web app URL** (berakhiran `/exec`).
7. Login SI FOUR AM sebagai **Superadmin** → **Pengaturan** → tempel URL di **URL Google Apps Script** → Simpan.
   (Alternatif: tambahkan `GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/.../exec"` di `backend/.env`.)
8. Uji: lakukan absen masuk di Kasir → cek tab `attendance` di spreadsheet dan folder Drive.

## Tab spreadsheet yang dibuat otomatis
`attendance`, `rider_stock`, `sales`, `eod`, `deposits`, `invoices`, `handovers`, `withdrawals`, `inventory`.
Kolom `photo_link` berisi link Google Drive foto. Baris dengan `id` yang sama akan **ditimpa** (tidak duplikat).

## Catatan
- Jika mengubah `Code.gs`, lakukan **Deploy → Manage deployments → Edit → Version: New version → Deploy** agar URL tetap sama.
- Kuota Apps Script gratis: ±20.000 request/hari — cukup untuk operasional harian.
