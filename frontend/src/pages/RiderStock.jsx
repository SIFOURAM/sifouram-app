import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { today, shareReceipt, fmtDate } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento, Field, Select, QtySelect, PhotoCapture, Empty } from "../components/common";

export default function RiderStock() {
  const { t } = useT();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [riders, setRiders] = useState([]);
  const [menus, setMenus] = useState([]);
  const [riderId, setRiderId] = useState("");
  const [date, setDate] = useState(today());
  const [items, setItems] = useState({});
  const [photo, setPhoto] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { api.get("/users", { params: { role: "rider" } }).then((r) => setRiders(r.data)); api.get("/menus").then((r) => setMenus(r.data)); }, []);
  useEffect(() => {
    if (!riderId) return;
    api.get("/rider-stock", { params: { rider_id: riderId, date } }).then((r) => { setItems(r.data?.items || {}); setPhoto(r.data?.photo || null); });
    api.get("/rider-stock/history", { params: { rider_id: riderId, start: "2000-01-01", end: "2100-01-01" } }).then((r) => setHistory(r.data));
  }, [riderId, date]);

  const total = Object.values(items).reduce((a, b) => a + b, 0);
  const rider = riders.find((r) => r.id === riderId);

  const save = async () => {
    if (!photo) return toast.error(t("photoRequired"));
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post("/rider-stock", { rider_id: riderId, date, items, photo });
      toast.success(t("save") + " ✓");
      let m = `*SI FOUR AM STOCK REPORT*\n--------------------------------------\n👤 Crew Name: ${rider.name}\n👥 PIC: ${data.pic_name}\n📅 Report Date: ${fmtDate(date)} (${data.time} WIB)\n--------------------------------------\n\n*STOCK DETAILS:*\n`;
      menus.forEach((mn) => { m += `- ${mn.name}: ${items[mn.id] || 0}\n`; });
      m += `\n--------------------------------------\n📊 GRAND TOTAL: ${data.total} Cups\n--------------------------------------\n_(Photo evidence has been uploaded to the system)_\n\n🔥 Keep up the sales! 🚀☕`;
      await shareReceipt(null, m, `stock-${rider.name}-${date}.jpg`, rider.whatsapp);
      api.get("/rider-stock/history", { params: { rider_id: riderId, start: "2000-01-01", end: "2100-01-01" } }).then((r) => setHistory(r.data));
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div data-testid="rider-stock-page">
      <PageHeader eyebrow="Bar Team" title={t("riderStock")} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Bento gold className="lg:col-span-2 fade-up" testId="rider-stock-form">
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <Field label={`${t("pic")} (auto)`}><input data-testid="rider-stock-pic" className="field bg-muted/50" value={user.name} readOnly /></Field>
            <Field label={t("selectRider")}><Select testId="rider-stock-rider-select" value={riderId} onChange={setRiderId} placeholder="—" options={riders.map((r) => ({ value: r.id, label: r.name }))} /></Field>
            <Field label={t("date")}><input data-testid="rider-stock-date-input" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <table className="table-x"><thead><tr><th>#</th><th>Menu</th><th className="text-right">{t("qty")}</th></tr></thead>
            <tbody>{menus.map((m) => (
              <tr key={m.id}><td className="num text-muted-foreground">{m.order}</td><td className="font-semibold">{m.name}<span className="block text-[10px] text-muted-foreground">central stock {m.stock}</span></td>
                <td className="text-right"><QtySelect testId={`rider-stock-qty-${m.id}`} max={m.max_stock} value={items[m.id] || 0} onChange={(v) => setItems({ ...items, [m.id]: v })} /></td></tr>))}</tbody>
            <tfoot><tr><td /><td className="font-bold">{t("total")}</td><td data-testid="rider-stock-total" className="text-right font-bold num text-xl text-primary">{total}</td></tr></tfoot></table>
        </Bento>
        <div className="space-y-6">
          <Bento className="fade-up" testId="rider-stock-photo-card">
            <p className="eyebrow mb-3">{t("photoEvidence")} *</p>
            <PhotoCapture value={photo} onChange={setPhoto} testId="rider-stock-photo" />
            <button data-testid="rider-stock-save-button" onClick={save} disabled={!riderId || !photo || busy} className="btn-primary w-full mt-4">{t("saveRider")}</button>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">{photo ? "✓" : "!"} {t("photoRequired")} · WhatsApp</p>
          </Bento>
          <Bento className="fade-up" testId="rider-stock-history">
            <p className="eyebrow mb-3">{t("history")}</p>
            {history.slice(0, 8).map((h) => <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border/50 text-sm">
              {h.photo ? <img src={h.photo} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted" />}
              <span className="flex-1">{fmtDate(h.date)} <span className="text-xs text-muted-foreground">{h.time || ""} · {h.pic_name || h.created_by}</span></span><span className="num font-bold">{h.total} cups</span></div>)}
            {!history.length && <Empty text={t("noData")} />}
          </Bento>
        </div>
      </div>
    </div>
  );
}
