import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { fmtRp, today, fmtDate, waNumber } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { PageHeader, Bento, Field, Select, ReceiptModal, RLine, Empty } from "../components/common";

export default function Invoice() {
  const { t } = useT();
  const [menus, setMenus] = useState([]);
  const [f, setF] = useState({ customer_name: "", customer_phone: "", date: today(), payment_method: "cash", discount: 0, note: "" });
  const [qty, setQty] = useState({});
  const [result, setResult] = useState(null);
  const [list, setList] = useState([]);
  const load = () => api.get("/invoices").then((r) => setList(r.data));
  useEffect(() => { api.get("/menus").then((r) => setMenus(r.data)); load(); }, []);

  const subtotal = useMemo(() => menus.reduce((s, m) => s + (qty[m.id] || 0) * m.price, 0), [qty, menus]);
  const total = subtotal - Number(f.discount || 0);
  const save = async () => {
    try {
      const { data } = await api.post("/invoices", { ...f, discount: Number(f.discount || 0), rows: menus.filter((m) => qty[m.id]).map((m) => ({ menu_id: m.id, qty: qty[m.id] })) });
      setResult(data); toast.success(`Invoice ${data.invoice_no} created`); load();
    } catch (e) { toast.error(errMsg(e)); }
  };
  const waText = result && `*SI FOUR AM — INVOICE ${result.invoice_no}*\n📅 ${fmtDate(result.date)}\n👤 ${result.customer_name}\n----------------------------------\n` +
    result.rows.map((r) => `${r.name} x${r.qty} = ${fmtRp(r.subtotal)}`).join("\n") + `\n----------------------------------\nSubtotal: ${fmtRp(result.subtotal)}\nDiscount: ${fmtRp(result.discount)}\n💰 *TOTAL: ${fmtRp(result.total)}*\nPayment: ${result.payment_method.toUpperCase()}\n\nThank you for your order! ☕`;

  return (
    <div data-testid="invoice-page">
      <PageHeader eyebrow="Superadmin" title={t("invoice")} />
      <div className="grid lg:grid-cols-3 gap-6">
        <Bento gold className="lg:col-span-2 fade-up" testId="invoice-form">
          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <Field label="Customer Name"><input data-testid="invoice-customer-input" className="field" value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} /></Field>
            <Field label="Customer WhatsApp"><input data-testid="invoice-phone-input" className="field" placeholder="08xx" value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} /></Field>
            <Field label={t("date")}><input data-testid="invoice-date-input" type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label="Payment"><Select testId="invoice-payment-select" value={f.payment_method} onChange={(v) => setF({ ...f, payment_method: v })} options={[{ value: "cash", label: "Cash" }, { value: "qris", label: "QRIS / Transfer" }]} /></Field>
          </div>
          <table className="table-x"><thead><tr><th>Menu</th><th>{t("price")}</th><th>{t("qty")}</th><th className="text-right">Subtotal</th></tr></thead>
            <tbody>{menus.map((m) => <tr key={m.id}><td className="font-semibold">{m.name}</td><td className="num text-muted-foreground">{fmtRp(m.price)}</td>
              <td><input data-testid={`invoice-qty-${m.id}`} type="number" min="0" className="field w-24 h-9 num" value={qty[m.id] || ""} placeholder="0" onChange={(e) => setQty({ ...qty, [m.id]: Number(e.target.value) })} /></td>
              <td className="num text-right">{fmtRp((qty[m.id] || 0) * m.price)}</td></tr>)}</tbody></table>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <Field label="Discount (Rp)"><input data-testid="invoice-discount-input" type="number" className="field num" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })} /></Field>
            <Field label="Note" className="sm:col-span-2"><input className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          </div>
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/60">
            <div><p className="eyebrow">Total</p><p data-testid="invoice-total" className="text-3xl font-bold num font-heading text-primary">{fmtRp(total)}</p><p className="text-xs text-muted-foreground">Subtotal {fmtRp(subtotal)}</p></div>
            <button data-testid="invoice-save-button" onClick={save} disabled={!f.customer_name || subtotal <= 0} className="btn-primary h-12 px-8">Create Invoice</button>
          </div>
        </Bento>
        <Bento className="fade-up" testId="invoice-list">
          <p className="eyebrow mb-3">Recent invoices</p>
          {list.map((i) => <div key={i.id} onClick={() => setResult(i)} className="py-2 border-b border-border/50 text-sm cursor-pointer hover:bg-muted/40 rounded-lg px-1"><div className="flex justify-between"><span className="font-semibold">{i.customer_name}</span><span className="num font-bold">{fmtRp(i.total)}</span></div><p className="text-xs text-muted-foreground num">{i.invoice_no} · {i.date}</p></div>)}
          {!list.length && <Empty text={t("noData")} />}
        </Bento>
      </div>
      <ReceiptModal open={!!result} onClose={() => { setResult(null); setQty({}); }} title={`Invoice ${result?.invoice_no || ""}`} waText={waText} waPhone={result?.customer_phone} filename={`${result?.invoice_no}.png`} testId="invoice-receipt">
        {result && <>
          <RLine l="Invoice No" r={result.invoice_no} /><RLine l="Date" r={fmtDate(result.date)} /><RLine l="Bill to" r={result.customer_name} /><RLine l="WhatsApp" r={result.customer_phone ? `+${waNumber(result.customer_phone)}` : "-"} />
          <div className="border-t border-dashed border-gray-300 my-2" />
          {result.rows.map((r) => <RLine key={r.menu_id} l={`${r.name} ×${r.qty} @ ${fmtRp(r.price)}`} r={fmtRp(r.subtotal)} />)}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <RLine l="Subtotal" r={fmtRp(result.subtotal)} /><RLine l="Discount" r={fmtRp(result.discount)} /><RLine bold l="TOTAL" r={fmtRp(result.total)} /><RLine l="Payment" r={result.payment_method.toUpperCase()} />
          <p className="text-[10px] text-gray-400 text-center mt-3">Issued by {result.created_by} · SI FOUR AM</p>
        </>}
      </ReceiptModal>
    </div>
  );
}
