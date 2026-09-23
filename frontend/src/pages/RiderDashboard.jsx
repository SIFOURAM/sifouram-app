import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Trophy, Calendar, MapPin, Coffee } from "lucide-react";
import { api } from "../lib/api";
import { fmtRp, fmtDate, initials } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento, Stat, DateFilter, Select, Empty } from "../components/common";

const COLORS = ["#FF6B00", "#D4AF37", "#f59e0b", "#fb923c", "#eab308", "#a16207", "#f97316", "#fbbf24", "#78350f"];
const tip = { contentStyle: { borderRadius: 12, border: "1px solid #333", background: "#111", color: "#fff", fontSize: 12 } };

export function TierProgress({ s, count = 1 }) {
  const { t } = useT();
  const nt = s.next_tier;
  return (
    <div data-testid="tier-progress">
      <div className="flex items-center justify-between mb-2"><span className="flex items-center gap-2 text-sm font-semibold"><Trophy className="w-4 h-4 text-primary" />{s.tier === "None" ? "No tier yet" : s.tier}<span className="text-xs text-muted-foreground">({Math.round(s.incentive_pct * 100)}%)</span></span>
        {nt && <span className="text-xs text-muted-foreground">{t("nextTier")}: <b className="text-foreground">{nt.name}</b> · {fmtRp(nt.threshold * count)}</span>}</div>
      <div className="h-3 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-[#D4AF37] transition-all duration-700" style={{ width: `${Math.min(100, nt ? (s.gross / (nt.threshold * count)) * 100 : 100)}%` }} /></div>
      {nt && <p className="text-xs text-muted-foreground mt-2">{fmtRp(Math.max(0, nt.threshold * count - s.gross))} more to reach {nt.name}{nt.min_days ? ` · min ${nt.min_days} attendance days` : ""}</p>}
    </div>
  );
}

