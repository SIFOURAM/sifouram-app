import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useT } from "../lib/i18n";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/common";
import { MORE } from "../components/Layout";

export default function More() {
  const { t } = useT();
  const { user } = useAuth();
  return (
    <div data-testid="more-page">
      <PageHeader eyebrow="All modules" title={t("more")} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(MORE[user.role] || []).map((i, idx) => (
          <Link key={i.to} to={i.to} data-testid={`more-${i.key}`} className="bento gold flex items-center gap-4 fade-up hover:-translate-y-0.5 transition-transform" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center"><i.icon className="w-5 h-5" /></div>
            <p className="font-heading font-bold flex-1">{t(i.key)}</p><ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>))}
      </div>
    </div>
  );
}
