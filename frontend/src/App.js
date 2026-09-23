import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LangProvider } from "./lib/i18n";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import MenuStock from "./pages/MenuStock";
import POS from "./pages/POS";
import RiderStock from "./pages/RiderStock";
import Deposit from "./pages/Deposit";
import Invoice from "./pages/Invoice";
import RiderDashboard from "./pages/RiderDashboard";
import Handover from "./pages/Handover";
import Finance from "./pages/Finance";
import Salary from "./pages/Salary";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import More from "./pages/More";

const S = ["superadmin"], SB = ["superadmin", "barteam"], ALL = ["superadmin", "barteam", "rider"];

function Guard({ allow, children }) {
  const { user } = useAuth();
  if (!allow.includes(user.role)) return <Navigate to={user.role === "rider" ? "/pos" : "/"} replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  if (user.role === "rider") return <Navigate to="/pos" replace />;
  return <Dashboard />;
}

function Shell() {
  const { user } = useAuth();
  if (user === null) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-2xl bg-primary animate-pulse" /></div>;
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/inventory" element={<Guard allow={SB}><Inventory /></Guard>} />
        <Route path="/menu-stock" element={<Guard allow={SB}><MenuStock /></Guard>} />
        <Route path="/pos" element={<Guard allow={ALL}><POS /></Guard>} />
        <Route path="/rider-stock" element={<Guard allow={SB}><RiderStock /></Guard>} />
        <Route path="/deposit" element={<Guard allow={SB}><Deposit /></Guard>} />
        <Route path="/invoice" element={<Guard allow={S}><Invoice /></Guard>} />
        <Route path="/rider-dashboard" element={<Guard allow={ALL}><RiderDashboard /></Guard>} />
        <Route path="/handover" element={<Guard allow={S}><Handover /></Guard>} />
        <Route path="/finance" element={<Guard allow={S}><Finance /></Guard>} />
        <Route path="/salary" element={<Guard allow={SB}><Salary /></Guard>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/more" element={<Guard allow={SB}><More /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter><Shell /></BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </LangProvider>
  );
}
