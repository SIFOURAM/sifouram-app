import { toast } from "sonner";
import { Moon, Sun, Globe, Bell, MapPin, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento } from "../components/common";
import { NAV, MORE } from "../components/Layout";

const Row = ({ icon: Icon, title, sub, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0 gap-4">
    <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-4 h-4" /></div><div><p className="text-sm font-semibold">{title}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div></div>
    {children}
  </div>
);
const Toggle = ({ on, onChange, testId }) => <button data-testid={testId} onClick={() => onChange(!on)} className={`w-12 h-7 rounded-full transition-colors relative ${on ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} /></button>;

export default function Settings() {
  const { t, lang, setLang } = useT();
  const { user, setUser, theme, setTheme } = useAuth();
  const s = user.settings || {};
  const save = async (patch) => { const { data } = await api.put("/settings", patch); setUser({ ...user, settings: data }); toast.success("Settings saved"); };
  const perms = [...(NAV[user.role] || []), ...(MORE[user.role] || [])].map((i) => t(i.key));

  return (
    <div data-testid="settings-page">
      <PageHeader eyebrow="SI FOUR AM" title={t("settings")} />
      <div className="grid lg:grid-cols-2 gap-6">
        <Bento gold className="fade-up" testId="settings-appearance">
          <p className="eyebrow mb-2">Appearance & language</p>
          <Row icon={theme === "dark" ? Moon : Sun} title={theme === "dark" ? t("darkMode") : t("lightMode")} sub="Black / white backgrounds">
            <div className="flex gap-1">{["dark", "light"].map((k) => <button key={k} data-testid={`theme-${k}`} onClick={() => { setTheme(k); save({ theme: k }); }} className={`h-9 px-4 rounded-full text-xs font-semibold capitalize ${theme === k ? "bg-primary text-white" : "bg-muted"}`}>{k}</button>)}</div></Row>
          <Row icon={Globe} title={t("language")} sub="English (primary) · Bahasa Indonesia">
            <div className="flex gap-1">{[["en", "English"], ["id", "Indonesia"]].map(([k, l]) => <button key={k} data-testid={`lang-${k}`} onClick={() => { setLang(k); save({ language: k }); }} className={`h-9 px-4 rounded-full text-xs font-semibold ${lang === k ? "bg-primary text-white" : "bg-muted"}`}>{l}</button>)}</div></Row>
          <Row icon={Bell} title={t("notifications")} sub="Low stock, deposits, incentives"><Toggle testId="notifications-toggle" on={s.notifications !== false} onChange={(v) => save({ notifications: v })} /></Row>
          {user.role === "rider" && <Row icon={MapPin} title={t("gps")} sub={t("whileUsing")}>
            <select data-testid="gps-mode-select" className="field w-44 h-9" value={s.gps_mode || "while_using"} onChange={(e) => save({ gps_mode: e.target.value })}><option value="while_using">{t("whileUsing")}</option><option value="off">Off</option></select></Row>}
        </Bento>
        <Bento className="fade-up" testId="settings-permissions">
          <p className="eyebrow mb-2">Permissions · {user.role}</p>
          <Row icon={ShieldCheck} title="Accessible modules" sub={`${perms.length} modules enabled for your role`} />
          <div className="flex flex-wrap gap-2 mt-3">{perms.map((p) => <span key={p} className="text-xs font-semibold rounded-full bg-muted px-3 py-1">{p}</span>)}</div>
          <p className="text-xs text-muted-foreground mt-6 leading-relaxed">Superadmin: full access. Bar Team: no financial report, cannot edit partners/menus. Rider: POS, Rider Dashboard, Settings only.</p>
        </Bento>
      </div>
    </div>
  );
}
