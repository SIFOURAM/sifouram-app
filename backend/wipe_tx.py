import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
c = MongoClient(os.environ["MONGO_URL"])
db = c[os.environ["DB_NAME"]]

# Transactional / sales / purchase data to wipe (per requested tabs)
collections = [
    "sales",          # Kasir POS sales
    "deposits",       # Kasir daily deposit
    "rider_stock",    # Kasir rider stock allocation
    "eod",            # Kasir end-of-day
    "handovers",      # cash handover
    "expenses",       # Laporan Keuangan
    "invoices",       # Invoice
    "customers",      # Pelanggan
    "inventory_tx",   # Inventory purchases/movements
    "menu_stock_tx",  # Stock Menu movements
    "notifications",  # stale refs to deleted deposits
]
for col in collections:
    r = db[col].delete_many({})
    print(f"{col}: deleted {r.deleted_count}")

# Reset current stock counters to zero (purchases removed)
print("materials stock reset:", db.materials.update_many({}, {"$set": {"stock": 0}}).modified_count)
print("menus stock reset:", db.menus.update_many({}, {"$set": {"stock": 0}}).modified_count)
c.close()
print("DONE")
