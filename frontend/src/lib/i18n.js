import { createContext, useContext, useState } from "react";

const dict = {
  en: {
    dashboard: "Main Dashboard", inventory: "Inventory", menuStock: "Menu Stock", pos: "Cashier / POS", riderStock: "Rider Stock", deposit: "Deposit",
    invoice: "Invoice", riderDash: "Rider Dashboard", handover: "Cash Handover", finance: "Financial Report", salary: "Salary & Incentive", profile: "Profile",
    settings: "Settings", more: "More", logout: "Logout", main: "Main", stock: "Stock", today: "Today", yesterday: "Yesterday", week: "This Week", month: "This Month",
    prevmonth: "Previous Month", custom: "Custom", cupsSold: "Cups Sold", cashRevenue: "Cash Revenue", qrisRevenue: "QRIS Revenue", expenses: "Expenses",
    save: "Save", cancel: "Cancel", sendWA: "Send to WhatsApp", download: "Download", login: "Sign In", username: "Username or Email", password: "Password",
    remember: "Remember me on this device", pin: "PIN", enterPin: "Enter your PIN to open the cashier", selectRider: "Select Rider", allRiders: "All Riders",
    date: "Date", total: "Total", remaining: "Remaining", price: "Price", qty: "Qty", saveRider: "Save Rider Data", welcome: "Welcome back",
    darkMode: "Dark Mode", lightMode: "Light Mode", language: "Language", notifications: "Notifications", gps: "GPS (Rider only)", whileUsing: "Allow While Using the App",
    lowStock: "Low stock", checkIn: "Check In", checkOut: "Check Out", endDay: "End Today's Sales", history: "Sales History", customer: "Customer",
    cashReceived: "Cash Received", change: "Change", checkout: "Checkout", receipt: "Receipt", newDeposit: "New Deposit", incentive: "Incentive",
    attendance: "Days Attended", gross: "Gross Revenue", placement: "Placement", joined: "Joined", nextTier: "Next Tier", bestSelling: "Best-Selling Products",
    activeRiders: "Riders on Duty", income: "Money In", outgo: "Money Out", balance: "Balance", addExpense: "Add Expense", noData: "No data for this period",
  },
  id: {
    dashboard: "Dasbor Utama", inventory: "Inventaris", menuStock: "Stok Menu", pos: "Kasir / POS", riderStock: "Stok Rider", deposit: "Setoran",
    invoice: "Invoice", riderDash: "Dasbor Rider", handover: "Serah Terima Kas", finance: "Laporan Keuangan", salary: "Gaji & Insentif", profile: "Profil",
    settings: "Pengaturan", more: "Lainnya", logout: "Keluar", main: "Utama", stock: "Stok", today: "Hari Ini", yesterday: "Kemarin", week: "Minggu Ini", month: "Bulan Ini",
    prevmonth: "Bulan Lalu", custom: "Manual", cupsSold: "Cup Terjual", cashRevenue: "Pendapatan Cash", qrisRevenue: "Pendapatan QRIS", expenses: "Pengeluaran",
    save: "Simpan", cancel: "Batal", sendWA: "Kirim ke WhatsApp", download: "Unduh", login: "Masuk", username: "Username atau Email", password: "Kata Sandi",
    remember: "Ingat saya di perangkat ini", pin: "PIN", enterPin: "Masukkan PIN untuk membuka kasir", selectRider: "Pilih Rider", allRiders: "Semua Rider",
    date: "Tanggal", total: "Total", remaining: "Sisa", price: "Harga", qty: "Jml", saveRider: "Simpan Data Rider", welcome: "Selamat datang kembali",
    darkMode: "Mode Gelap", lightMode: "Mode Terang", language: "Bahasa", notifications: "Notifikasi", gps: "GPS (Rider saja)", whileUsing: "Izinkan Saat Aplikasi Digunakan",
    lowStock: "Stok menipis", checkIn: "Absen Masuk", checkOut: "Absen Pulang", endDay: "Tutup Penjualan Hari Ini", history: "Riwayat Penjualan", customer: "Pelanggan",
    cashReceived: "Uang Diterima", change: "Kembalian", checkout: "Bayar", receipt: "Struk", newDeposit: "Setoran Baru", incentive: "Insentif",
    attendance: "Hari Hadir", gross: "Pendapatan Kotor", placement: "Penempatan", joined: "Bergabung", nextTier: "Kategori Berikutnya", bestSelling: "Produk Terlaris",
    activeRiders: "Rider Bertugas", income: "Uang Masuk", outgo: "Uang Keluar", balance: "Saldo", addExpense: "Tambah Pengeluaran", noData: "Tidak ada data untuk periode ini",
  },
};

const LangCtx = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(localStorage.getItem("si4am_lang") || "en");
  const setLang = (l) => { localStorage.setItem("si4am_lang", l); setLangState(l); };
  const t = (k) => dict[lang]?.[k] ?? dict.en[k] ?? k;
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useT = () => useContext(LangCtx);
