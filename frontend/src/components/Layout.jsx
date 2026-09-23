import { useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Boxes, Layers, ShoppingCart, Bike, Wallet, FileText, UserCircle, HandCoins, LineChart, BadgeDollarSign, Settings as Cog, MoreHorizontal, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useT } from "../lib/i18n";
import { api } from "../lib/api";
import { initials } from "../lib/helpers";

export const NAV = {
  superadmin: [
    { to: "/", key: "dashboard", icon: LayoutDashboard },
    { to: "/rider-stock", key: "riderStock", icon: Bike },
    { to: "/deposit", key: "deposit", icon: Wallet },
    { to: "/handover", key: "handover", icon: HandCoins },
    { to: "/more", key: "more", icon: MoreHorizontal },
  ],
  barteam: [
    { to: "/", key: "main", icon: LayoutDashboard },
    { to: "/inventory", key: "inventory", icon: Boxes },
    { to: "/menu-stock", key: "stock", icon: Layers },
    { to: "/deposit", key: "deposit", icon: Wallet },
    { to: "/more", key: "more", icon: MoreHorizontal },
  ],
  rider: [
    { to: "/pos", key: "pos", icon: ShoppingCart },
    { to: "/rider-dashboard", key: "riderDash", icon: Bike },
    { to: "/settings", key: "settings", icon: Cog },
  ],
};

export const MORE = {
  superadmin: [
    { to: "/inventory", key: "inventory", icon: Boxes }, { to: "/menu-stock", key: "menuStock", icon: Layers }, { to: "/pos", key: "pos", icon: ShoppingCart },
    { to: "/invoice", key: "invoice", icon: FileText }, { to: "/rider-dashboard", key: "riderDash", icon: Bike }, { to: "/finance", key: "finance", icon: LineChart },
    { to: "/salary", key: "salary", icon: BadgeDollarSign }, { to: "/profile", key: "profile", icon: UserCircle }, { to: "/settings", key: "settings", icon: Cog },
  ],
  barteam: [
    { to: "/rider-stock", key: "riderStock", icon: Bike }, { to: "/rider-dashboard", key: "riderDash", icon: Bike }, { to: "/pos", key: "pos", icon: ShoppingCart },
    { to: "/salary", key: "salary", icon: BadgeDollarSign }, { to: "/profile", key: "profile", icon: UserCircle }, { to: "/settings", key: "settings", icon: Cog },
  ],
  rider: [{ to: "/profile", key: "profile", icon: UserCircle }],
};

function useRiderGps(user) {
  const last = useRef(0);
  useEffect(() => {
    if (!user || user.role !== "rider" || user.settings?.gps_mode === "off" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((p) => {
      if (Date.now() - last.current < 30000) return;
      last.current = Date.now();
      api.post("/gps", { lat: p.coords.latitude, lng: p.coords.longitude }).catch(() => {});
    }, () => {}, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(id);
  }, [user]);
}

export default function Layout() {
  const { user, logout, theme, setTheme } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  useRiderGps(user);
  const items = NAV[user.role] || [];
  const roleLabel = { superadmin: "Superadmin", barteam: "Bar Team", rider: "Rider" }[user.role];

  const Avatar = ({ size = "w-10 h-10" }) => (
    <button data-testid="nav-profile-button" onClick={() => nav("/profile")} className={`${size} rounded-full overflow-hidden bg-primary/15 text-primary font-bold flex items-center justify-center gold shrink-0`}>
      {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : initials(user.name)}
    </button>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-border/70 p-6 sticky top-0 h-screen" data-testid="sidebar">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black font-heading">S4</div>
          <div><p className="font-heading font-bold leading-tight">SI FOUR AM</p><p className="eyebrow">{roleLabel}</p></div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} data-testid={`nav-${i.key}`}
              className={({ isActive }) => `flex items-center gap-3 px-4 h-11 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <i.icon className="w-4 h-4" />{t(i.key)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 pt-6 border-t border-border/70">
          <Avatar />
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{user.name}</p><p className="text-xs text-muted-foreground truncate">@{user.username}</p></div>
          <button data-testid="theme-toggle-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-muted">{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
          <button data-testid="logout-button" onClick={logout} className="p-2 rounded-lg hover:bg-muted"><LogOut className="w-4 h-4" /></button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between px-4 h-16 border-b border-border/70 sticky top-0 bg-background/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm font-heading">S4</div><span className="font-heading font-bold">SI FOUR AM</span></div>
          <div className="flex items-center gap-2">
            <button data-testid="theme-toggle-mobile" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 rounded-lg hover:bg-muted">{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
            <Avatar size="w-9 h-9" />
          </div>
        </header>
        <main className="flex-1 p-4 pb-28 lg:p-8 lg:pb-8 max-w-[1400px] w-full mx-auto"><Outlet /></main>
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/85 backdrop-blur-xl border-t border-border/70 flex justify-around px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)]" data-testid="bottom-nav">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} data-testid={`bottomnav-${i.key}`}
              className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-semibold min-w-[56px] transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <i.icon className="w-5 h-5" /><span className="truncate max-w-[64px]">{t(i.key)}</span>
            </NavLink>
          ))}
          <button onClick={() => nav("/profile")} data-testid="bottomnav-profile" className="flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground min-w-[56px]">
            <UserCircle className="w-5 h-5" /><span>{t("profile")}</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
