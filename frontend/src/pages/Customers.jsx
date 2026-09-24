import { useEffect, useState } from "react";
import { Gift, Search, Megaphone, Sparkles, Send, Copy } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { fmtRp, openWA, today } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { PageHeader, Bento, Stat, Empty, Field, Select } from "../components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

export default function Customers() {
  const { t, lang } = useT();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [promoOpen, setPromoOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [riders, setRiders] = useState([]);
  const [riderLoc, setRiderLoc] = useState("");

  useEffect(() => { api.get("/customers").then((r) => setList(r.data)); }, []);
  useEffect(() => { if (promoOpen) api.get("/gps/active", { params: { date: today() } }).then((r) => setRiders(r.data)).catch(() => {}); }, [promoOpen]);

  const rows = list.filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q));
  const withPhone = list.filter((c) => c.phone);

  const voucher = (c) => openWA(lang === "id"
    ? `Halo ${c.name || "Kak"} \u2615\nTerima kasih sudah jadi pelanggan setia *SI FOUR AM*! Kamu punya *${c.points} poin* loyalti.\n\uD83C\uDF81 Tunjukkan pesan ini ke rider kami untuk *voucher potongan Rp ${Math.min(c.points, 10) * 1000}* pada pembelian berikutnya.\nSampai jumpa! \uD83D\uDE80`
    : `Hi ${c.name || "there"} \u2615\nThank you for being a loyal *SI FOUR AM* customer! You have *${c.points} loyalty points*.\n\uD83C\uDF81 Show this message to our rider for a *Rp ${Math.min(c.points, 10) * 1000} voucher* on your next order.\nSee you! \uD83D\uDE80`, c.phone);

  const aiIdea = async () => {
    setAiBusy(true);
    try { const { data } = await api.post("/promo/idea", { theme: "" }); setMsg(data.text); }
    catch (e) { toast.error(errMsg(e)); }
    finally { setAiBusy(false); }
  };

  const finalMsg = () => {
    let m = msg;
    const rd = riders.find((r) => r.rider_id === riderLoc);
    if (rd) m += `\n\n\uD83D\uDCCD Rider kami sekarang ada di sini: https://www.google.com/maps?q=${rd.lat},${rd.lng}\nMampir yuk sebelum kehabisan! \u2615`;
    return m;
  };

  const copyMsg = async () => { try { await navigator.clipboard.writeText(finalMsg()); toast.success("Pesan disalin"); } catch { toast.error("Gagal menyalin"); } };

  const broadcast = () => {
    const base = finalMsg().trim();
    if (!base) return toast.error("Tulis atau buat pesan promo dulu");
    if (!withPhone.length) return toast.error("Belum ada pelanggan dengan nomor WhatsApp");
    withPhone.forEach((c, i) => setTimeout(() => openWA(base.replace(/\{nama\}/g, c.name || "Kak"), c.phone), i * 700));
    toast.success(`Membuka WhatsApp untuk ${withPhone.length} pelanggan\u2026`);
  };

  return (
    <div data-testid="customers-page">
      <PageHeader eyebrow="Loyalty" title={t("customers")}>
        <button data-testid="promo-broadcast-open" onClick={() => setPromoOpen(true)} className="btn-primary h-10"><Megaphone className="w-4 h-4" />Kirim Promosi</button>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" /><input data-testid="customer-search" className="field pl-9 w-56" placeholder="Nama / 08xx" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </PageHeader>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat gold label={t("customers")} value={list.length} testId="cust-count" className="p-4" />
        <Stat label="Poin" value={list.reduce((s, c) => s + (c.points || 0), 0)} testId="cust-points" className="p-4" />
        <Stat label={t("revenue")} value={fmtRp(list.reduce((s, c) => s + (c.total_spent || 0), 0))} testId="cust-spent" className="p-4" />
      </div>
      <Bento testId="customers-table">
        <table className="table-x"><thead><tr><th>{t("customer")}</th><th>Poin</th><th className="hide-xs">Visit</th><th className="hide-sm">{t("total")}</th><th className="hide-sm">{t("date")}</th><th /></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.id || c.phone} data-testid={`customer-row-${c.id}`}><td><p className="font-semibold">{c.name || "\u2014"}</p><p className="text-xs text-muted-foreground num">{c.phone}</p></td><td className="num font-bold text-primary">{c.points || 0}</td><td className="num hide-xs">{c.visits || 0}</td><td className="num hide-sm">{fmtRp(c.total_spent)}</td><td className="num text-xs hide-sm">{c.last_visit}</td>
            <td className="text-right">{c.phone && <button data-testid={`voucher-${c.id}`} onClick={() => voucher(c)} className="btn-wa h-8 px-3 text-xs"><Gift className="w-3 h-3" />Voucher</button>}</td></tr>)}</tbody></table>
        {!rows.length && <Empty text={t("noData")} />}
      </Bento>

      <Dialog open={promoOpen} onOpenChange={(o) => !o && setPromoOpen(false)}>
        <DialogContent data-testid="promo-dialog" className="max-w-lg">
          <DialogHeader><DialogTitle>Kirim Promosi ke Pelanggan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{withPhone.length} pelanggan punya nomor WhatsApp</p>
              <button data-testid="promo-ai-idea" onClick={aiIdea} disabled={aiBusy} className="btn-ghost h-9 text-xs"><Sparkles className="w-3.5 h-3.5" />{aiBusy ? "Membuat\u2026" : "Buatkan ide (AI)"}</button>
            </div>
            <textarea data-testid="promo-message" className="field min-h-[140px] leading-relaxed" placeholder="Tulis pesan promo, atau klik 'Buatkan ide (AI)'. Gunakan {nama} untuk menyapa nama pelanggan." value={msg} onChange={(e) => setMsg(e.target.value)} />
            <Field label="Sertakan lokasi rider (opsional)">
              <Select testId="promo-rider-loc" value={riderLoc} onChange={setRiderLoc} placeholder={riders.length ? "\u2014 tanpa lokasi \u2014" : "Tidak ada rider aktif"} options={riders.map((r) => ({ value: r.rider_id, label: `${r.rider_name} (live)` }))} />
            </Field>
            <p className="text-[11px] text-muted-foreground">Catatan: WhatsApp akan terbuka satu per satu per pelanggan. Jika browser memblokir, izinkan pop-up untuk situs ini.</p>
            <div className="flex gap-2">
              <button data-testid="promo-copy" onClick={copyMsg} className="btn-ghost flex-1 h-10"><Copy className="w-4 h-4" />Salin</button>
              <button data-testid="promo-send-all" onClick={broadcast} className="btn-primary flex-1 h-10"><Send className="w-4 h-4" />Kirim ke Semua ({withPhone.length})</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
