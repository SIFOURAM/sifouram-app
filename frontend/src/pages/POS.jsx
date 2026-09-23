import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2, LogIn, LogOut, ReceiptText, History } from "lucide-react";
import { api, errMsg } from "../lib/api";
import { fmtRp, today, fmtTime, waNumber } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento, Field, Select, PhotoCapture, ReceiptModal, RLine, Empty } from "../components/common";

function PinGate() {
  const { unlockPos } = useAuth();
  const { t } = useT();
  const [pin, setPin] = useState("");
  const press = async (k) => {
    if (k === "⌫") return setPin(pin.slice(0, -1));
    const p = pin + k; setPin(p);
    if (p.length >= 4) {
      try { await api.post("/auth/verify-pin", { pin: p }); unlockPos(); toast.success("Cashier unlocked"); }
      catch { if (p.length >= 6) { toast.error("Wrong PIN"); setPin(""); } }
    }
  };
  return (
    <div className="max-w-xs mx-auto text-center pt-10 fade-up" data-testid="pin-gate">
      <p className="eyebrow mb-2">{t("pin")}</p><h2 className="text-2xl font-bold mb-6">{t("enterPin")}</h2>
      <div className="flex justify-center gap-3 mb-8 h-4">{Array.from({ length: 6 }).map((_, i) => <span key={i} className={`w-3 h-3 rounded-full transition-colors ${i < pin.length ? "bg-primary" : "bg-muted"}`} />)}</div>
      <div className="grid grid-cols-3 gap-3">{["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) => (
        k === "" ? <span key={i} /> : <button key={k} data-testid={`pin-key-${k === "⌫" ? "del" : k}`} onClick={() => press(k)} className="h-16 rounded-2xl bg-card border border-border text-xl font-heading font-semibold hover:bg-muted active:scale-95 transition-transform">{k}</button>))}</div>
      <button data-testid="pin-submit" onClick={() => press("")} className="mt-4 text-xs text-muted-foreground">PIN 4–6 digits · auto-verifies</button>
    </div>
  );
}

function Attendance({ rider, riders, riderId, setRiderId, isRider }) {
  const { t } = useT();
  const [att, setAtt] = useState(null);
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState(null);
  const load = () => riderId && api.get("/attendance", { params: { start: today(), end: today(), rider_id: riderId } }).then((r) => setAtt(r.data[0] || null));
  useEffect(() => { load(); }, [riderId]); // eslint-disable-line
  const act = async (kind) => {
    if (!photo) return toast.error("Take a photo first");
    let pos = {};
    try { const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })); pos = { lat: p.coords.latitude, lng: p.coords.longitude }; } catch { }
    try { await api.post(`/attendance/${kind}`, { rider_id: riderId, pin, photo, date: today(), ...pos }); toast.success(kind === "checkin" ? "Checked in!" : "Checked out!"); setPin(""); setPhoto(null); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Bento gold className="fade-up" testId="attendance-card">
      <p className="eyebrow mb-3">Rider Attendance · {today()}</p>
      {!isRider && <Field label={t("selectRider")} className="mb-3"><Select testId="pos-rider-select" value={riderId} onChange={setRiderId} placeholder="—" options={riders.map((r) => ({ value: r.id, label: r.name }))} /></Field>}
      {isRider && <p className="font-heading font-bold text-lg mb-3">{rider?.name}</p>}
      {att ? (
        <div className="text-sm space-y-1 mb-3"><p className="flex justify-between"><span className="text-muted-foreground">{t("checkIn")}</span><span className="num font-semibold text-emerald-500">{fmtTime(att.checkin_at)}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("checkOut")}</span><span className="num font-semibold">{att.checkout_at ? fmtTime(att.checkout_at) : "—"}</span></p>
          <div className="flex gap-2 pt-1">{att.checkin_photo && <img src={att.checkin_photo} alt="" className="w-14 h-14 rounded-xl object-cover" />}{att.checkout_photo && <img src={att.checkout_photo} alt="" className="w-14 h-14 rounded-xl object-cover" />}</div></div>
      ) : <p className="text-xs text-muted-foreground mb-3">No attendance yet today.</p>}
      {(!att || !att.checkout_at) && riderId && (
        <div className="space-y-3">
          <PhotoCapture value={photo} onChange={setPhoto} label={att ? "Check-out photo" : "Check-in photo"} testId="attendance-photo" />
          <input data-testid="attendance-pin-input" type="password" inputMode="numeric" className="field" placeholder="Rider PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          {!att ? <button data-testid="checkin-button" onClick={() => act("checkin")} className="btn-primary w-full"><LogIn className="w-4 h-4" />{t("checkIn")}</button>
            : <button data-testid="checkout-button" onClick={() => act("checkout")} className="btn-ghost w-full"><LogOut className="w-4 h-4" />{t("checkOut")}</button>}
        </div>)}
    </Bento>
  );
}

