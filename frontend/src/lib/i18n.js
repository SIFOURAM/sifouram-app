import { createContext, useContext, useState } from "react";

const en = {
  dashboard: "Main Dashboard", inventory: "Inventory", menuStock: "Menu Stock", pos: "POS Cashier", riderStock: "Rider Stock", deposit: "Deposit",
  invoice: "Invoice", riderDash: "Rider Dashboard", handover: "Cash Transfer / Handover", finance: "Financial Report", salary: "Salary & Incentive", profile: "Profile",
  settings: "Settings", more: "More", logout: "Logout", main: "Main", stock: "Stock", today: "Today", yesterday: "Yesterday", week: "This Week", month: "This Month",
  prevmonth: "Previous Month", custom: "Custom", cupsSold: "Cups Sold", cashRevenue: "Cash Revenue", qrisRevenue: "QRIS Revenue", expenses: "Expenses",
  save: "Save", cancel: "Cancel", sendWA: "Send to WhatsApp", download: "Download", login: "Sign In", username: "Username or Email", password: "Password",
  remember: "Remember me on this device", pin: "PIN", enterPin: "Enter your PIN to open the cashier", selectRider: "Select Rider", allRiders: "All Riders",
  date: "Date", time: "Time", total: "Total", remaining: "Remaining", price: "Price", qty: "Qty", saveRider: "Save Rider Data", welcome: "Welcome back",
  darkMode: "Dark Mode", lightMode: "Light Mode", language: "Language", notifications: "Notifications", gps: "GPS (Rider only)", whileUsing: "Allow While Using the App",
  lowStock: "Low stock", checkIn: "Check In", checkOut: "Check Out", endDay: "End Today's Sales", history: "Sales History", customer: "Customer",
  cashReceived: "Cash Received", change: "Change", checkout: "Pay", receipt: "Receipt", newDeposit: "New Deposit", incentive: "Incentive",
  attendance: "Days Attended", gross: "Gross Revenue", placement: "Placement", joined: "Joined", nextTier: "Next Tier", bestSelling: "Best-Selling Products",
  activeRiders: "Riders on Duty", income: "Money In", outgo: "Money Out", balance: "Balance", addExpense: "Add Expense", noData: "No data for this period", category: "Category",
  rider: "Rider", pic: "PIC", menu: "Menu", wastage: "Wastage", sold: "Sold", diff: "Diff", minus: "Minus", cash: "Cash", qris: "QRIS", totalIncome: "Total Income",
  totalSold: "Total Sold", newDebt: "New Debt", initialDebt: "Initial Debt", remainingDebt: "Remaining Debt", debtPayment: "Debt Payment", netCash: "Net Cash Deposit",
  commission: "Rider Commission", saveDb: "Save to Database", photoEvidence: "Photo Evidence", photoRequired: "Photo evidence is required", takePhoto: "Take Photo",
  stockReport: "Stock Report", orderItems: "Order Items", material: "Material", type: "Type", note: "Note", status: "Status", recipes: "Recipes", production: "Production",
  bundling: "Bundling", cups: "cups", paid: "PAID", unpaid: "UNPAID", downPayment: "Down Payment", remainingPayment: "Remaining Payment", createInvoice: "Create Invoice",
  dailyAllowance: "Daily Attendance", withdraw: "Withdraw", withdrawals: "Withdrawal History", method: "Method", bank: "Bank", amount: "Amount", available: "Available",
  totalCups: "Total Cups Sold", dailySales: "Daily Sales", exportPdf: "Export PDF", print: "Print", excel: "Excel", expectedCash: "Cash That Should Be Received",
  receivedCash: "Total Cash Received", difference: "Difference", addLine: "Add line", giver: "Giving PIC (Bar Team)", receiver: "Receiving PIC", handoverDate: "Handover Date",
  period: "Period", details: "Details", close: "Close", resend: "Resend", closed: "Sales closed", eodDone: "Today's sales have been closed", depositDone: "Deposit already entered — POS locked",
  noStock: "No initial stock set for today. Ask Bar Team / Superadmin to save Rider Stock first.", thankYou: "Thank you!", items: "Items", transactions: "transactions",
  estProfit: "Est. Profit", revenue: "Revenue", customers: "Customers", tapProducts: "Tap products to add them", selectMenus: "Select menus", appsScript: "Google Apps Script URL",
  permissions: "Permissions", appearance: "Appearance & language", motivation: "Keep up the sales!",
};
const id = {
  dashboard: "Dasbor Utama", inventory: "Inventaris", menuStock: "Stok Menu", pos: "Kasir POS", riderStock: "Stok Rider", deposit: "Setoran",
  invoice: "Invoice", riderDash: "Dasbor Rider", handover: "Transfer / Serah Terima Kas", finance: "Laporan Keuangan", salary: "Gaji & Insentif", profile: "Profil",
  settings: "Pengaturan", more: "Lainnya", logout: "Keluar", main: "Utama", stock: "Stok", today: "Hari Ini", yesterday: "Kemarin", week: "Minggu Ini", month: "Bulan Ini",
  prevmonth: "Bulan Lalu", custom: "Manual", cupsSold: "Cup Terjual", cashRevenue: "Pendapatan Cash", qrisRevenue: "Pendapatan QRIS", expenses: "Pengeluaran",
  save: "Simpan", cancel: "Batal", sendWA: "Kirim ke WhatsApp", download: "Unduh", login: "Masuk", username: "Username atau Email", password: "Kata Sandi",
  remember: "Ingat saya di perangkat ini", pin: "PIN", enterPin: "Masukkan PIN untuk membuka kasir", selectRider: "Pilih Rider", allRiders: "Semua Rider",
  date: "Tanggal", time: "Waktu", total: "Total", remaining: "Sisa", price: "Harga", qty: "Jml", saveRider: "Simpan Data Rider", welcome: "Selamat datang kembali",
  darkMode: "Mode Gelap", lightMode: "Mode Terang", language: "Bahasa", notifications: "Notifikasi", gps: "GPS (Rider saja)", whileUsing: "Izinkan Saat Aplikasi Digunakan",
  lowStock: "Stok menipis", checkIn: "Absen Masuk", checkOut: "Absen Pulang", endDay: "Tutup Penjualan Hari Ini", history: "Riwayat Penjualan", customer: "Pelanggan",
  cashReceived: "Uang Diterima", change: "Kembalian", checkout: "Bayar", receipt: "Struk", newDeposit: "Setoran Baru", incentive: "Insentif",
  attendance: "Hari Hadir", gross: "Pendapatan Kotor", placement: "Lokasi", joined: "Bergabung", nextTier: "Kategori Berikutnya", bestSelling: "Produk Terlaris",
  activeRiders: "Rider Bertugas", income: "Uang Masuk", outgo: "Uang Keluar", balance: "Saldo", addExpense: "Tambah Pengeluaran", noData: "Tidak ada data untuk periode ini", category: "Kategori",
  rider: "Rider", pic: "PIC", menu: "Menu", wastage: "Wastage", sold: "Terjual", diff: "Selisih", minus: "Minus", cash: "Cash", qris: "QRIS", totalIncome: "Total Pendapatan",
  totalSold: "Total Terjual", newDebt: "Hutang Baru", initialDebt: "Hutang Awal", remainingDebt: "Sisa Hutang", debtPayment: "Bayar Hutang", netCash: "Setoran Bersih",
  commission: "Komisi Rider", saveDb: "Simpan ke Database", photoEvidence: "Bukti Foto", photoRequired: "Bukti foto wajib diambil", takePhoto: "Ambil Foto",
  stockReport: "Laporan Stok", orderItems: "Pesanan Barang", material: "Bahan Baku", type: "Tipe", note: "Catatan", status: "Status", recipes: "Resep", production: "Produksi",
  bundling: "Bundling", cups: "cup", paid: "LUNAS", unpaid: "BELUM LUNAS", downPayment: "Uang Muka / DP", remainingPayment: "Sisa Pembayaran", createInvoice: "Buat Invoice",
  dailyAllowance: "Uang Harian", withdraw: "Tarik", withdrawals: "Riwayat Penarikan", method: "Metode", bank: "Rekening Bank", amount: "Jumlah", available: "Tersedia",
  totalCups: "Total Cup Terjual", dailySales: "Penjualan Harian", exportPdf: "Ekspor PDF", print: "Cetak", excel: "Excel", expectedCash: "Kas yang Seharusnya Diterima",
  receivedCash: "Total Kas Diterima", difference: "Selisih", addLine: "Tambah baris", giver: "PIC Pemberi (Bar Team)", receiver: "PIC Penerima", handoverDate: "Tanggal Serah Terima",
  period: "Periode", details: "Detail", close: "Tutup", resend: "Kirim Ulang", closed: "Penjualan ditutup", eodDone: "Penjualan hari ini sudah ditutup", depositDone: "Setoran sudah diinput — POS terkunci",
  noStock: "Belum ada stok awal hari ini. Minta Bar Team / Superadmin menyimpan Stok Rider dulu.", thankYou: "Terima kasih!", items: "Item", transactions: "transaksi",
  estProfit: "Est. Laba", revenue: "Pendapatan", customers: "Pelanggan", tapProducts: "Ketuk produk untuk menambahkan", selectMenus: "Pilih menu", appsScript: "URL Google Apps Script",
  permissions: "Hak Akses", appearance: "Tampilan & bahasa", motivation: "Semangat jualannya!",
};
const dict = { en, id };

const LangCtx = createContext({ lang: "id", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(localStorage.getItem("si4am_lang") || "id");
  const setLang = (l) => { localStorage.setItem("si4am_lang", l); setLangState(l); };
  const t = (k) => dict[lang]?.[k] ?? en[k] ?? k;
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);
