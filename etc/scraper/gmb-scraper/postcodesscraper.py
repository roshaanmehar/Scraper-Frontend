#!/usr/bin/env python3
"""
scrape_postcodes_selenium.py – Parallel Selenium scraper for doogal.co.uk
-----------------------------------------------------------------------
Scrapes *every* postcode that starts with a given outward **prefix**
(e.g. `LS`, `BD`, `SW1`) from doogal.co.uk, then:

* Saves **all full postcodes** to `<prefix>_postcodes.json`.
* Writes a summary JSON `<prefix>_stats.json` with:
  * distinct sectors
  * distinct subsectors per sector
  * count of subsectors per sector.
* Loads one Mongo document per **sub‑sector** into
  `<DB>.subsector_queue` (collection is dropped first).

### Sector / Sub‑sector logic
* **Sector**     – text before the space (e.g. `LS9`).
* **Sub‑sector** – sector + space + first inward digit (e.g. `LS9 9`).

### Concurrency
Creates *N* independent Selenium/Chrome sessions (default 4) that cooperate on
page numbers via a shared counter.  Scraping stops when the first empty page
is encountered.

### Example
```bash
python scrape_postcodes_selenium.py \
  --prefix   LS \
  --city     Leeds \
  --mongo-uri mongodb://localhost:27017 \
  --workers  4        # concurrent browser sessions
  --headless           # optional – omit to watch the browsers
```
"""
from __future__ import annotations

import argparse, json, sys, time, threading
import typing as t
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlencode

from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from pymongo import MongoClient
from pymongo.errors import BulkWriteError

# ----------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Parallel Selenium scraper for doogal.co.uk → Mongo + JSON.")
    ap.add_argument("--prefix", required=True, help="Outward prefix to search for (e.g. LS, BD, SW1).")
    ap.add_argument("--city", required=True, help="Mongo database name (e.g. Leeds).")
    ap.add_argument("--mongo-uri", default="mongodb://localhost:27017", help="Mongo connection URI.")
    ap.add_argument("--workers", type=int, default=4, help="Number of parallel Selenium sessions (default 4).")
    ap.add_argument("--delay", type=float, default=0.5, help="Polite delay between page fetches (seconds).")
    ap.add_argument("--timeout", type=int, default=15, help="Seconds to wait for table to appear.")
    ap.add_argument("--headless", action="store_true", help="Run Chrome in headless mode.")
    return ap.parse_args()

# ----------------------------------------------------------------------
# Constants & shared state
# ----------------------------------------------------------------------

BASE_URL = "https://www.doogal.co.uk/UKPostcodes"
TABLE_SELECTOR = "table.sortable tbody"
ROW_ANCHOR_SELECTOR = "td:first-child a"

# Thread‑safe shared primitives
page_lock     = threading.Lock()
results_lock  = threading.Lock()
next_page_num = 1
stop_scraping = False

all_postcodes: list[str] = []                     # collected full postcodes
sector_to_subsectors: dict[str, set[str]] = defaultdict(set)  # sector → subsector set

# ----------------------------------------------------------------------
# Selenium helpers
# ----------------------------------------------------------------------

def build_url(prefix: str, page: int) -> str:
    return f"{BASE_URL}?{urlencode({'Search': prefix, 'page': page})}"


def create_driver(headless: bool) -> webdriver.Chrome:
    opts = ChromeOptions()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1200,800")
    return webdriver.Chrome(options=opts)


def fetch_postcodes(driver: webdriver.Chrome, url: str, timeout: int) -> list[str]:
    """Returns list of postcode strings from a single results page."""
    driver.get(url)
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, TABLE_SELECTOR))
        )
    except TimeoutException:
        return []

    rows = driver.find_elements(By.CSS_SELECTOR, f"{TABLE_SELECTOR} tr")
    pcs: list[str] = []
    for row in rows:
        try:
            anchor = row.find_element(By.CSS_SELECTOR, ROW_ANCHOR_SELECTOR)
            pcd = anchor.text.strip().upper()
            if pcd:
                pcs.append(pcd)
        except Exception:
            continue
    return pcs

