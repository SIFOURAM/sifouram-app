import { useState } from "react";
import { toast } from "sonner";
import { Coffee, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useT } from "../lib/i18n";
import { errMsg } from "../lib/api";

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useT();
  const [f, setF] = useState({ identifier: "", password: "", remember: true });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { const u = await login(f.identifier, f.password, f.remember); toast.success(`${t("welcome")}, ${u.name}`); }
    catch (err) { toast.error(errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      <div className="hidden lg:flex relative overflow-hidden bg-black text-white p-14 flex-col justify-between">
        <img src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1400&q=80" alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="relative flex items-center gap-3"><img src="/logo.png" alt="SI FOUR AM" className="w-11 h-11 rounded-2xl object-contain" /><span className="font-heading font-bold text-lg">SI FOUR AM</span></div>
        <div className="relative">
          <p className="eyebrow text-primary mb-4">Coffee Cart Operating System</p>
          <h1 className="text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05]">Every cup,<br />every rider,<br /><span className="text-primary">every rupiah.</span></h1>
          <p className="mt-6 text-white/60 max-w-md">POS, inventory, deposits, incentives and live GPS — unified in one real-time system.</p>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} SI FOUR AM</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm fade-up">
          <div className="flex justify-between items-center mb-10">
            <div className="lg:hidden flex items-center gap-2"><img src="/logo.png" alt="SI FOUR AM" className="w-9 h-9 rounded-xl object-contain" /><span className="font-heading font-bold">SI FOUR AM</span></div>
            <button type="button" data-testid="login-lang-toggle" onClick={() => setLang(lang === "en" ? "id" : "en")} className="ml-auto text-xs font-semibold px-3 h-8 rounded-full border border-border">{lang === "en" ? "EN → ID" : "ID → EN"}</button>
          </div>
          <Coffee className="w-8 h-8 text-primary mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">{t("login")}</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-8">{t("welcome")}.</p>
          <label className="block mb-4"><span className="eyebrow block mb-1.5">{t("username")}</span>
            <input data-testid="login-identifier-input" className="field h-12" value={f.identifier} onChange={(e) => setF({ ...f, identifier: e.target.value })} autoComplete="username" required /></label>
          <label className="block mb-4"><span className="eyebrow block mb-1.5">{t("password")}</span>
            <div className="relative">
              <input data-testid="login-password-input" type={show ? "text" : "password"} className="field h-12 pr-11" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-muted-foreground">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div></label>
          <label className="flex items-center gap-2 text-sm mb-8 cursor-pointer">
            <input data-testid="login-remember-checkbox" type="checkbox" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })} className="accent-[#FF6B00] w-4 h-4" />{t("remember")}</label>
          <button data-testid="login-submit-button" disabled={busy} className="btn-primary w-full h-12">{busy ? "..." : t("login")}</button>
        </form>
      </div>
    </div>
  );
}
