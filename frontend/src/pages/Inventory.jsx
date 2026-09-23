import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, FileDown, Plus } from "lucide-react";
import jsPDF from "jspdf";
import { api, errMsg } from "../lib/api";
import { fmtRp, today, openWA } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { PageHeader, Bento, Field, Select } from "../components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const packs = (m) => (m.stock / m.pack_qty).toFixed(2);

export default function Inventory() {
  const { t } = useT();
  const [mats, setMats] = useState([]);
  const [menus, setMenus] = useState([]);
  const [tx, setTx] = useState([]);
  const [tab, setTab] = useState("stock");
  const [form, setForm] = useState({ material_id: "", type: "in", qty: "", note: "", date: today() });
  const [newMat, setNewMat] = useState(null);

  const load = () => Promise.all([api.get("/materials"), api.get("/menus"), api.get("/inventory/tx")]).then(([a, b, c]) => { setMats(a.data); setMenus(b.data); setTx(c.data); });
  useEffect(() => { load(); }, []);

  const submitTx = async (e) => {
    e.preventDefault();
    try { await api.post("/inventory/tx", { ...form, qty: Number(form.qty) }); toast.success("Inventory updated"); setForm({ ...form, qty: "", note: "" }); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  const saveMat = async (e) => {
    e.preventDefault();
    try { await api.post("/materials", { ...newMat, pack_qty: Number(newMat.pack_qty), pack_price: Number(newMat.pack_price) }); toast.success("Material created"); setNewMat(null); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };

  const low = mats.filter((m) => m.stock <= m.min_stock);
  const stockText = () => `*SI FOUR AM — STOCK REPORT*\n📅 ${today()}\n----------------------------------\n` +
    mats.map((m) => `${m.stock <= m.min_stock ? "⚠️" : "✅"} ${m.name}: ${Math.round(m.stock)} ${m.unit} (${packs(m)} ${m.pack_label})`).join("\n");
  const orderText = () => `*SI FOUR AM — ORDER ITEMS*\n📅 ${today()}\n----------------------------------\n` +
    (low.length ? low.map((m) => `🛒 ${m.name}: ${Math.max(1, Math.ceil((m.pack_qty * 2 - m.stock) / m.pack_qty))} ${m.pack_label} @ ${fmtRp(m.pack_price)}`).join("\n") : "All items sufficient ✅") +
    `\n----------------------------------\n💰 Est. total: ${fmtRp(low.reduce((s, m) => s + Math.max(1, Math.ceil((m.pack_qty * 2 - m.stock) / m.pack_qty)) * m.pack_price, 0))}`;

  const pdf = (title, rows) => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(`SI FOUR AM — ${title}`, 14, 18); doc.setFontSize(10); doc.text(today(), 14, 25);
    let y = 35; rows.forEach((r) => { doc.text(r, 14, y); y += 7; if (y > 280) { doc.addPage(); y = 20; } });
    doc.save(`si4am-${title.toLowerCase().replace(/\s/g, "-")}.pdf`);
  };

  return (
    <div data-testid="inventory-page">
      <PageHeader eyebrow="Bar Team" title={t("inventory")}>
        <button data-testid="wa-stock-button" onClick={() => { pdf("Stock Report", mats.map((m) => `${m.name}: ${Math.round(m.stock)} ${m.unit} (${packs(m)} ${m.pack_label})`)); openWA(stockText()); }} className="btn-wa h-10"><MessageCircle className="w-4 h-4" />Stock</button>
        <button data-testid="wa-order-button" onClick={() => { pdf("Order Items", low.map((m) => `${m.name}: order ${Math.max(1, Math.ceil((m.pack_qty * 2 - m.stock) / m.pack_qty))} ${m.pack_label}`)); openWA(orderText()); }} className="btn-wa h-10"><FileDown className="w-4 h-4" />Order Items</button>
      </PageHeader>

      <div className="flex gap-2 mb-6">{["stock", "recipes", "history"].map((k) => <button key={k} data-testid={`inv-tab-${k}`} onClick={() => setTab(k)} className={`h-9 px-4 rounded-full text-xs font-semibold capitalize ${tab === k ? "bg-primary text-white" : "bg-muted"}`}>{k}</button>)}</div>

      {tab === "stock" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Bento gold className="lg:col-span-1 fade-up" testId="inventory-tx-form">
            <p className="eyebrow mb-4">Receive / Use / Stock Opname</p>
            <form onSubmit={submitTx} className="space-y-3">
              <Field label="Material"><Select testId="tx-material-select" value={form.material_id} onChange={(v) => setForm({ ...form, material_id: v })} placeholder="Select material" options={mats.map((m) => ({ value: m.id, label: `${m.name} (${m.unit})` }))} /></Field>
              <Field label="Type"><Select testId="tx-type-select" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={[{ value: "in", label: "IN — Receiving" }, { value: "out", label: "OUT — Usage" }, { value: "opname", label: "OPNAME — Set actual" }]} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Qty (${mats.find((m) => m.id === form.material_id)?.unit || "unit"})`}><input data-testid="tx-qty-input" type="number" step="any" className="field" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} required /></Field>
                <Field label={t("date")}><input data-testid="tx-date-input" type="date" className="field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
              </div>
              <Field label="Note"><input data-testid="tx-note-input" className="field" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
              <button data-testid="tx-submit-button" className="btn-primary w-full" disabled={!form.material_id}>{t("save")}</button>
            </form>
            <button data-testid="new-material-button" onClick={() => setNewMat({ name: "", unit: "g", pack_qty: "", pack_price: "", pack_label: "pack", category: "raw" })} className="btn-ghost w-full mt-3"><Plus className="w-4 h-4" />New material</button>
          </Bento>
          <Bento className="lg:col-span-2 fade-up overflow-x-auto" testId="inventory-table">
            <p className="eyebrow mb-4">Remaining Inventory</p>
            <table className="table-x"><thead><tr><th>Material</th><th>Stock</th><th>Packs</th><th>Pack</th><th>Status</th></tr></thead>
              <tbody>{mats.map((m) => (
                <tr key={m.id} data-testid={`material-row-${m.id}`}><td className="font-semibold">{m.name}<span className="block text-[10px] text-muted-foreground uppercase">{m.category}</span></td>
                  <td className="num">{Math.round(m.stock).toLocaleString()} {m.unit}</td><td className="num">{packs(m)} {m.pack_label}</td>
                  <td className="num text-muted-foreground">{m.pack_qty.toLocaleString()} {m.unit} · {fmtRp(m.pack_price)}</td>
                  <td>{m.stock <= m.min_stock ? <span className="text-xs font-semibold text-red-500">{t("lowStock")}</span> : <span className="text-xs text-emerald-500">OK</span>}</td></tr>))}</tbody></table>
          </Bento>
        </div>
      )}

      {tab === "recipes" && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {menus.map((m) => (
            <Bento key={m.id} className="fade-up" testId={`recipe-card-${m.id}`}>
              <div className="flex justify-between items-start mb-3"><div><p className="font-heading font-bold">{m.name}</p><p className="text-xs text-muted-foreground">Sell {fmtRp(m.price)}</p></div>
                <div className="text-right"><p className="eyebrow">HPP</p><p className="num font-bold text-primary">{fmtRp(m.cost)}</p><p className="text-[10px] text-emerald-500 num">margin {fmtRp(m.margin)}</p></div></div>
              <ul className="text-xs space-y-1">{m.recipe.map((r, i) => <li key={i} className="flex justify-between"><span>{r.name}</span><span className="num text-muted-foreground">{r.qty} {r.unit}</span></li>)}
                <li className="flex justify-between text-muted-foreground pt-1 border-t border-border/50"><span>+ packaging (cup, seal, lid, straw, bag)</span></li></ul>
            </Bento>))}
        </div>
      )}

      {tab === "history" && (
        <Bento className="overflow-x-auto" testId="inventory-history">
          <table className="table-x"><thead><tr><th>Date</th><th>Material</th><th>Type</th><th>Qty</th><th>After</th><th>Cost</th><th>Note</th><th>By</th></tr></thead>
            <tbody>{tx.map((x) => <tr key={x.id}><td className="num">{x.date}</td><td>{x.material_name}</td><td><span className={`text-xs font-bold uppercase ${x.type === "in" ? "text-emerald-500" : x.type === "out" ? "text-red-500" : "text-amber-500"}`}>{x.type}</span></td>
              <td className="num">{x.qty} {x.unit}</td><td className="num">{Math.round(x.after)}</td><td className="num">{x.cost ? fmtRp(x.cost) : "-"}</td><td className="text-muted-foreground text-xs">{x.note}</td><td className="text-xs">{x.user}</td></tr>)}</tbody></table>
        </Bento>
      )}

      <Dialog open={!!newMat} onOpenChange={(o) => !o && setNewMat(null)}>
        <DialogContent data-testid="new-material-dialog"><DialogHeader><DialogTitle>New Raw Material</DialogTitle></DialogHeader>
          {newMat && <form onSubmit={saveMat} className="space-y-3">
            <Field label="Name"><input data-testid="mat-name-input" className="field" value={newMat.name} onChange={(e) => setNewMat({ ...newMat, name: e.target.value })} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit"><Select value={newMat.unit} onChange={(v) => setNewMat({ ...newMat, unit: v })} options={["g", "ml", "pcs"]} /></Field>
              <Field label="Category"><Select value={newMat.category} onChange={(v) => setNewMat({ ...newMat, category: v })} options={["raw", "packaging"]} /></Field>
              <Field label="Qty per pack"><input data-testid="mat-packqty-input" type="number" className="field" value={newMat.pack_qty} onChange={(e) => setNewMat({ ...newMat, pack_qty: e.target.value })} required /></Field>
              <Field label="Pack price (Rp)"><input data-testid="mat-price-input" type="number" className="field" value={newMat.pack_price} onChange={(e) => setNewMat({ ...newMat, pack_price: e.target.value })} required /></Field>
              <Field label="Pack label"><input className="field" value={newMat.pack_label} onChange={(e) => setNewMat({ ...newMat, pack_label: e.target.value })} /></Field>
            </div>
            <button data-testid="mat-save-button" className="btn-primary w-full">{t("save")}</button></form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
