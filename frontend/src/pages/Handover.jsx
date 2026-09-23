import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { fmtRp, today } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento, Field, Select, DateFilter, Stat, Empty } from "../components/common";

export default function Handover() {
  const { t } = useT();
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [range, setRange] = useState(null);
  const [list, setList] = useState([]);
  const [f, setF] = useState({ date: today(), giver_id: "", receiver_id: user.id, amount: "", note: "" });
  useEffect(() => { api.get("/users").then((r) => setStaff(r.data.filter((u) => u.role !== "rider"))); }, []);
  const load = () => range && api.get("/handovers", { params: range }).then((r) => setList(r.data));
  useEffect(() => { load(); }, [range]); // eslint-disable-line
  const save = async (e) => {
    e.preventDefault();
    try { await api.post("/handovers", { ...f, amount: Number(f.amount) }); toast.success("Handover recorded"); setF({ ...f, amount: "", note: "" }); load(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <div data-testid="handover-page">
      <PageHeader eyebrow="Bar Team → Superadmin" title={t("handover")}><DateFilter onChange={setRange} /></PageHeader>
      <div className="grid lg:grid-cols-3 gap-6">
        <Bento gold className="fade-up" testId="handover-form">
          <p className="eyebrow mb-4">Record cash handover</p>
          <form onSubmit={save} className="space-y-3">
            <Field label="Giving PIC (Bar Team)"><Select testId="handover-giver-select" value={f.giver_id} onChange={(v) => setF({ ...f, giver_id: v })} placeholder="—" options={staff.filter((s) => s.role === "barteam" || s.role === "superadmin").map((s) => ({ value: s.id, label: `${s.name} (${s.role})` }))} /></Field>
            <Field label="Receiving PIC"><Select testId="handover-receiver-select" value={f.receiver_id} onChange={(v) => setF({ ...f, receiver_id: v })} options={staff.filter((s) => s.role === "superadmin").map((s) => ({ value: s.id, label: s.name }))} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("date")}><input data-testid="handover-date-input" type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
              <Field label="Amount (Rp)"><input data-testid="handover-amount-input" type="number" className="field num" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
            </div>
            <Field label="Note"><input data-testid="handover-note-input" className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
            <button data-testid="handover-save-button" className="btn-primary w-full" disabled={!f.giver_id}>{t("save")}</button>
          </form>
        </Bento>
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4"><Stat gold label="Total handed over" value={fmtRp(list.reduce((s, h) => s + h.amount, 0))} testId="handover-total" /><Stat label="Records" value={list.length} testId="handover-count" /></div>
          <Bento className="overflow-x-auto" testId="handover-list">
            <table className="table-x"><thead><tr><th>Date</th><th>Giver</th><th>Receiver</th><th>Amount</th><th>Note</th></tr></thead>
              <tbody>{list.map((h) => <tr key={h.id}><td className="num">{h.date}</td><td>{h.giver_name}</td><td>{h.receiver_name}</td><td className="num font-bold">{fmtRp(h.amount)}</td><td className="text-xs text-muted-foreground">{h.note}</td></tr>)}</tbody></table>
            {!list.length && <Empty text={t("noData")} />}
          </Bento>
        </div>
      </div>
    </div>
  );
}