# ----------------------------------------------------------------------
# Parser helpers
# ----------------------------------------------------------------------

def derive_sector_subsector(pcd: str) -> tuple[str, str]:
    if " " not in pcd:
        return pcd, pcd
    outward, inward = pcd.split(" ", 1)
    inward_digit = next((ch for ch in inward if ch.isdigit()), "")
    return outward, f"{outward} {inward_digit}" if inward_digit else outward

# ----------------------------------------------------------------------
# Worker thread
# ----------------------------------------------------------------------

def worker(prefix: str, timeout: int, delay: float, headless: bool):
    global next_page_num, stop_scraping
    driver = create_driver(headless)
    try:
        while True:
            with page_lock:
                if stop_scraping:
                    break
                page = next_page_num
                next_page_num += 1
            url = build_url(prefix, page)
            pcs = fetch_postcodes(driver, url, timeout)
            if not pcs:
                with page_lock:
                    stop_scraping = True
                break

            with results_lock:
                for pcd in pcs:
                    if pcd not in all_postcodes:
                        all_postcodes.append(pcd)
                    sector, subsector = derive_sector_subsector(pcd)
                    sector_to_subsectors[sector].add(subsector)
            time.sleep(delay)
    finally:
        driver.quit()

# ----------------------------------------------------------------------
# Mongo loader
# ----------------------------------------------------------------------

def load_into_mongo(uri: str, db_name: str):
    mclient = MongoClient(uri)
    db = mclient[db_name]
    col = db["subsector_queue"]
    col.drop()
    col.create_index([("subsector", 1)], unique=True)

    batch = []
    for sector, subs in sector_to_subsectors.items():
        for subsector in subs:
            batch.append({"subsector": subsector, "sector": sector, **DEFAULT_FIELDS})
    if batch:
        try:
            col.insert_many(batch, ordered=False)
        except BulkWriteError:
            pass  # duplicates ignored thanks to unique index

DEFAULT_FIELDS: dict[str, t.Any] = {
    "processing": False,
    "scrapedsuccessfully": True,
    "didresultsloadcompletely": True,
    "totalrecordsfound": 0,
    "totaluniquerecordsfound": 0,
    "emailstatus": "pending",
    "recordsfoundwithemail": 0,
}

# ----------------------------------------------------------------------
# Main routine
# ----------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    # 1. Spawn worker threads
    threads = [threading.Thread(target=worker, args=(args.prefix, args.timeout, args.delay, args.headless))
               for _ in range(max(1, args.workers))]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # 2. Persist raw postcodes to JSON
    out_prefix = args.prefix.upper().rstrip()
    postcodes_file = Path(f"{out_prefix}_postcodes.json")
    stats_file     = Path(f"{out_prefix}_stats.json")

    with postcodes_file.open("w", encoding="utf-8") as f:
        json.dump(sorted(all_postcodes), f, indent=2)

    stats = {sec: sorted(list(subs)) for sec, subs in sector_to_subsectors.items()}
    counts = {sec: len(subs) for sec, subs in sector_to_subsectors.items()}
    with stats_file.open("w", encoding="utf-8") as f:
        json.dump({"sectors": stats, "counts": counts}, f, indent=2)

    # 3. Load into MongoDB
    load_into_mongo(args.mongo_uri, args.city)

    # 4. Summary
    print("\n--- Summary ---")
    print(f"Total postcodes scraped     : {len(all_postcodes):,}")
    print(f"Distinct sectors            : {len(sector_to_subsectors):,}")
    print(f"Distinct subsectors         : {sum(len(v) for v in sector_to_subsectors.values()):,}")
    print(f"Saved postcode list         : {postcodes_file}")
    print(f"Saved sector/subsector stats: {stats_file}")

if __name__ == "__main__":
    main()
