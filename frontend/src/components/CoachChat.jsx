import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { api, errMsg } from "../lib/api";

export default function CoachChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pois, setPois] = useState([]);
  const box = useRef();
  useEffect(() => { if (open) api.get("/coach/history").then((r) => { setMsgs([...r.data].reverse()); if (r.data[0]?.pois) setPois(r.data[0].pois); }); }, [open]);
  useEffect(() => { box.current?.scrollTo(0, 99999); }, [msgs, busy]);
  const send = async (q) => {
    const message = (q || text).trim(); if (!message || busy) return;
    setText(""); setBusy(true);
    let pos = {};
    try { const p = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })); pos = { lat: p.coords.latitude, lng: p.coords.longitude }; } catch { }
    try { const { data } = await api.post("/coach/chat", { message, ...pos }); setMsgs((m) => [...m, data]); setPois(data.pois || []); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const quick = ["Lokasi ramai terdekat sekarang?", "Tips tembus 50 cup hari ini", "Cara nawarin bundling", "Semangatin aku dong!"];
  return (
    <>
      <button data-testid="coach-open" onClick={() => setOpen(true)} aria-label="Tanya AI"
        className="fixed right-4 bottom-24 lg:bottom-6 z-40 rounded-full p-[2px] bg-[linear-gradient(135deg,#0064e0,#8a2be2,#ff4d9d,#ffc53d)] shadow-xl hover:scale-105 active:scale-95 transition-transform">
        <span className="flex items-center gap-2 rounded-full bg-background/95 backdrop-blur pl-1.5 pr-3 py-1.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[linear-gradient(135deg,#0064e0,#8a2be2,#ff4d9d,#ffc53d)]"><Sparkles className="w-4 h-4 text-white" /></span>
          <span className="text-xs font-bold leading-tight text-left">Tanya AI<span className="block text-[9px] font-medium text-muted-foreground">Lokasi ramai jualan</span></span>
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} data-testid="coach-panel" className="bento gold w-full sm:max-w-md h-[85vh] sm:h-[600px] flex flex-col p-0 overflow-hidden rounded-b-none sm:rounded-3xl">
            <div className="flex items-center justify-between p-4 border-b border-border/60"><div><p className="font-heading font-bold">Coach SI FOUR AM 🤖☕</p><p className="text-[11px] text-muted-foreground">Tanya apa saja — dimaksimalkan untuk jualan ☕</p></div><button data-testid="coach-close" onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-muted"><X className="w-4 h-4" /></button></div>
            {pois.length > 0 && <div className="flex gap-1 overflow-x-auto px-3 py-2 border-b border-border/40">{pois.slice(0, 8).map((p, i) => <a key={i} href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] rounded-full bg-muted px-2 py-1 flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />{p.name}</a>)}</div>}
            <div ref={box} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
              {!msgs.length && <div className="text-center text-muted-foreground text-xs pt-8">Halo! Tanya <b>apa saja</b> ke aku — lokasi ramai, tips jualan, atau pertanyaan lain. 🚀<br />Ketik di kolom bawah atau pilih pertanyaan cepat.</div>}
              {msgs.map((m) => <div key={m.id}><div className="ml-auto max-w-[85%] w-fit rounded-2xl rounded-br-md bg-primary text-white px-3 py-2">{m.message}</div><div className="mt-2 max-w-[92%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 whitespace-pre-wrap leading-relaxed">{m.reply}</div></div>)}
              {busy && <div className="w-fit rounded-2xl bg-muted px-3 py-2 animate-pulse">Coach sedang mengetik…</div>}
            </div>
            <div className="p-3 border-t border-border/60">
              <div className="flex gap-1 overflow-x-auto pb-2">{quick.map((q) => <button key={q} data-testid="coach-quick" onClick={() => send(q)} className="shrink-0 text-[11px] rounded-full border border-border px-3 py-1 hover:bg-muted">{q}</button>)}</div>
              <div className="flex gap-2"><input data-testid="coach-input" className="field" placeholder="Tanya apa saja…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} /><button data-testid="coach-send" disabled={busy} onClick={() => send()} className="btn-primary w-11 h-10 p-0"><Send className="w-4 h-4" /></button></div>
            </div>
          </div>
        </div>)}
    </>
  );
}
