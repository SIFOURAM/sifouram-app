import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { today, openWA, fmtDate } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { PageHeader, Bento, Field, Select, QtySelect, PhotoCapture, Empty } from "../components/common";

export default function RiderStock() {
  const { t } = useT();
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
    try {
      const { data } = await api.post("/rider-stock", { rider_id: riderId, date, items, photo });
      toast.success("Rider stock saved & menu stock deducted");
      const text = `*SI FOUR AM — RIDER INITIAL STOCK*\n🛵 Rider: ${rider.name}\n📅 ${fmtDate(date)}\n----------------------------------\n` +
        menus.map((m) => `${m.name}: ${items[m.id] || 0}`).join("\n") + `\n----------------------------------\n☕ TOTAL: ${data.total} cups\n📸 Photo evidence: attached (downloaded)`;
      if (photo) { const a = document.createElement("a"); a.href = photo; a.download = `stock-${rider.name}-${date}.jpg`; a.click(); }
      openWA(text, rider.whatsapp);
      api.get("/rider-stock/history", { params: { rider_id: riderId, start: "2000-01-01", end: "2100-01-01" } }).then((r) => setHistory(r.data));
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="rider-stock-page">
      <PageHeader eyebrow="Bar Team" title={t("riderStock")} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Bento gold className="lg:col-span-2 fade-up" testId="rider-stock-form">
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
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
            <p className="eyebrow mb-3">Photo Evidence</p>
            <PhotoCapture value={photo} onChange={setPhoto} testId="rider-stock-photo" />
            <button data-testid="rider-stock-save-button" onClick={save} disabled={!riderId} className="btn-primary w-full mt-4">{t("saveRider")}</button>
            <p className="text-[11px] text-muted-foreground mt-2 text-center">Saves, downloads photo, opens WhatsApp with stock details</p>
          </Bento>
          <Bento className="fade-up" testId="rider-stock-history">
            <p className="eyebrow mb-3">History</p>
            {history.slice(0, 8).map((h) => <div key={h.id} className="flex items-center gap-3 py-2 border-b border-border/50 text-sm">
              {h.photo ? <img src={h.photo} alt="" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-muted" />}
              <span className="flex-1">{fmtDate(h.date)}</span><span className="num font-bold">{h.total} cups</span></div>)}
            {!history.length && <Empty text={t("noData")} />}
          </Bento>
        </div>
      </div>
    </div>
  );
}
