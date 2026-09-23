import dayjs from "dayjs";
import html2canvas from "html2canvas";

export const fmtRp = (n) => "Rp " + Math.round(Number(n) || 0).toLocaleString("id-ID");
export const today = () => dayjs().format("YYYY-MM-DD");
export const fmtDate = (d) => dayjs(d).format("DD MMM YYYY");
export const fmtTime = (iso) => (iso ? dayjs(iso).format("HH:mm") : "-");

// Payroll period: 16th -> 15th
export const periodFor = (d) => {
  const x = dayjs(d);
  const start = x.date() >= 16 ? x.date(16) : x.subtract(1, "month").date(16);
  return { start: start.format("YYYY-MM-DD"), end: start.add(1, "month").date(15).format("YYYY-MM-DD") };
};

export const rangeFor = (preset, custom) => {
  const t = dayjs();
  switch (preset) {
    case "yesterday": { const y = t.subtract(1, "day").format("YYYY-MM-DD"); return { start: y, end: y }; }
    case "week": return { start: t.startOf("week").add(1, "day").format("YYYY-MM-DD"), end: t.format("YYYY-MM-DD") };
    case "month": return periodFor(t);
    case "prevmonth": return periodFor(t.subtract(1, "month"));
    case "custom": return custom;
    default: return { start: t.format("YYYY-MM-DD"), end: t.format("YYYY-MM-DD") };
  }
};

export const waNumber = (phone) => {
  let p = String(phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
};
export const waLink = (text, phone) => `https://wa.me/${phone ? waNumber(phone) : ""}?text=${encodeURIComponent(text)}`;
export const openWA = (text, phone) => window.open(waLink(text, phone), "_blank");

export const screenshotEl = async (el, filename) => {
  if (!el) return null;
  const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  return url;
};

export const compressImage = (file, max = 640) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * s; c.height = img.height * s;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.7));
    };
    img.src = URL.createObjectURL(file);
  });

export const initials = (name = "") => name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const roleLabel = (r) => ({ superadmin: "Superadmin", barteam: "Bar Team", rider: "Rider" }[r] || r);