export default function POS() {
  const { user, posUnlocked } = useAuth();
  const { t } = useT();
  const isRider = user.role === "rider";
  const [riders, setRiders] = useState([]);
  const [riderId, setRiderId] = useState(isRider ? user.id : "");
  const [stock, setStock] = useState({ has_stock: false, items: [] });
  const [cart, setCart] = useState({});
  const [cust, setCust] = useState({ name: "", phone: "" });
  const [pay, setPay] = useState("cash");
  const [cash, setCash] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [eod, setEod] = useState(null);
  const [hist, setHist] = useState(null);
  const [histDate, setHistDate] = useState(today());

  useEffect(() => { if (!isRider) api.get("/users", { params: { role: "rider" } }).then((r) => setRiders(r.data)); }, [isRider]);
  const loadStock = () => riderId && api.get("/pos/stock", { params: { rider_id: riderId, date: today() } }).then((r) => setStock(r.data));
  useEffect(() => { loadStock(); }, [riderId]); // eslint-disable-line

  const lines = useMemo(() => stock.items.filter((i) => cart[i.menu_id]).map((i) => ({ ...i, qty: cart[i.menu_id], sub: cart[i.menu_id] * i.price })), [cart, stock]);
  const total = lines.reduce((s, l) => s + l.sub, 0);
  const cups = lines.reduce((s, l) => s + l.qty, 0);
  const change = pay === "cash" ? Math.max(0, Number(cash || 0) - total) : 0;

  const add = (i, d = 1) => {
    const q = (cart[i.menu_id] || 0) + d;
    if (q > i.remaining) return toast.warning(`${i.name}: only ${i.remaining} left`);
    setCart({ ...cart, [i.menu_id]: Math.max(0, q) });
  };
  const checkout = async () => {
    if (!lines.length) return;
    if (pay === "cash" && Number(cash) < total) return toast.error("Cash received is less than total");
    try {
      const { data } = await api.post("/sales", { rider_id: riderId, date: today(), customer_name: cust.name, customer_phone: cust.phone, items: lines.map((l) => ({ menu_id: l.menu_id, qty: l.qty })), payment_method: pay, cash_received: Number(cash || total) });
      setReceipt(data); setCart({}); setCash(""); loadStock(); toast.success(`Sale ${data.receipt_no} saved`);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const openEod = () => api.get("/sales/eod", { params: { rider_id: riderId, date: today() } }).then((r) => setEod(r.data));
  const openHist = () => api.get("/sales", { params: { start: histDate, end: histDate, rider_id: riderId } }).then((r) => setHist(r.data));
  useEffect(() => { if (hist) openHist(); }, [histDate]); // eslint-disable-line

  if (!posUnlocked) return <PinGate />;
  const rider = isRider ? user : riders.find((r) => r.id === riderId);
  const receiptText = receipt && `*SI FOUR AM — RECEIPT*\n🧾 ${receipt.receipt_no}\n📅 ${receipt.date}\n👤 ${receipt.customer_name || "Customer"}\n🛵 ${receipt.rider_name}\n----------------------------------\n` +
    receipt.items.map((i) => `${i.name} x${i.qty} = ${fmtRp(i.subtotal)}`).join("\n") + `\n----------------------------------\n💰 Total: ${fmtRp(receipt.total)}\n${receipt.payment_method === "cash" ? `💵 Cash: ${fmtRp(receipt.cash_received)}\n🔁 Change: ${fmtRp(receipt.change)}` : "💳 QRIS"}\n\nThank you! ☕`;
  const eodText = eod && `*SI FOUR AM — END OF DAY*\n🛵 ${rider?.name}\n📅 ${eod.date}\n----------------------------------\n` +
    eod.rows.map((r) => `${r.name}: awal ${r.initial} | sisa ${r.remaining} | cash ${r.cash_qty} | qris ${r.qris_qty}`).join("\n") +
    `\n----------------------------------\n☕ Total sold: ${eod.total_cups} cups\n💰 Cash: ${fmtRp(eod.total_cash)}\n💳 QRIS: ${fmtRp(eod.total_qris)}\n🚀 Total deposit: ${fmtRp(eod.total)}`;

  return (
    <div data-testid="pos-page">
      <PageHeader eyebrow="Point of Sale" title={t("pos")}>
        <button data-testid="eod-button" onClick={openEod} disabled={!riderId} className="btn-ghost h-10"><ReceiptText className="w-4 h-4" />{t("endDay")}</button>
        <button data-testid="history-button" onClick={openHist} disabled={!riderId} className="btn-ghost h-10"><History className="w-4 h-4" />{t("history")}</button>
      </PageHeader>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Attendance rider={rider} riders={riders} riderId={riderId} setRiderId={setRiderId} isRider={isRider} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          {riderId && !stock.has_stock && <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-500" data-testid="no-stock-warning">No initial stock set for today. Ask Bar Team to save Rider Stock first.</div>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="product-grid">
            {stock.items.map((i) => (
              <button key={i.menu_id} data-testid={`pos-product-${i.menu_id}`} onClick={() => add(i)} disabled={i.remaining <= 0}
                className={`bento p-0 text-left overflow-hidden group active:scale-[0.98] transition-transform disabled:opacity-40 ${cart[i.menu_id] ? "gold" : ""}`}>
                <div className="h-20 bg-muted relative">{i.photo && <img src={i.photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${i.remaining <= 3 ? "bg-red-500 text-white" : "bg-black/60 text-white"}`}>{i.remaining} left</span>
                  {cart[i.menu_id] && <span className="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{cart[i.menu_id]}</span>}</div>
                <div className="p-3"><p className="text-xs font-heading font-bold leading-tight">{i.name}</p><p className="text-xs text-primary num font-semibold mt-1">{fmtRp(i.price)}</p>
                  {i.remaining > 0 && i.remaining <= 3 && <p className="text-[10px] text-red-500 font-semibold">{t("lowStock")}</p>}</div>
              </button>))}
          </div>
          <Bento gold className="fade-up" testId="cart-panel">
            <p className="eyebrow mb-3">Fast Checkout</p>
            {lines.length ? lines.map((l) => (
              <div key={l.menu_id} className="flex items-center justify-between py-2 border-b border-border/50 text-sm">
                <span className="font-medium flex-1">{l.name}</span>
                <div className="flex items-center gap-2"><button data-testid={`cart-minus-${l.menu_id}`} onClick={() => add(l, -1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                  <span className="num w-6 text-center font-bold">{l.qty}</span><button data-testid={`cart-plus-${l.menu_id}`} onClick={() => add(l, 1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Plus className="w-3 h-3" /></button></div>
                <span className="num w-24 text-right">{fmtRp(l.sub)}</span>
              </div>)) : <Empty text="Tap products to add them" />}
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <input data-testid="customer-name-input" className="field" placeholder={t("customer")} value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} />
              <input data-testid="customer-phone-input" className="field" placeholder="WhatsApp 08xx" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
              <div className="flex gap-2">{["cash", "qris"].map((p) => <button key={p} data-testid={`pay-${p}`} onClick={() => setPay(p)} className={`flex-1 h-10 rounded-full text-xs font-bold uppercase ${pay === p ? "bg-primary text-white" : "bg-muted"}`}>{p}</button>)}</div>
              {pay === "cash" && <input data-testid="cash-received-input" type="number" className="field num" placeholder={t("cashReceived")} value={cash} onChange={(e) => setCash(e.target.value)} />}
            </div>
            <div className="flex items-end justify-between mt-5">
              <div><p className="eyebrow">{t("total")} · {cups} cups</p><p data-testid="cart-total" className="text-3xl font-bold num font-heading">{fmtRp(total)}</p>
                {pay === "cash" && cash && <p data-testid="cart-change" className="text-sm text-emerald-500 num">{t("change")}: {fmtRp(change)}</p>}</div>
              <div className="flex gap-2"><button data-testid="cart-clear" onClick={() => setCart({})} className="btn-ghost h-11 w-11 p-0"><Trash2 className="w-4 h-4" /></button>
                <button data-testid="checkout-button" onClick={checkout} disabled={!lines.length} className="btn-primary">{t("checkout")}</button></div>
            </div>
          </Bento>
        </div>
      </div>

      <ReceiptModal open={!!receipt} onClose={() => setReceipt(null)} title="Payment Receipt" waText={receiptText} waPhone={receipt?.customer_phone} filename={`${receipt?.receipt_no}.png`} autoShot={false} testId="sale-receipt">
        {receipt && <>
          <RLine l="No" r={receipt.receipt_no} /><RLine l="Date" r={receipt.date} /><RLine l="Rider" r={receipt.rider_name} /><RLine l="Customer" r={receipt.customer_name || "-"} />
          <div className="border-t border-dashed border-gray-300 my-2" />
          {receipt.items.map((i) => <RLine key={i.menu_id} l={`${i.name} x${i.qty}`} r={fmtRp(i.subtotal)} />)}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <RLine bold l="TOTAL" r={fmtRp(receipt.total)} /><RLine l={receipt.payment_method.toUpperCase()} r={fmtRp(receipt.cash_received)} />{receipt.payment_method === "cash" && <RLine l="Change" r={fmtRp(receipt.change)} />}
          {receipt.customer_phone && <p className="text-[10px] text-gray-400 mt-2 text-center">wa.me/{waNumber(receipt.customer_phone)}</p>}
        </>}
      </ReceiptModal>

      <ReceiptModal open={!!eod} onClose={() => setEod(null)} title="End of Day Report" waText={eodText} filename={`EOD-${rider?.name}-${today()}.png`} autoShot={false} testId="eod-receipt">
        {eod && <>
          <RLine l="Rider" r={rider?.name} /><RLine l="Date" r={eod.date} /><RLine l="Transactions" r={eod.transactions} />
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="grid grid-cols-5 text-[10px] font-bold text-gray-500 pb-1"><span className="col-span-2">Menu</span><span className="text-right">Awal</span><span className="text-right">Sisa</span><span className="text-right">Sold</span></div>
          {eod.rows.map((r) => <div key={r.menu_id} className="grid grid-cols-5 text-[11px] py-0.5"><span className="col-span-2 truncate">{r.name}</span><span className="text-right num">{r.initial}</span><span className="text-right num">{r.remaining}</span><span className="text-right num">{r.sold}</span></div>)}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <RLine l="Total sold (cups)" r={eod.total_cups} /><RLine l="Cash sales" r={fmtRp(eod.total_cash)} /><RLine l="QRIS sales" r={fmtRp(eod.total_qris)} /><RLine bold l="TOTAL DEPOSIT" r={fmtRp(eod.total)} />
        </>}
      </ReceiptModal>

      {hist && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setHist(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bento gold w-full max-w-lg max-h-[80vh] overflow-y-auto" data-testid="sales-history-modal">
            <div className="flex items-center justify-between mb-4"><p className="font-heading font-bold">{t("history")}</p><input data-testid="history-date-input" type="date" className="field h-9 w-40" value={histDate} onChange={(e) => setHistDate(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="rounded-xl bg-muted p-3"><p className="eyebrow">Trx</p><p className="font-bold num">{hist.length}</p></div>
              <div className="rounded-xl bg-muted p-3"><p className="eyebrow">Revenue</p><p className="font-bold num text-xs">{fmtRp(hist.reduce((s, h) => s + h.total, 0))}</p></div>
              <div className="rounded-xl bg-muted p-3"><p className="eyebrow">Est. Profit</p><p className="font-bold num text-xs text-emerald-500">{fmtRp(hist.reduce((s, h) => s + h.items.reduce((a, i) => a + i.subtotal - (stock.items.find((x) => x.menu_id === i.menu_id)?.cost || 3000) * i.qty, 0), 0))}</p></div>
            </div>
            {hist.map((h) => <div key={h.id} className="flex justify-between text-sm py-2 border-b border-border/50"><span><span className="num text-xs text-muted-foreground">{h.receipt_no}</span> · {h.customer_name || "—"} · {h.cups} cups</span><span className="num font-semibold">{fmtRp(h.total)} <span className="text-[10px] uppercase text-muted-foreground">{h.payment_method}</span></span></div>)}
            {!hist.length && <Empty text={t("noData")} />}
          </div>
        </div>)}
    </div>
  );
}
