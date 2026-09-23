import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { fmtRp, today, fmtDate } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento, Field, Select, QtySelect, ReceiptModal, RLine, Empty } from "../components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";

const EMPTY = { stock: 0, remaining: 0, cash: 0, qris: 0, wastage: 0 };
const BUNDLES = { 1: { cups: 4, price: 45000 }, 2: { cups: 10, price: 110000 } };
const BKEYS = ["1-cash", "1-qris", "2-cash", "2-qris"];

function BundleDialog({ bkey, menus, value, onSave, onClose }) {
  const { t } = useT();
  const [items, setItems] = useState(value.items || {});
  const [b, method] = bkey.split("-");
  const need = BUNDLES[b].cups * value.qty;
  const sum = Object.values(items).reduce((a, x) => a + x, 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="bundle-dialog"><DialogHeader><DialogTitle>{t("bundling")} {b} · {method.toUpperCase()} × {value.qty} → {need} {t("cups")}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">{t("selectMenus")} (Rp 12.000)</p>
        {menus.filter((m) => m.price === 12000).map((m) => <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-border/40 text-sm"><span>{m.name}</span><QtySelect testId={`bundle-qty-${m.id}`} max={need} value={items[m.id] || 0} onChange={(v) => setItems({ ...items, [m.id]: v })} /></div>)}
        <div className="flex items-center justify-between mt-3"><span className={`num font-bold ${sum === need ? "text-emerald-500" : "text-red-500"}`}>{sum} / {need}</span>
          <button data-testid="bundle-save" disabled={sum !== need} onClick={() => onSave(items)} className="btn-primary h-10">{t("save")}</button></div>
      </DialogContent>
    </Dialog>
  );
}

export default function DepositPage() {
  const { t, lang } = useT();
  const { user } = useAuth();
  const [riders, setRiders] = useState([]);
  const [menus, setMenus] = useState([]);
  const [riderId, setRiderId] = useState("");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState({});
  const [bundles, setBundles] = useState({});
  const [editB, setEditB] = useState(null);
  const [debt, setDebt] = useState(0);
  const [eod, setEod] = useState(null);
  const [extra, setExtra] = useState({ debt_payment: 0, expenses: 0, expense_note: "" });
  const [result, setResult] = useState(null);
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadList = () => api.get("/deposits", { params: { start: "2000-01-01", end: "2100-01-01" } }).then((r) => setList(r.data.slice(0, 20)));
  useEffect(() => { api.get("/users", { params: { role: "rider" } }).then((r) => setRiders(r.data)); api.get("/menus").then((r) => setMenus(r.data)); loadList(); }, []);

  useEffect(() => {
    if (!riderId || !menus.length) return;
    (async () => {
      const [rs, ex, e, d] = await Promise.all([
        api.get("/rider-stock", { params: { rider_id: riderId, date } }), api.get("/deposits", { params: { start: date, end: date, rider_id: riderId } }),
        api.get("/sales/eod", { params: { rider_id: riderId, date } }), api.get("/deposits/debt", { params: { rider_id: riderId, date } })]);
      setEod(e.data); setDebt(d.data.debt);
      const st = rs.data?.items || {}; const prev = ex.data[0]; const next = {}; const nb = {};
      if (prev) {
        menus.forEach((m) => { const r = prev.rows.find((x) => x.menu_id === m.id); next[m.id] = r ? { stock: r.stock, remaining: r.remaining, cash: r.cash_manual ?? r.cash, qris: r.qris_manual ?? r.qris, wastage: r.wastage } : { ...EMPTY, stock: st[m.id] || 0 }; });
        (prev.bundles || []).forEach((b) => { const k = `${b.bundle}-${b.method}`; const ids = {}; Object.entries(b.items).forEach(([n, q]) => { const m = menus.find((x) => x.name === n); if (m) ids[m.id] = q; }); nb[k] = { qty: b.qty, items: ids }; });
        setExtra({ debt_payment: prev.debt_payment, expenses: prev.expenses, expense_note: prev.expense_note });
      } else {
        const bc = {};
        if (e.data.closed) e.data.bundles.forEach((b) => { const k = `${b.bundle}-${b.method}`; nb[k] = nb[k] || { qty: 0, items: {} }; nb[k].qty += b.qty; Object.entries(b.items).forEach(([mid, q]) => { nb[k].items[mid] = (nb[k].items[mid] || 0) + q; bc[mid] = bc[mid] || { cash: 0, qris: 0 }; bc[mid][b.method] += q; }); });
        menus.forEach((m) => { const r = e.data.closed ? e.data.rows.find((x) => x.menu_id === m.id) : null;
          next[m.id] = { stock: st[m.id] || 0, remaining: r ? Math.max(0, r.remaining) : 0, cash: r ? r.cash_qty - (bc[m.id]?.cash || 0) : 0, qris: r ? r.qris_qty - (bc[m.id]?.qris || 0) : 0, wastage: 0 }; });
        setExtra({ debt_payment: 0, expenses: 0, expense_note: "" });
      }
      setRows(next); setBundles(nb);
    })();
  }, [riderId, date, menus]);

  const calc = useMemo(() => {
    const bc = {}; let bCash = 0, bQris = 0;
    Object.entries(bundles).forEach(([k, v]) => { if (!v.qty) return; const [b, method] = k.split("-"); const amt = BUNDLES[b].price * v.qty; method === "cash" ? (bCash += amt) : (bQris += amt);
      Object.entries(v.items || {}).forEach(([mid, q]) => { bc[mid] = bc[mid] || { cash: 0, qris: 0 }; bc[mid][method] += q; }); });
    let cups = 0, cash = bCash, qris = bQris, minus = 0, wastage = 0;
    const lines = menus.map((m) => {
      const r = rows[m.id] || EMPTY; const b = bc[m.id] || { cash: 0, qris: 0 }; const sold = r.cash + r.qris + b.cash + b.qris; const diff = r.stock - (sold + r.remaining + r.wastage);
      cups += sold; cash += r.cash * m.price; qris += r.qris * m.price; minus += Math.max(0, diff) * m.price; wastage += r.wastage;
      return { ...m, ...r, b, sold, diff };
    });
    return { lines, cups, cash, qris, minus, wastage, income: cash + qris, remainingDebt: debt + minus - Number(extra.debt_payment || 0), net: cash - Number(extra.expenses || 0) + Number(extra.debt_payment || 0) };
  }, [rows, bundles, menus, debt, extra]);

  const setCell = (mid, k, v) => setRows({ ...rows, [mid]: { ...(rows[mid] || EMPTY), [k]: v } });
  const setBundleQty = (k, qty) => { const cur = bundles[k] || { qty: 0, items: {} }; setBundles({ ...bundles, [k]: { qty, items: cur.items } }); if (qty > 0) setEditB({ key: k, value: { qty, items: cur.items } }); };
  const bundleOk = Object.entries(bundles).every(([k, v]) => !v.qty || Object.values(v.items || {}).reduce((a, x) => a + x, 0) === BUNDLES[k.split("-")[0]].cups * v.qty);

  const save = async () => {
    if (!bundleOk) return toast.error(t("selectMenus") + " (bundling)");
    setBusy(true);
    try {
      const { data } = await api.post("/deposits", { rider_id: riderId, date, pic_id: user.id, rows: menus.map((m) => ({ menu_id: m.id, ...(rows[m.id] || EMPTY) })),
        bundles: Object.entries(bundles).filter(([, v]) => v.qty > 0).map(([k, v]) => ({ bundle: Number(k.split("-")[0]), method: k.split("-")[1], qty: v.qty, items: v.items })),
        debt_payment: Number(extra.debt_payment || 0), expenses: Number(extra.expenses || 0), expense_note: extra.expense_note });
      setResult(data); toast.success(t("save") + " ✓"); loadList();
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const reset = () => { setResult(null); setRiderId(""); setRows({}); setBundles({}); setExtra({ debt_payment: 0, expenses: 0, expense_note: "" }); };

  const L = lang === "id";
  const waText = result && `*SI FOUR AM ${L ? "SETORAN" : "DEPOSIT"}*\n----------------------------------\n👤 *Rider:* ${result.rider_name}\n👥 *PIC:* ${result.pic_name}\n📅 *${L ? "Tanggal" : "Date"}:* ${fmtDate(result.date)} ${result.time} WIB\n📊 *${L ? "Total Terjual" : "Total Sold"}:* ${result.total_cups} cups\n🗑️ *${L ? "Total Wastage" : "Total Wastage"}:* ${result.total_wastage}\n\n💰 *Total Cash:* ${fmtRp(result.total_cash)}\n💳 *Total QRIS:* ${fmtRp(result.total_qris)}\n\n🧾 *${L ? "Hutang Awal" : "Initial Debt"}:* ${fmtRp(result.initial_debt)}\n⚠️ *${L ? "Hutang Baru" : "New Debt"}:* ${fmtRp(result.new_debt)}\n📈 *${L ? "Bayar Hutang" : "Debt Payment"}:* ${fmtRp(result.debt_payment)}\n❗ *${L ? "Sisa Hutang" : "Remaining Debt"}:* ${fmtRp(result.remaining_debt)}\n\n💵 *${L ? "Komisi Rider" : "Rider Commission"}:* ${fmtRp(result.commission)}\n📉 *${L ? "Pengeluaran" : "Expenses"}:* ${fmtRp(result.expenses)} ${result.expense_note}\n🚀 *${L ? "SETORAN BERSIH" : "NET CASH DEPOSIT"}:* ${fmtRp(result.net_cash)}\n----------------------------------\n${result.motivation}`;

  return (
    <div data-testid="deposit-page">
      <PageHeader eyebrow="Bar Team → Rider" title={t("deposit")} />
      <Bento gold className="fade-up" testId="deposit-form">
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <Field label={`${t("pic")} (auto)`}><input data-testid="deposit-pic" className="field bg-muted/50" value={user.name} readOnly /></Field>
          <Field label={t("selectRider")}><Select testId="deposit-rider-select" value={riderId} onChange={setRiderId} placeholder="—" options={riders.map((r) => ({ value: r.id, label: r.name }))} /></Field>
          <Field label={t("date")}><input data-testid="deposit-date-input" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        {riderId && eod && <div data-testid="eod-status" className={`rounded-xl p-3 text-xs mb-4 ${eod.closed ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
          {eod.closed ? `✓ ${t("eodDone")} — ${eod.transactions} ${t("transactions")}, ${eod.total_cups} cups (${t("cash")} ${fmtRp(eod.total_cash)}, QRIS ${fmtRp(eod.total_qris)})` : (L ? "Rider belum menutup penjualan di POS — data penjualan tidak diambil otomatis." : "Rider has not ended today's sales in POS — sales data not auto-filled.")}</div>}
        <div>
          <table className="table-x"><thead><tr><th>{t("menu")}</th><th>{t("stock")}</th><th>{t("remaining")}</th><th>{t("cash")}</th><th>{t("qris")}</th><th>{t("wastage")}</th><th className="hide-xs">{t("sold")}</th><th className="hide-xs">{t("diff")}</th></tr></thead>
            <tbody>{calc.lines.map((l) => (
              <tr key={l.id} data-testid={`deposit-row-${l.id}`}><td><p className="font-semibold text-sm leading-tight">{l.name.replace("SI ", "")}</p><p className="text-[10px] text-muted-foreground num">{fmtRp(l.price)}</p>
                <p className="sm:hidden text-[10px] num"><span className="font-bold">{l.sold}</span> {t("sold").toLowerCase()} · <span className={`font-bold ${l.diff > 0 ? "text-red-500" : l.diff < 0 ? "text-amber-500" : "text-emerald-500"}`}>{l.diff}</span></p></td>
                {["stock", "remaining", "cash", "qris", "wastage"].map((k) => <td key={k}><QtySelect testId={`deposit-${k}-${l.id}`} max={l.max_stock} value={l[k]} onChange={(v) => setCell(l.id, k, v)} />{(k === "cash" && l.b.cash > 0) && <span className="block text-[9px] text-primary">+{l.b.cash}</span>}{(k === "qris" && l.b.qris > 0) && <span className="block text-[9px] text-primary">+{l.b.qris}</span>}</td>)}
                <td className="num font-bold hide-xs">{l.sold}</td><td className={`num font-bold hide-xs ${l.diff > 0 ? "text-red-500" : l.diff < 0 ? "text-amber-500" : "text-emerald-500"}`}>{l.diff}{l.diff > 0 && <span className="block text-[10px]">{fmtRp(l.diff * l.price)}</span>}</td></tr>))}
              {[1, 2].map((b) => (
                <tr key={b} className="bg-primary/5" data-testid={`bundle-row-${b}`}><td><p className="font-semibold text-sm text-primary leading-tight">BUNDLING {b}</p><p className="text-[10px] text-muted-foreground num">{BUNDLES[b].cups} cup · {fmtRp(BUNDLES[b].price)}</p></td><td /><td />
                  {["cash", "qris"].map((m) => { const k = `${b}-${m}`; const v = bundles[k] || { qty: 0, items: {} }; const ok = !v.qty || Object.values(v.items).reduce((a, x) => a + x, 0) === BUNDLES[b].cups * v.qty;
                    return <td key={m}><QtySelect testId={`bundle-${k}`} max={20} value={v.qty} onChange={(q) => setBundleQty(k, q)} />{v.qty > 0 && <button data-testid={`bundle-edit-${k}`} onClick={() => setEditB({ key: k, value: v })} className={`block text-[10px] font-semibold ${ok ? "text-emerald-500" : "text-red-500"}`}>{ok ? "✓ menu" : "! " + t("selectMenus")}</button>}</td>; })}
                  <td /><td className="hide-xs" /><td className="hide-xs" /></tr>))}
            </tbody></table>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[[t("cash"), fmtRp(calc.cash), "cash"], [t("qris"), fmtRp(calc.qris), "qris"], [t("totalIncome"), fmtRp(calc.income), "income"], [t("totalSold"), `${calc.cups} ${t("cups")}`, "sold"], [t("newDebt"), fmtRp(calc.minus), "minus"], [t("initialDebt"), fmtRp(debt), "debt"], [t("wastage"), `${calc.wastage} ${t("cups")}`, "wastage"], [t("remainingDebt"), fmtRp(calc.remainingDebt), "remaining-debt"]].map(([l, v, id]) => (
            <div key={id} className="rounded-xl bg-muted/60 p-3"><p className="eyebrow">{l}</p><p className="num font-bold text-sm" data-testid={`calc-${id}`}>{v}</p></div>))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <Field label={`${t("debtPayment")} (Rp)`}><input data-testid="deposit-debt-payment-input" type="number" className="field num" value={extra.debt_payment} onChange={(e) => setExtra({ ...extra, debt_payment: e.target.value })} /></Field>
          <Field label={`${t("expenses")} (Rp)`}><input data-testid="deposit-expenses-input" type="number" className="field num" value={extra.expenses} onChange={(e) => setExtra({ ...extra, expenses: e.target.value })} /></Field>
          <Field label={t("note")}><input data-testid="deposit-expense-note-input" className="field" value={extra.expense_note} onChange={(e) => setExtra({ ...extra, expense_note: e.target.value })} /></Field>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border/60">
          <div><p className="eyebrow">{t("netCash")}</p><p data-testid="calc-net-cash" className="text-3xl font-bold num font-heading text-primary">{fmtRp(calc.net)}</p></div>
          <button data-testid="deposit-save-button" onClick={save} disabled={!riderId || busy} className="btn-primary h-12 px-8 w-full sm:w-auto">{t("saveDb")}</button>
        </div>
      </Bento>

      <Bento className="mt-6" testId="deposit-list">
        <p className="eyebrow mb-3">{t("history")}</p>
        <table className="table-x"><thead><tr><th>{t("date")}</th><th>{t("rider")}</th><th className="hide-sm">{t("pic")}</th><th>Cups</th><th className="hide-xs">{t("cash")}</th><th className="hide-xs">{t("qris")}</th><th>Net</th></tr></thead>
          <tbody>{list.map((d) => <tr key={d.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setResult(d)}><td className="num text-xs">{d.date}<span className="hide-sm"> {d.time || ""}</span></td><td>{d.rider_name}</td><td className="text-xs hide-sm">{d.pic_name}</td><td className="num">{d.total_cups}</td><td className="num hide-xs">{fmtRp(d.total_cash)}</td><td className="num hide-xs">{fmtRp(d.total_qris)}</td><td className="num font-bold">{fmtRp(d.net_cash)}</td></tr>)}</tbody></table>
        {!list.length && <Empty text={t("noData")} />}
      </Bento>

      {editB && <BundleDialog bkey={editB.key} menus={menus} value={editB.value} onClose={() => setEditB(null)} onSave={(items) => { setBundles({ ...bundles, [editB.key]: { qty: editB.value.qty, items } }); setEditB(null); }} />}

      <ReceiptModal open={!!result} onClose={reset} title={L ? "Struk Setoran" : "Deposit Receipt"} waText={waText} filename={`RECEIPT_${(result?.rider_name || "").replace(/\s+/g, "_")}.png`} testId="deposit-receipt">
        {result && <>
          <RLine l="No" r={result.receipt_no} /><RLine l="Rider" r={result.rider_name} /><RLine l="PIC" r={result.pic_name} /><RLine l={t("date")} r={`${fmtDate(result.date)} · ${result.time || "-"}`} />
          <div className="border-t border-dashed border-gray-300 my-2" />
          {result.rows.filter((r) => r.total_sold || r.stock).map((r) => <RLine key={r.menu_id} l={`${r.name} ×${r.total_sold}`} r={fmtRp(r.cash_amt + r.qris_amt)} />)}
          {(result.bundles || []).map((b, i) => <RLine key={i} l={`${b.name} ×${b.qty} (${b.method.toUpperCase()})`} r={fmtRp(b.amount)} />)}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <RLine l={t("totalSold")} r={`${result.total_cups} cups`} /><RLine l={t("wastage")} r={result.total_wastage} /><RLine l="Cash" r={fmtRp(result.total_cash)} /><RLine l="QRIS" r={fmtRp(result.total_qris)} />
          <RLine l={t("initialDebt")} r={fmtRp(result.initial_debt)} /><RLine l={t("newDebt")} r={fmtRp(result.new_debt)} /><RLine l={t("debtPayment")} r={fmtRp(result.debt_payment)} /><RLine l={t("remainingDebt")} r={fmtRp(result.remaining_debt)} />
          <RLine l={t("commission")} r={fmtRp(result.commission || 0)} /><RLine l={t("expenses")} r={fmtRp(result.expenses)} />
          <RLine bold l={t("netCash").toUpperCase()} r={fmtRp(result.net_cash)} />
          <p className="text-[11px] text-center mt-3 text-gray-600">{result.motivation}</p>
        </>}
      </ReceiptModal>
    </div>
  );
}
