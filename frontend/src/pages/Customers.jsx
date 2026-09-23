import { useEffect, useState } from "react";
import { Gift, Search } from "lucide-react";
import { api } from "../lib/api";
import { fmtRp, openWA } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { PageHeader, Bento, Stat, Empty } from "../components/common";

export default function Customers() {
  const { t, lang } = useT();
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => { api.get("/customers").then((r) => setList(r.data)); }, []);
  const rows = list.filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase()) || (c.phone || "").includes(q));
  const voucher = (c) => openWA(lang === "id"
    ? `Halo ${c.name || "Kak"} ☕\nTerima kasih sudah jadi pelanggan setia *SI FOUR AM*! Kamu punya *${c.points} poin* loyalti.\n🎁 Tunjukkan pesan ini ke rider kami untuk *voucher potongan Rp ${Math.min(c.points, 10) * 1000}* pada pembelian berikutnya.\nSampai jumpa! 🚀`
    : `Hi ${c.name || "there"} ☕\nThank you for being a loyal *SI FOUR AM* customer! You have *${c.points} loyalty points*.\n🎁 Show this message to our rider for a *Rp ${Math.min(c.points, 10) * 1000} voucher* on your next order.\nSee you! 🚀`, c.phone);
  return (
    <div data-testid="customers-page">
      <PageHeader eyebrow="Loyalty" title={t("customers")}>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" /><input data-testid="customer-search" className="field pl-9 w-56" placeholder="Nama / 08xx" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </PageHeader>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat gold label={t("customers")} value={list.length} testId="cust-count" className="p-4" />
        <Stat label="Poin" value={list.reduce((s, c) => s + (c.points || 0), 0)} testId="cust-points" className="p-4" />
        <Stat label={t("revenue")} value={fmtRp(list.reduce((s, c) => s + (c.total_spent || 0), 0))} testId="cust-spent" className="p-4" />
      </div>
      <Bento testId="customers-table">
        <table className="table-x"><thead><tr><th>{t("customer")}</th><th>Poin</th><th className="hide-xs">Visit</th><th className="hide-sm">{t("total")}</th><th className="hide-sm">{t("date")}</th><th /></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.id || c.phone} data-testid={`customer-row-${c.id}`}><td><p className="font-semibold">{c.name || "—"}</p><p className="text-xs text-muted-foreground num">{c.phone}</p></td><td className="num font-bold text-primary">{c.points || 0}</td><td className="num hide-xs">{c.visits || 0}</td><td className="num hide-sm">{fmtRp(c.total_spent)}</td><td className="num text-xs hide-sm">{c.last_visit}</td>
            <td className="text-right">{c.phone && <button data-testid={`voucher-${c.id}`} onClick={() => voucher(c)} className="btn-wa h-8 px-3 text-xs"><Gift className="w-3 h-3" />Voucher</button>}</td></tr>)}</tbody></table>
        {!rows.length && <Empty text={t("noData")} />}
      </Bento>
    </div>
  );
}
