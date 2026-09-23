import { useState } from "react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";
import { initials, roleLabel, compressImage, waNumber } from "../lib/helpers";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader, Bento, Field } from "../components/common";

export default function Profile() {
  const { t } = useT();
  const { user, setUser, logout } = useAuth();
  const [f, setF] = useState({ name: user.name, whatsapp: user.whatsapp, email: user.email, joined_at: user.joined_at || "", placement: user.placement || "" });
  const [pw, setPw] = useState({ old_password: "", new_password: "" });
  const [pin, setPin] = useState({ password: "", new_pin: "" });

  const saveProfile = async (e) => { e.preventDefault(); try { const { data } = await api.put("/auth/profile", f); setUser(data); toast.success("Profile saved"); } catch (err) { toast.error(errMsg(err)); } };
  const savePw = async (e) => { e.preventDefault(); try { await api.put("/auth/password", pw); toast.success("Password changed"); setPw({ old_password: "", new_password: "" }); } catch (err) { toast.error(errMsg(err)); } };
  const savePin = async (e) => { e.preventDefault(); try { await api.put("/auth/pin", pin); toast.success("PIN changed"); setPin({ password: "", new_pin: "" }); } catch (err) { toast.error(errMsg(err)); } };
  const photo = async (e) => { const file = e.target.files?.[0]; if (!file) return; const p = await compressImage(file, 400); const { data } = await api.put("/auth/profile", { photo: p }); setUser(data); toast.success("Photo updated"); };

  return (
    <div data-testid="profile-page">
      <PageHeader eyebrow={roleLabel(user.role)} title={t("profile")}><button data-testid="profile-logout-button" onClick={logout} className="btn-ghost h-10">{t("logout")}</button></PageHeader>
      <div className="grid lg:grid-cols-3 gap-6">
        <Bento gold className="fade-up text-center" testId="profile-card">
          <label className="relative inline-block cursor-pointer">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-primary/15 text-primary text-3xl font-bold flex items-center justify-center mx-auto">{user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : initials(user.name)}</div>
            <input data-testid="profile-photo-input" type="file" accept="image/*" className="hidden" onChange={photo} />
            <span className="absolute bottom-0 right-0 text-[10px] bg-primary text-white rounded-full px-2 py-0.5">edit</span>
          </label>
          <p className="font-heading font-bold text-xl mt-4">{user.name}</p><p className="text-sm text-muted-foreground">@{user.username}</p>
          <span className="inline-block mt-2 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-3 py-1">{roleLabel(user.role)}</span>
          <div className="text-left text-sm mt-6 space-y-2">
            <p className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="truncate ml-2">{user.email}</span></p>
            <p className="flex justify-between"><span className="text-muted-foreground">WhatsApp</span><a className="text-primary" href={`https://wa.me/${waNumber(user.whatsapp)}`} target="_blank" rel="noreferrer">{user.whatsapp}</a></p>
          </div>
        </Bento>
        <Bento className="fade-up" testId="profile-form">
          <p className="eyebrow mb-4">Contact information</p>
          <form onSubmit={saveProfile} className="space-y-3">
            <Field label="Name"><input data-testid="profile-name-input" className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Email"><input data-testid="profile-email-input" className="field" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="WhatsApp"><input data-testid="profile-wa-input" className="field" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>
            {user.role === "rider" && <><Field label="Joined date"><input type="date" className="field" value={f.joined_at} onChange={(e) => setF({ ...f, joined_at: e.target.value })} /></Field>
              <Field label="Placement"><input className="field" value={f.placement} onChange={(e) => setF({ ...f, placement: e.target.value })} /></Field></>}
            <button data-testid="profile-save-button" className="btn-primary w-full">{t("save")}</button>
          </form>
        </Bento>
        <div className="space-y-6">
          <Bento className="fade-up" testId="password-form"><p className="eyebrow mb-4">Change password</p>
            <form onSubmit={savePw} className="space-y-3">
              <input data-testid="pw-old-input" type="password" className="field" placeholder="Current password" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} required />
              <input data-testid="pw-new-input" type="password" className="field" placeholder="New password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required minLength={6} />
              <button data-testid="pw-save-button" className="btn-ghost w-full">Change Password</button></form></Bento>
          <Bento className="fade-up" testId="pin-form"><p className="eyebrow mb-4">Change PIN</p>
            <form onSubmit={savePin} className="space-y-3">
              <input data-testid="pin-pw-input" type="password" className="field" placeholder="Account password" value={pin.password} onChange={(e) => setPin({ ...pin, password: e.target.value })} required />
              <input data-testid="pin-new-input" type="password" inputMode="numeric" className="field" placeholder="New PIN (4–6 digits)" value={pin.new_pin} onChange={(e) => setPin({ ...pin, new_pin: e.target.value })} required minLength={4} maxLength={6} />
              <button data-testid="pin-save-button" className="btn-ghost w-full">Change PIN</button></form></Bento>
        </div>
      </div>
    </div>
  );
}