export default function RiderDashboard() {
  const { t } = useT();
  const { user } = useAuth();
  const isRider = user.role === "rider";
  const [riders, setRiders] = useState([]);
  const [riderId, setRiderId] = useState(isRider ? user.id : "all");
  const [range, setRange] = useState(null);
  const [sum, setSum] = useState(null);
  const [sal, setSal] = useState(null);
  const [stockHist, setStockHist] = useState([]);
  const [sales, setSales] = useState([]);

  useEffect(() => { if (!isRider) api.get("/users", { params: { role: "rider" } }).then((r) => setRiders(r.data)); }, [isRider]);
  useEffect(() => {
    if (!range) return;
    const p = { ...range, ...(riderId !== "all" ? { rider_id: riderId } : {}) };
    api.get("/dashboard/summary", { params: p }).then((r) => setSum(r.data));
    api.get("/salary", { params: p }).then((r) => setSal(r.data));
    api.get("/rider-stock/history", { params: p }).then((r) => setStockHist(r.data));
    api.get("/sales", { params: p }).then((r) => setSales(r.data));
  }, [range, riderId]);

  const rider = isRider ? user : riders.find((r) => r.id === riderId);
  const agg = sal && (riderId !== "all" ? sal.riders[0] : (() => {
    const g = sal.riders.reduce((s, r) => s + r.gross, 0); const n = sal.riders.length || 1;
    const nearest = sal.riders.map((r) => r.next_tier).filter(Boolean).sort((a, b) => a.threshold - b.threshold)[0];
    return { gross: g, cups: sal.riders.reduce((s, r) => s + r.cups, 0), attendance_days: sal.riders.reduce((s, r) => s + r.attendance_days, 0), incentive: sal.riders.reduce((s, r) => s + r.incentive, 0), tier: "Team", incentive_pct: 0, next_tier: nearest, count: n };
  })());

  return (
    <div data-testid="rider-dashboard">
      <PageHeader eyebrow={isRider ? "My performance" : "Riders"} title={t("riderDash")}>
        {!isRider && <Select testId="rider-dash-select" value={riderId} onChange={setRiderId} className="w-48" options={[{ value: "all", label: t("allRiders") }, ...riders.map((r) => ({ value: r.id, label: r.name }))]} />}
        <DateFilter onChange={setRange} />
      </PageHeader>
      {sum && agg && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Bento gold className="col-span-2 lg:col-span-1 fade-up flex flex-col items-center text-center" testId="rider-profile-card">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/15 text-primary font-bold text-2xl flex items-center justify-center mb-3 gold">{rider?.photo ? <img src={rider.photo} alt="" className="w-full h-full object-cover" /> : rider ? initials(rider.name) : "ALL"}</div>
            <p className="font-heading font-bold text-lg">{rider?.name || t("allRiders")}</p>
            {rider && <><p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" />{t("joined")} {rider.joined_at ? fmtDate(rider.joined_at) : "-"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{rider.placement || "-"}</p></>}
            <div className="mt-4 w-full rounded-xl bg-muted p-3"><p className="eyebrow">{t("incentive")}</p><p className="num font-bold text-primary">{fmtRp(agg.incentive)}</p></div>
          </Bento>
          <Stat label={t("gross")} value={fmtRp(agg.gross)} icon={Coffee} testId="rider-stat-gross" />
          <Stat label={t("cupsSold")} value={sum.cups} sub={`${sum.transactions} transactions`} testId="rider-stat-cups" />
          <Stat label={t("attendance")} value={agg.attendance_days} sub={`${sum.days} sales days`} testId="rider-stat-days" />

          <Bento className="col-span-2 lg:col-span-4 fade-up" testId="tier-card"><p className="eyebrow mb-4">Incentive category target{riderId === "all" ? ` (nearest × ${agg.count} riders)` : ""}</p><TierProgress s={agg} count={riderId === "all" ? agg.count : 1} /></Bento>

          <Bento className="col-span-2 fade-up" testId="chart-daily">
            <p className="eyebrow mb-4">Daily sales</p>
            {sum.by_date.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={sum.by_date.map((d) => ({ d: d.date.slice(5), v: d.cash + d.qris }))}><XAxis dataKey="d" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis hide /><Tooltip {...tip} formatter={(v) => fmtRp(v)} /><Bar dataKey="v" fill="#FF6B00" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty text={t("noData")} />}
          </Bento>
          <Bento className="col-span-2 fade-up" testId="chart-best-selling">
            <p className="eyebrow mb-4">{t("bestSelling")}</p>
            {sum.by_menu.length ? <div className="flex items-center gap-4"><ResponsiveContainer width="50%" height={200}><PieChart><Pie data={sum.by_menu} dataKey="qty" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>{sum.by_menu.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} /></PieChart></ResponsiveContainer>
              <ul className="text-xs space-y-1 flex-1">{sum.by_menu.slice(0, 6).map((m, i) => <li key={m.name} className="flex justify-between"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />{m.name}</span><b className="num">{m.qty}</b></li>)}</ul></div> : <Empty text={t("noData")} />}
          </Bento>

          <Bento className="col-span-2 fade-up" testId="stock-photo-history">
            <p className="eyebrow mb-4">Initial-stock photo evidence</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">{stockHist.filter((h) => h.photo).slice(0, 8).map((h) => <div key={h.id} className="relative rounded-xl overflow-hidden aspect-square"><img src={h.photo} alt="" className="w-full h-full object-cover" /><span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 rounded">{h.date} · {h.total}</span></div>)}</div>
            {!stockHist.filter((h) => h.photo).length && <Empty text={t("noData")} />}
          </Bento>
          <Bento className="col-span-2 fade-up max-h-80 overflow-y-auto" testId="rider-sales-history">
            <p className="eyebrow mb-4">{t("history")}</p>
            {sales.slice(0, 30).map((s) => <div key={s.id} className="flex justify-between text-sm py-1.5 border-b border-border/40"><span className="text-muted-foreground num text-xs">{s.date} · {s.receipt_no}</span><span>{s.cups} cups</span><b className="num">{fmtRp(s.total)}</b></div>)}
            {!sales.length && <Empty text={t("noData")} />}
          </Bento>
        </div>
      )}
    </div>
  );
}
