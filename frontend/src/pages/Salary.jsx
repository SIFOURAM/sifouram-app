import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { fmtRp, initials } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { PageHeader, Bento, DateFilter, Empty } from "../components/common";
import { TierProgress } from "./RiderDashboard";

export default function Salary() {
  const { t } = useT();
  const nav = useNavigate();
  const [range, setRange] = useState(null);
  const [d, setD] = useState(null);
  useEffect(() => { if (range) api.get("/salary", { params: range }).then((r) => setD(r.data)); }, [range]);
  return (
    <div data-testid="salary-page">
      <PageHeader eyebrow="Trader income" title={t("salary")}><DateFilter onChange={setRange} /></PageHeader>
      {d && (<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {d.tiers.map((tr, i) => <Bento key={tr.name} gold={i === 3} className="fade-up" testId={`tier-${tr.name.toLowerCase()}`}><p className="eyebrow">{tr.name}</p><p className="font-heading font-bold text-xl mt-1">{Math.round(tr.pct * 100)}%</p><p className="text-xs text-muted-foreground num">≥ {fmtRp(tr.threshold)}{tr.min_days ? ` · ${tr.min_days}+ days` : ""}</p></Bento>)}
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t("dailyAllowance")} Rp 20.000 / {t("attendance").toLowerCase()}. {t("period")}: 16 → 15.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {d.riders.map((r) => (
            <Bento key={r.rider_id} className="fade-up" testId={`salary-card-${r.rider_id}`}>
              <div className="flex items-center gap-3 mb-4"><div className="w-11 h-11 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center overflow-hidden">{r.photo ? <img src={r.photo} alt="" className="w-full h-full object-cover" /> : initials(r.rider_name)}</div>
                <div className="flex-1"><button data-testid={`salary-rider-link-${r.rider_id}`} onClick={() => nav(`/rider-dashboard?rider=${r.rider_id}`)} className="font-heading font-bold text-primary hover:underline text-left">{r.rider_name} →</button><p className="text-xs text-muted-foreground">{r.cups} cups · {r.attendance_days} {t("attendance").toLowerCase()}</p></div>
                <div className="text-right"><p className="eyebrow">{t("totalIncome")}</p><p className="num font-bold text-primary">{fmtRp(r.total_income)}</p></div></div>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="rounded-xl bg-muted p-2"><p className="eyebrow">Gross</p><p className="num text-xs font-bold">{fmtRp(r.gross)}</p></div>
                <div className="rounded-xl bg-muted p-2"><p className="eyebrow">{t("dailyAllowance")}</p><p className="num text-xs font-bold">{fmtRp(r.allowance)}</p><p className="text-[10px] text-muted-foreground">{r.attendance_days} {t("attendance").toLowerCase()}</p></div>
                <div className="rounded-xl bg-muted p-2"><p className="eyebrow">Incentive</p><p className="num text-xs font-bold">{fmtRp(r.incentive)}</p></div>
              </div>
              <TierProgress s={r} />
            </Bento>))}
          {!d.riders.length && <Empty text={t("noData")} />}
        </div>
      </>)}
    </div>
  );
}
