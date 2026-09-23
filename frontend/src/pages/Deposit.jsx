import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { fmtRp, today, fmtDate } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento, Field, Select, QtySelect, ReceiptModal, RLine, Empty } from "../components/common";

const EMPTY = { stock: 0, remaining: 0, cash: 0, qris: 0, wastage: 0 };

export default function Deposit() {
  const { t } = useT();
  const { user } = useAuth();
  const [riders, setRiders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [menus, setMenus] = useState([]);
  const [picId, setPicId] = useState(user.id);
  const [riderId, setRiderId] = useState("");
  const [date, setDate] = useState(today());
  const [rows, setRows] = useState({});
  const [debt, setDebt] = useState(0);
  const [extra, setExtra] = useState({ debt_payment: 0, expenses: 0, expense_note: "" });
  const [result, setResult] = useState(null);
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get("/users").then((r) => { setRiders(r.data.filter((u) => u.role === "rider")); setStaff(r.data.filter((u) => u.role !== "rider")); });
    api.get("/menus").then((r) => setMenus(r.data));
    api.get("/deposits", { params: { start: "2000-01-01", end: "2100-01-01" } }).then((r) => setList(r.data.slice(0, 20)));
  }, []);
  useEffect(() => {
    if (!riderId) return;
    api.get("/rider-stock", { params: { rider_id: riderId, date } }).then((r) => {
      const st = r.data?.items || {};
      api.get("/deposits", { params: { start: date, end: date, rider_id: riderId } }).then((d) => {
        const ex = d.data[0];
        const next = {};
        menus.forEach((m) => { const er = ex?.rows.find((x) => x.menu_id === m.id); next[m.id] = er ? { stock: er.stock, remaining: er.remaining, cash: er.cash, qris: er.qris, wastage: er.wastage } : { ...EMPTY, stock: st[m.id] || 0 }; });
        setRows(next);
        if (ex) setExtra({ debt_payment: ex.debt_payment, expenses: ex.expenses, expense_note: ex.expense_note });
      });
    });
    api.get("/deposits/debt", { params: { rider_id: riderId, date } }).then((r) => setDebt(r.data.debt));
  }, [riderId, date, menus]);

  const calc = useMemo(() => {
    let cups = 0, cash = 0, qris = 0, minus = 0, wastage = 0;
    const lines = menus.map((m) => {
      const r = rows[m.id] || EMPTY; const sold = r.cash + r.qris; const diff = r.stock - (sold + r.remaining + r.wastage);
      cups += sold; cash += r.cash * m.price; qris += r.qris * m.price; minus += Math.max(0, diff) * m.price; wastage += r.wastage;
      return { ...m, ...r, sold, diff };
    });
    return { lines, cups, cash, qris, minus, wastage, income: cash + qris, remainingDebt: debt + minus - Number(extra.debt_payment || 0), net: cash - Number(extra.expenses || 0) + Number(extra.debt_payment || 0) };
  }, [rows, menus, debt, extra]);

  const setCell = (mid, k, v) => setRows({ ...rows, [mid]: { ...(rows[mid] || EMPTY), [k]: v } });
  const save = async () => {
    try {
      const { data } = await api.post("/deposits", { rider_id: riderId, date, pic_id: picId, rows: menus.map((m) => ({ menu_id: m.id, ...(rows[m.id] || EMPTY) })), debt_payment: Number(extra.debt_payment || 0), expenses: Number(extra.expenses || 0), expense_note: extra.expense_note });
      setResult(data); toast.success("Deposit saved");
      api.get("/deposits", { params: { start: "2000-01-01", end: "2100-01-01" } }).then((r) => setList(r.data.slice(0, 20)));
    } catch (e) { toast.error(errMsg(e)); }
  };
  const reset = () => { setResult(null); setRiderId(""); setRows({}); setExtra({ debt_payment: 0, expenses: 0, expense_note: "" }); };

  const waText = result && `*SI FOUR AM DEPOSIT*\n----------------------------------\n👤 *Rider:* ${result.rider_name}\n👥 *PIC:* ${result.pic_name}\n📅 *Time:* ${fmtDate(result.date)}\n📊 *Total Sold:* ${result.total_cups} cups\n🗑️ *Total Wastage:* ${result.total_wastage}\n\n💰 *Total Cash:* ${fmtRp(result.total_cash)}\n💳 *Total QRIS:* ${fmtRp(result.total_qris)}\n\n🧾 *Initial Debt:* ${fmtRp(result.initial_debt)}\n⚠️ *New Debt:* ${fmtRp(result.new_debt)}\n📈 *Debt Payment:* ${fmtRp(result.debt_payment)}\n❗ *Remaining Debt:* ${fmtRp(result.remaining_debt)}\n\n📉 *Expenses:* ${fmtRp(result.expenses)} ${result.expense_note}\n🚀 *NET CASH DEPOSIT:* ${fmtRp(result.net_cash)}\n----------------------------------\n${result.motivation}`;

  return (
    <div data-testid="deposit-page">
      <PageHeader eyebrow="Bar Team → Rider" title={t("deposit")} />
      <Bento gold className="fade-up overflow-x-auto" testId="deposit-form">
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <Field label="Bar Team PIC"><Select testId="deposit-pic-select" value={picId} onChange={setPicId} options={staff.map((s) => ({ value: s.id, label: s.name }))} /></Field>
          <Field label={t("selectRider")}><Select testId="deposit-rider-select" value={riderId} onChange={setRiderId} placeholder="—" options={riders.map((r) => ({ value: r.id, label: r.name }))} /></Field>
          <Field label={t("date")}><input data-testid="deposit-date-input" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <table className="table-x min-w-[860px]"><thead><tr><th>Menu</th><th>{t("price")}</th><th>Stock</th><th>{t("remaining")}</th><th>Cash</th><th>QRIS</th><th>Wastage</th><th>Sold</th><th>Diff</th><th>Minus</th></tr></thead>
          <tbody>{calc.lines.map((l) => (
            <tr key={l.id} data-testid={`deposit-row-${l.id}`}><td className="font-semibold whitespace-nowrap">{l.name}</td><td className="num text-muted-foreground">{fmtRp(l.price)}</td>
              {["stock", "remaining", "cash", "qris", "wastage"].map((k) => <td key={k}><QtySelect testId={`deposit-${k}-${l.id}`} max={l.max_stock} value={l[k]} onChange={(v) => setCell(l.id, k, v)} /></td>)}
              <td className="num font-bold">{l.sold}</td><td className={`num font-bold ${l.diff > 0 ? "text-red-500" : l.diff < 0 ? "text-amber-500" : "text-emerald-500"}`}>{l.diff}</td><td className="num text-red-500">{l.diff > 0 ? fmtRp(l.diff * l.price) : "-"}</td></tr>))}</tbody></table>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {[["Cash", fmtRp(calc.cash)], ["QRIS", fmtRp(calc.qris)], ["Total Income", fmtRp(calc.income)], ["Total Sold", `${calc.cups} cups`], ["New Debt (Minus)", fmtRp(calc.minus)], ["Initial Debt", fmtRp(debt)], ["Total Wastage", `${calc.wastage} cups`], ["Remaining Debt", fmtRp(calc.remainingDebt)]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-muted/60 p-3"><p className="eyebrow">{l}</p><p className="num font-bold" data-testid={`calc-${l.toLowerCase().replace(/[^a-z]+/g, "-")}`}>{v}</p></div>))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <Field label="Debt Payment (Rp)"><input data-testid="deposit-debt-payment-input" type="number" className="field num" value={extra.debt_payment} onChange={(e) => setExtra({ ...extra, debt_payment: e.target.value })} /></Field>
          <Field label="Expenses (Rp)"><input data-testid="deposit-expenses-input" type="number" className="field num" value={extra.expenses} onChange={(e) => setExtra({ ...extra, expenses: e.target.value })} /></Field>
          <Field label="Expense note"><input data-testid="deposit-expense-note-input" className="field" value={extra.expense_note} onChange={(e) => setExtra({ ...extra, expense_note: e.target.value })} /></Field>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border/60">
          <div><p className="eyebrow">Total Cash Deposit (net)</p><p data-testid="calc-net-cash" className="text-3xl font-bold num font-heading text-primary">{fmtRp(calc.net)}</p></div>
          <button data-testid="deposit-save-button" onClick={save} disabled={!riderId} className="btn-primary h-12 px-8">Save to Database</button>
        </div>
      </Bento>

      <Bento className="mt-6 overflow-x-auto" testId="deposit-list">
        <p className="eyebrow mb-3">Recent deposits</p>
        <table className="table-x"><thead><tr><th>Date</th><th>Rider</th><th>PIC</th><th>Cups</th><th>Cash</th><th>QRIS</th><th>Net</th><th>Debt</th></tr></thead>
          <tbody>{list.map((d) => <tr key={d.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setResult(d)}><td className="num">{d.date}</td><td>{d.rider_name}</td><td className="text-xs">{d.pic_name}</td><td className="num">{d.total_cups}</td><td className="num">{fmtRp(d.total_cash)}</td><td className="num">{fmtRp(d.total_qris)}</td><td className="num font-bold">{fmtRp(d.net_cash)}</td><td className="num text-red-500">{fmtRp(d.remaining_debt)}</td></tr>)}</tbody></table>
        {!list.length && <Empty text={t("noData")} />}
      </Bento>

      <ReceiptModal open={!!result} onClose={reset} title="Deposit Receipt" waText={waText} waPhone={riders.find((r) => r.id === result?.rider_id)?.whatsapp} filename={`${result?.receipt_no || "deposit"}.png`} testId="deposit-receipt">
        {result && <>
          <RLine l="No" r={result.receipt_no} /><RLine l="Rider" r={result.rider_name} /><RLine l="PIC" r={result.pic_name} /><RLine l="Date" r={fmtDate(result.date)} />
          <div className="border-t border-dashed border-gray-300 my-2" />
          {result.rows.filter((r) => r.total_sold || r.stock).map((r) => <RLine key={r.menu_id} l={`${r.name} ×${r.total_sold}`} r={fmtRp(r.cash_amt + r.qris_amt)} />)}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <RLine l="Total Sold" r={`${result.total_cups} cups`} /><RLine l="Wastage" r={result.total_wastage} /><RLine l="Cash" r={fmtRp(result.total_cash)} /><RLine l="QRIS" r={fmtRp(result.total_qris)} />
          <RLine l="Initial Debt" r={fmtRp(result.initial_debt)} /><RLine l="New Debt" r={fmtRp(result.new_debt)} /><RLine l="Debt Payment" r={fmtRp(result.debt_payment)} /><RLine l="Remaining Debt" r={fmtRp(result.remaining_debt)} />
          <RLine l="Expenses" r={fmtRp(result.expenses)} />
          <RLine bold l="NET CASH DEPOSIT" r={fmtRp(result.net_cash)} />
          <p className="text-[11px] text-center mt-3 text-gray-600">{result.motivation}</p>
        </>}
      </ReceiptModal>
    </div>
  );
}
