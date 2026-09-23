# SI FOUR AM — PRD

## Original problem statement
Advanced coffee-cart business OS (POS, inventory w/ recipes, menu stock, rider stock & photo evidence, deposits with receipt + WhatsApp, invoices, rider dashboard, main dashboard w/ charts + live rider GPS, cash handover, financial report, salary/incentive tiers, profile, settings dark/light + EN/ID). Roles: Superadmin, Bar Team, Rider. 12 seeded accounts. Desktop sidebar / mobile bottom nav. Orange accents, gold gradient borders, black/white backgrounds.

## User choices
- Maps: Leaflet/OpenStreetMap now (Google Maps later when key provided)
- Full-stack React + FastAPI + MongoDB (not single index.html)
- Photos: user asked for Google Drive → requires Google Cloud OAuth Client ID/Secret (not provided). Currently stored as compressed base64 JPEG in MongoDB.
- WhatsApp: wa.me link + auto-download receipt PNG

## Architecture
- backend/server.py (FastAPI, JWT bearer auth, bcrypt, role deps STAFF/SUPER/ANY), backend/seed.py (accounts, materials, recipes)
- Collections: users, materials, menus, inventory_tx, menu_stock_tx, attendance (unique rider+date), rider_stock (upsert rider+date), sales, customers, deposits (upsert rider+date), invoices, expenses, handovers, gps, login_attempts
- Revenue source of truth per (rider, date): deposit if exists, else POS sales (daily_summaries)
- frontend/src: context/AuthContext, lib/{api,helpers,i18n}, components/{Layout,common,GpsMap}, pages/*

## Implemented (2026-06)
- Auth: login by username/email + password, remember me, PIN gate for POS, change password/PIN, brute-force lockout
- Inventory: materials, IN/OUT/opname tx, recipes + HPP/margin, WA Stock + WA Order Items (with PDF via jsPDF)
- Menu Stock: production deducts recipe + packaging, adjust, superadmin add/edit menu + photo
- POS: attendance check-in/out with photo + PIN (once/day), product grid from rider stock, cart, cash/QRIS, change, receipt (PNG + WA to customer wa.me/62), EOD report, sales history w/ est. profit, loyalty points
- Rider Stock: table with qty dropdowns (0–30, Kopsu Aren 0–50), photo, save → deducts central menu stock, downloads photo, opens WA
- Deposit: PIC auto, rider, date, stock prefilled, remaining/cash/qris/wastage dropdowns, diff → new debt, debt tracking, expenses, net cash, receipt popup auto-screenshot + WA with motivational text
- Invoice (superadmin): customer + WA, rows, discount, invoice no, receipt + WA
- Rider Dashboard: rider select/all, filters (today/yesterday/week/month 16→15/prev/custom), profile, gross, cups, attendance, tier progress (all riders = nearest × count), daily chart, best-selling pie, stock photo history, sales history
- Main Dashboard: KPIs, rider revenue chart, money in/out chart, rider table → Leaflet GPS map of riders on duty (polls 20s; rider browser posts GPS every 30s)
- Cash Handover, Financial Report (ledger w/ running cash/bank balance, COGS, gross/net profit, inventory value, manual expense/income), Salary (allowance Rp20k >20 cups/day, Bronze/Silver/Gold/Platinum with 25-day rule)
- Profile, Settings (theme, EN/ID, notifications, GPS mode, permissions list), role-based nav + More hub

## Revision 1 (2026-06) — implemented
- Mobile-app UX: role-based bottom nav (superadmin 4 + "More" upward menu; barteam 6; rider 3), profile only top-right, desktop sidebar flat; Indonesian default language + expanded dictionary (receipts translated)
- Rider Stock: photo mandatory, PIC auto, new WA report format with time; Deposit: PIC auto, price under name, EOD prefill (requires POS "End Today's Sales" close), Bundling 1/2 (4/10 cups of Rp12k menus → 45k/110k) with menu picker, commission Rp20k, receipt date+time, Web Share API with image
- POS: locked without rider stock / after EOD close / after deposit; bundling buttons; customer lookup by 5-digit phone prefix; sales history table + receipt resend; client_id idempotency
- Invoice: PAID/UNPAID, down payment, remaining payment (bold), pay endpoint, unpaid lookup by phone prefix
- Cash Handover: period filter → expected cash from deposits, unlimited expense lines saved to expenses/finance, difference calc, history + detail dialog
- Rider Dashboard: Total Income (20k×days + incentive), Daily Attendance + Incentive withdraw dialogs (cash/bank, balance check, history), line chart cash+qris, PDF/print
- Salary: no 20-cup rule; click rider → dashboard. Finance: Excel/PDF/WA export, purchase item + material names, withdrawals in ledger
- Inventory: recipes include packaging (migration), PDF Excel-style with time, purchased item/supplier on IN
- Google Sheets/Drive sync via Apps Script (google-apps-script/Code.gs + README), URL configurable in Settings (superadmin) or GOOGLE_APPS_SCRIPT_URL env. NOT active until user deploys and pastes URL.

## Backlog / P1-P2
- Google Drive photo storage (needs OAuth credentials) · Google Maps (needs API key)
- V2: AI demand forecasting, Bluetooth thermal printing, WA auto-broadcast marketing
- Customers/loyalty page UI (data already stored)
- Push notifications
