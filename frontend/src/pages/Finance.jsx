import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Landmark, Wallet, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { api, errMsg } from "../lib/api";
import { fmtRp, today } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { PageHeader, Bento, Stat, DateFilter, Field, Select, Empty } from "../components/common";

const CATS = ["Raw Material", "Packaging", "Fuel / Transport", "Salary", "Rent", "Utilities", "Marketing", "Equipment", "Other"];
const COLORS = ["#FF6B00", "#D4AF37", "#ef4444", "#f59e0b", "#fb923c", "#a16207", "#eab308", "#78350f", "#9ca3af"];

export default function Finance() {
  const { t } = useT();
  const [range, setRange] = useState(null);
  const [d, setD] = useState(null);
  const [f, setF] = useState({ date: today(), category: CATS[0], amount: "", note: "", account: "cash", type: "expense" });
  const load = () => range && api.get("/finance/summary", { params: range }).then((r) => setD(r.data));
  useEffect(() => { load(); }, [range]); // eslint-disable-line
  const save = async (e) => {
    e.preventDefault();
    try { await api.post("/expenses", { ...f, amount: Number(f.amount) }); toast.success("Recorded"); setF({ ...f, amount: "", note: "" }); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  const del = async (id) => { await api.delete(`/expenses/${id}`); load(); };

  return (
    <div data-testid="finance-page">
      <PageHeader eyebrow="Superadmin" title={t("finance")}><DateFilter onChange={setRange} /></PageHeader>
      {d && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Stat gold label={t("income")} value={fmtRp(d.income)} icon={ArrowUpRight} testId="fin-income" />
          <Stat label={t("outgo")} value={fmtRp(d.outgo)} icon={ArrowDownRight} testId="fin-outgo" />
          <Stat label="Cash balance" value={fmtRp(d.cash_balance)} sub={`Handed over: ${fmtRp(d.handover_total)}`} icon={Wallet} testId="fin-cash" />
          <Stat label="Bank / QRIS balance" value={fmtRp(d.bank_balance)} icon={Landmark} testId="fin-bank" />
          <Stat label="Net profit" value={fmtRp(d.net)} sub="income − all outgoing" testId="fin-net" className={d.net >= 0 ? "" : "border-red-500/40"} />
          <Stat label="Gross profit (after HPP)" value={fmtRp(d.gross_profit)} sub={`COGS ${fmtRp(d.cogs)}`} testId="fin-gross" />
          <Stat label="Inventory value" value={fmtRp(d.inventory_value)} sub="raw + packaging on hand" testId="fin-inventory" />
          <Stat label="Margin" value={d.income ? `${Math.round((d.net / d.income) * 100)}%` : "—"} sub="net / income" testId="fin-margin" />

          <Bento gold className="col-span-2 lg:col-span-1 fade-up" testId="expense-form">
            <p className="eyebrow mb-4">{t("addExpense")} / manual entry</p>
            <form onSubmit={save} className="space-y-3">
              <div className="flex gap-2">{["expense", "income"].map((k) => <button type="button" key={k} data-testid={`exp-type-${k}`} onClick={() => setF({ ...f, type: k })} className={`flex-1 h-9 rounded-full text-xs font-bold uppercase ${f.type === k ? "bg-primary text-white" : "bg-muted"}`}>{k}</button>)}</div>
              <Field label="Category"><Select testId="exp-category-select" value={f.category} onChange={(v) => setF({ ...f, category: v })} options={CATS} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount"><input data-testid="exp-amount-input" type="number" className="field num" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
                <Field label="Account"><Select testId="exp-account-select" value={f.account} onChange={(v) => setF({ ...f, account: v })} options={[{ value: "cash", label: "Cash" }, { value: "bank", label: "Bank" }]} /></Field>
              </div>
              <Field label={t("date")}><input type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
              <Field label="Note"><input data-testid="exp-note-input" className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
              <button data-testid="exp-save-button" className="btn-primary w-full">{t("save")}</button>
            </form>
          </Bento>
          <Bento className="col-span-2 lg:col-span-1 fade-up" testId="expense-breakdown">
            <p className="eyebrow mb-4">Outgoing by category</p>
            {d.by_category.length ? <><ResponsiveContainer width="100%" height={160}><PieChart><Pie data={d.by_category} dataKey="amount" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>{d.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v) => fmtRp(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} /></PieChart></ResponsiveContainer>
              <ul className="text-xs space-y-1">{d.by_category.map((c, i) => <li key={c.name} className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{c.name}</span><b className="num">{fmtRp(c.amount)}</b></li>)}</ul></> : <Empty text={t("noData")} />}
          </Bento>
          <Bento className="col-span-2 fade-up overflow-x-auto max-h-[560px] overflow-y-auto" testId="ledger">
            <p className="eyebrow mb-4">Cash / bank ledger · running balance</p>
            <table className="table-x"><thead><tr><th>Date</th><th>Category</th><th>Acct</th><th className="text-right">Amount</th><th className="text-right">Cash bal.</th><th className="text-right">Bank bal.</th><th /></tr></thead>
              <tbody>{d.ledger.map((l, i) => <tr key={i}><td className="num text-xs">{l.date}</td><td><span className="font-semibold text-xs">{l.category}</span><span className="block text-[10px] text-muted-foreground">{l.desc}</span></td><td className="text-[10px] uppercase">{l.account}</td>
                <td className={`num text-right font-semibold ${l.type === "in" ? "text-emerald-500" : "text-red-500"}`}>{l.type === "in" ? "+" : "−"}{fmtRp(l.amount)}</td><td className="num text-right text-xs">{fmtRp(l.balance_cash)}</td><td className="num text-right text-xs">{fmtRp(l.balance_bank)}</td>
                <td>{l.id && <button data-testid={`ledger-delete-${l.id}`} onClick={() => del(l.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}</td></tr>)}</tbody></table>
            {!d.ledger.length && <Empty text={t("noData")} />}
          </Bento>
        </div>
      )}
    </div>
  );
}
