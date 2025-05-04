#!/usr/bin/env python3
# ────────────────────────────────────────────────────────────────
#  consolidated_email_scraper.py   –   Advanced email and social media scraper
#  Created 2025‑05‑03
#
#  • Directly processes all records with websites in the collection
#  • Multi-threaded with safe resume and CTRL-C handling
#  • Enhanced email extraction with multiple methods and heuristic scoring
#  • Social media profile extraction
#  • Cookie/consent popup dismissal
#  • Advanced browser fingerprinting evasion
#  • Exponential backoff and circuit breaker pattern
#  • Form analysis for hidden emails
#  • Expanded contact page detection
# ────────────────────────────────────────────────────────────────

import argparse
import json
import logging
import logging.handlers
import os
import random
import re
import signal
import sys
import time
import traceback
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed, Future
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Set, Dict, Any, Tuple, Union

import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, ConnectionFailure
from selenium import webdriver
from selenium.common.exceptions import (
    TimeoutException,
    WebDriverException,
    InvalidSessionIdException,
    ElementNotInteractableException,
    NoSuchElementException,
    StaleElementReferenceException,
    ElementClickInterceptedException
)
from selenium.webdriver import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# ───────────────── Logging ──────────────────────
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

def setup_logging(debug: bool = False):
    """Set up logging with both console and file handlers."""
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if debug else logging.INFO)
    fmt = logging.Formatter("[%(asctime)s] %(levelname)-7s – %(message)s", "%H:%M:%S")

    # Console handler
    sh = logging.StreamHandler(sys.stdout)
    sh.setLevel(logging.DEBUG if debug else logging.INFO)
    sh.setFormatter(fmt)
    root.addHandler(sh)

    # File handler with rotation
    fh = logging.handlers.TimedRotatingFileHandler(
        LOG_DIR / "email_scraper.log", when="midnight", backupCount=7, encoding="utf-8"
    )
    fh.setFormatter(fmt)
    fh.setLevel(logging.DEBUG)
    root.addHandler(fh)

    # Suppress verbose Selenium logs unless in debug mode
    selenium_logger = logging.getLogger('selenium.webdriver.remote.remote_connection')
    selenium_logger.setLevel(logging.WARNING if not debug else logging.DEBUG)
    urllib3_logger = logging.getLogger('urllib3.connectionpool')
    urllib3_logger.setLevel(logging.WARNING if not debug else logging.DEBUG)


    return logging.getLogger()

log = logging.getLogger(__name__)

# ─────────────────── Tunables & Delays ──────────────
WEBSITE_WAIT_MIN, WEBSITE_WAIT_MAX = 1.0, 2.0
CONTACT_WAIT_MIN, CONTACT_WAIT_MAX = 0.5, 1.0
MONGO_RETRY_ATTEMPTS = 3
MONGO_RETRY_DELAY = 1.0

# Default MongoDB connection URI
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "Leeds"
COLLECTION_NAME = "restaurants"

# User agent pool for requests and Selenium
UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.6367.78 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) "
    "Gecko/20100101 Firefox/115.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
]

# Enhanced email regex pattern with more TLDs and formats
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(?:[a-zA-Z]{2,}|co\.uk|org\.uk|ac\.uk|gov\.uk|nhs\.uk)")

# Common contact page paths to check - EXPANDED
CONTACT_PATHS = [
    "/contact",
    "/contact-us",
    "/about",
    "/about-us",
    "/get-in-touch",
    "/reach-us",
    "/enquiry",
    "/enquiries",
    "/support",
    "/help",
    "/reach-out",
    "/talk-to-us",
    "/connect",
    "/feedback",
    "/info/contact",
    "/company/contact",
    "/about/contact",
    "/kontakt",  # German
    "/contacto",  # Spanish
    "/contatto",  # Italian
]

# Social media patterns
SOCIAL_MEDIA_PATTERNS = {
    'facebook': [
        r'facebook\.com/([^/"\'?]+)',
        r'fb\.com/([^/"\'?]+)',
        r'facebook\.com/pages/([^/"\'?]+)',
    ],
    'twitter': [
        r'twitter\.com/([^/"\'?]+)',
        r'x\.com/([^/"\'?]+)',
    ],
    'instagram': [
        r'instagram\.com/([^/"\'?]+)',
    ],
    'linkedin': [
        r'linkedin\.com/company/([^/"\'?]+)',
        r'linkedin\.com/in/([^/"\'?]+)',
        r'linkedin\.com/school/([^/"\'?]+)',
    ],
    'youtube': [
        r'youtube\.com/channel/([^/"\'?]+)',
        r'youtube\.com/c/([^/"\'?]+)',
        r'youtube\.com/user/([^/"\'?]+)',
        r'youtube\.com/@([^/"\'?]+)',
    ],
    'pinterest': [
        r'pinterest\.com/([^/"\'?]+)',
    ],
    'tiktok': [
        r'tiktok\.com/@([^/"\'?]+)',
    ],
}

# Cookie consent button patterns
COOKIE_BUTTON_PATTERNS = [
    # Text patterns (lowercase)
    "accept", "accept all", "i accept", "agree", "i agree", "consent",
    "allow", "allow all", "allow cookies", "ok", "got it", "continue",
    "understood", "accept cookies", "accept & close", "accept and close",
    "save preferences", "save settings", "save and continue", "alle akzeptieren", # German
    "aceptar", "aceptar todo", # Spanish
    "accetta", "accetta tutto", # Italian
    # Common button IDs and classes (lowercase)
    "cybotcookiebotdialogbodybuttonaccept", "onetrust-accept-btn-handler",
    "accept-cookies", "cookie-accept", "cookie-consent-accept", "gdpr-accept",
    "cc-accept", "js-accept-cookies", "js-accept-all-cookies", "cookie-agree",
    "cookie-banner__accept", "cookie-consent__accept", "cookie-banner-accept",
    "cookie_action_close_header", "wt-cli-accept-all-btn", "cmplz-accept",
]

# ───────────────── Circuit Breaker ───────────────────
class CircuitBreaker:
    """Circuit breaker pattern implementation for handling failing domains."""

    def __init__(self, failure_threshold=3, reset_timeout=1800): # Reset after 30 mins
        self.failure_counts = {}
        self.circuit_open = set()
        self.last_failure_time = {}
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout

    def record_failure(self, domain):
        """Record a failure for a domain."""
        if not domain: return
        self.failure_counts[domain] = self.failure_counts.get(domain, 0) + 1
        self.last_failure_time[domain] = time.time()

        if self.failure_counts[domain] >= self.failure_threshold:
            if domain not in self.circuit_open:
                 log.warning(f"Circuit breaker opened for domain: {domain}")
                 self.circuit_open.add(domain)

    def is_open(self, domain):
        """Check if circuit breaker is open for a domain."""
        if not domain or domain not in self.circuit_open:
            return False

        # Check if we should reset the circuit
        last_failure = self.last_failure_time.get(domain, 0)
        if time.time() - last_failure > self.reset_timeout:
            self.circuit_open.remove(domain)
            del self.failure_counts[domain]
            del self.last_failure_time[domain]
            log.info(f"Circuit breaker reset for domain: {domain}")
            return False

        return True

    def record_success(self, domain):
        """Record a successful operation for a domain."""
        if not domain: return
        if domain in self.failure_counts:
            del self.failure_counts[domain] # Reset count on success
            if domain in self.last_failure_time:
                 del self.last_failure_time[domain]

        if domain in self.circuit_open:
            self.circuit_open.remove(domain)
            log.info(f"Circuit breaker closed for domain: {domain} after success")

# Initialize circuit breaker
circuit_breaker = CircuitBreaker()

# ───────────────── CLI Parsing ───────────────────────
def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    p = argparse.ArgumentParser(description="Enhanced email and social media scraper for business websites",
                                formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    p.add_argument("--threads", type=int, default=5, help="Number of concurrent website workers")
    p.add_argument("--headless", action="store_true", help="Run Chrome headless")
    p.add_argument("--debug", action="store_true", help="Enable debug logging")
    p.add_argument("--mongo-uri", type=str, default=MONGO_URI,
                   help="MongoDB connection URI")
    p.add_argument("--db-name", type=str, default=DB_NAME,
                   help="MongoDB database name")
    p.add_argument("--collection", type=str, default=COLLECTION_NAME,
                   help="MongoDB collection name")
    p.add_argument("--max-sites", type=int, default=0,
                   help="Maximum number of sites to process (0 = all)")
    p.add_argument("--reset-status", action="store_true",
                   help="Reset email status for all businesses with websites and exit")
    p.add_argument("--list-records", action="store_true",
                   help="List all records with websites (limit 10) and exit")
    p.add_argument("--test-url", type=str, help="Test a single URL and print results")
    p.add_argument("--export-csv", type=str, help="Export results to CSV file after processing")
    return p.parse_args()

# ───────────────── MongoDB Setup ─────────────────────
def setup_mongodb(mongo_uri: str, db_name: str, collection_name: str) -> Tuple[Optional[MongoClient], Optional[Any]]:
    """Set up MongoDB connection and collection with proper error handling."""
    for attempt in range(MONGO_RETRY_ATTEMPTS):
        try:
            # Use a longer timeout for initial connection
            log.info(f"Attempting MongoDB connection ({attempt + 1}/{MONGO_RETRY_ATTEMPTS})...")
            client = MongoClient(mongo_uri,
                                 serverSelectionTimeoutMS=10000,
                                 connectTimeoutMS=20000,
                                 socketTimeoutMS=45000,
                                 maxPoolSize=50, # Increased pool size
                                 retryWrites=True)

            # Test connection
            client.admin.command('ping')
            log.info(f"Connected to MongoDB successfully: {db_name}/{collection_name}")

            db = client[db_name]
            collection = db[collection_name]

            # Ensure indexes exist
            try:
                collection.create_index([("emailstatus", ASCENDING)], background=True, name="emailstatus_idx")
                collection.create_index([("website", ASCENDING)], background=True, name="website_idx")
                log.info("Verified/created necessary indexes")
            except PyMongoError as e:
                log.warning(f"Index check/creation issue (continuing anyway): {e}")

            return client, collection

        except (ServerSelectionTimeoutError, ConnectionFailure) as e:
            log.warning(f"MongoDB connection failed (attempt {attempt + 1}/{MONGO_RETRY_ATTEMPTS}): {e}")
            if attempt < MONGO_RETRY_ATTEMPTS - 1:
                 delay = MONGO_RETRY_DELAY * (2 ** attempt) # Exponential backoff
                 log.info(f"Retrying in {delay:.1f} seconds...")
                 time.sleep(delay)
            else:
                 log.critical(f"MongoDB setup failed after {MONGO_RETRY_ATTEMPTS} attempts.")
                 return None, None
        except Exception as e:
            log.critical(f"MongoDB setup failed with unexpected error: {e}", exc_info=True)
            return None, None
    return None, None # Should not be reached, but satisfies linters


# ───────────────── Database Utilities ──────────────────
def reset_email_status(collection, debug: bool = False) -> int:
    """Reset email status for all businesses with websites.
    Returns the number of records updated."""
    if not collection:
        log.error("Cannot reset status: MongoDB collection not available.")
        return 0
    try:
        log.info("Resetting email status for businesses with websites...")
        # Build query for businesses with websites
        query = {
            "website": {"$exists": True, "$nin": ["", None, "N/A"]},
        }

        # Update all matching records
        result = collection.update_many(
            query,
            {"$set": {"emailstatus": "pending", "email": [], "social_profiles": {}},
             "$unset": {"emailscraped_at": ""}} # Remove timestamp
        )

        count = result.modified_count
        log.info(f"Reset email status for {count} businesses")
        return count
    except PyMongoError as e:
        log.error(f"MongoDB error resetting email status: {e}")
        return 0
    except Exception as e:
        log.error(f"Unexpected error resetting email status: {e}", exc_info=debug)
        return 0

def list_business_records(collection, debug: bool = False) -> int:
    """List all business records with websites.
    Returns the number of records found."""
    if not collection:
        log.error("Cannot list records: MongoDB collection not available.")
        return 0
    try:
        log.info("Listing business records with websites...")
        # Build query for businesses with websites
        query = {
             "website": {"$exists": True, "$nin": ["", None, "N/A"]},
        }

        # Find all matching records
        records = list(collection.find(query, {"businessname": 1, "website": 1, "emailstatus": 1}).limit(10))
        total_count = collection.count_documents(query)

        log.info(f"Found {total_count} businesses with websites")

        if not records:
            log.info("No records found matching the criteria.")
            return 0

        # Print details of first 10 records (or fewer if less than 10 found)
        log.info("Showing first %d records:", len(records))
        for i, record in enumerate(records):
            log.info("  Record %d: %s - %s (emailstatus: %s)",
                     i + 1,
                     record.get("businessname", "Unknown"),
                     record.get("website", "N/A"),
                     record.get("emailstatus", "not set"))

        if total_count > 10:
            log.info("... and %d more records", total_count - 10)

        return total_count
    except PyMongoError as e:
        log.error(f"MongoDB error listing business records: {e}")
        return 0
    except Exception as e:
        log.error(f"Unexpected error listing business records: {e}", exc_info=debug)
        return 0

def check_database_status(collection) -> Dict[str, int]:
    """Check the status of the database and return statistics."""
    stats = {
        "total_businesses": 0,
        "businesses_with_websites": 0,
        "businesses_pending_email": 0,
        "businesses_with_emails": 0,
        "businesses_checked_no_email": 0,
        "businesses_failed": 0,
        "businesses_with_social": 0,
    }
    if collection is None:
        log.error("Cannot check status: MongoDB collection not available.")
        return stats

    try:
        # Count total businesses
        stats["total_businesses"] = collection.count_documents({})

        # Common query part for businesses with websites
        website_query = {"website": {"$exists": True, "$nin": ["", None, "N/A"]}}

        # Count businesses with websites
        stats["businesses_with_websites"] = collection.count_documents(website_query)

        # Count businesses with pending email status
        pending_query = {"emailstatus": "pending", **website_query}
        stats["businesses_pending_email"] = collection.count_documents(pending_query)

        # Count businesses with found emails
        found_query = {"emailstatus": "found"}
        stats["businesses_with_emails"] = collection.count_documents(found_query)

        # Count businesses checked but no email found
        checked_query = {"emailstatus": "checked"}
        stats["businesses_checked_no_email"] = collection.count_documents(checked_query)

        # Count businesses that failed processing
        failed_query = {"emailstatus": "failed"}
        stats["businesses_failed"] = collection.count_documents(failed_query)

        # Count businesses with social profiles
        social_query = {"social_profiles": {"$exists": True, "$ne": {}}}
        stats["businesses_with_social"] = collection.count_documents(social_query)

        return stats
    except PyMongoError as e:
        log.error(f"MongoDB error checking database status: {e}")
        return stats # Return potentially incomplete stats
    except Exception as e:
        log.error(f"Unexpected error checking database status: {e}")
        return stats


def export_to_csv(collection, filename: str, debug: bool = False) -> bool:
    """Export results to CSV file."""
    if not collection:
        log.error("Cannot export: MongoDB collection not available.")
        return False
    try:
        import csv
    except ImportError:
        log.error("CSV export requires the 'csv' module, which is usually built-in.")
        return False

    try:
        # Query for businesses processed (found, checked, or failed) or with social profiles
        query = {
            "$or": [
                {"emailstatus": {"$in": ["found", "checked", "failed"]}},
                {"social_profiles": {"$exists": True, "$ne": {}}}
            ]
        }

        results = collection.find(
            query,
            {
                "_id": 0, # Exclude MongoDB ID
                "businessname": 1,
                "website": 1,
                "email": 1,
                "emailstatus": 1,
                "emailscraped_at": 1,
                "social_profiles": 1
            }
        )

        filepath = Path(filename)
        filepath.parent.mkdir(parents=True, exist_ok=True) # Ensure directory exists

        log.info(f"Exporting results to {filepath}...")

        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            # Define headers, including all potential social platforms
            fieldnames = [
                'Business Name',
                'Website',
                'Email Status',
                'Emails',
                'Scraped At',
                'Facebook',
                'Twitter',
                'Instagram',
                'LinkedIn',
                'YouTube',
                'Pinterest',
                'TikTok'
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames, extrasaction='ignore')
            writer.writeheader()

            count = 0
            for doc in results:
                emails = ', '.join(doc.get('email', [])) if isinstance(doc.get('email'), list) else doc.get('email', '')
                social = doc.get('social_profiles', {})
                scraped_at = doc.get('emailscraped_at', '')
                if isinstance(scraped_at, datetime):
                     scraped_at = scraped_at.strftime("%Y-%m-%d %H:%M:%S")


                row = {
                    'Business Name': doc.get('businessname', 'Unknown'),
                    'Website': doc.get('website', ''),
                    'Email Status': doc.get('emailstatus', ''),
                    'Emails': emails,
                    'Scraped At': scraped_at,
                    'Facebook': social.get('facebook', ''),
                    'Twitter': social.get('twitter', ''),
                    'Instagram': social.get('instagram', ''),
                    'LinkedIn': social.get('linkedin', ''),
                    'YouTube': social.get('youtube', ''),
                    'Pinterest': social.get('pinterest', ''),
                    'TikTok': social.get('tiktok', '')
                }
                writer.writerow(row)
                count += 1

        log.info(f"Successfully exported {count} records to {filepath}")
        return True
    except PyMongoError as e:
        log.error(f"MongoDB error during export: {e}")
        return False
    except IOError as e:
         log.error(f"File write error exporting to CSV: {e}")
         return False
    except Exception as e:
        log.error(f"Unexpected error exporting to CSV: {e}", exc_info=debug)
        return False

# ───────────────── Helper Utilities ──────────────────
def rdelay(a: float, b: float):
    """Random delay between a and b seconds."""
    time.sleep(random.uniform(a, b))

def is_driver_alive(driver: Optional[webdriver.Chrome]) -> bool:
    """Check if the driver is still alive and responsive."""
    if driver is None:
        return False
    try:
        # Try to get the current URL - this will fail if the driver is dead or closed
        _ = driver.current_url
        # Additionally check if session_id is valid
        return driver.session_id is not None
    except (InvalidSessionIdException, WebDriverException):
        log.debug("Driver session seems to be invalid or closed.")
        return False
    except Exception as e:
        log.debug(f"Unexpected error checking driver status: {e}")
        return False

def normalize_url(url: str) -> str:
    """Normalize URL by adding scheme if missing and lowercasing."""
    url = url.strip().lower()
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        # Check if it looks like a domain name (contains a dot, no spaces)
        if '.' in url and ' ' not in url:
             log.debug(f"Adding https:// scheme to {url}")
             return "https://" + url
        else:
             log.warning(f"URL '{url}' seems invalid, returning empty.")
             return "" # Invalid URL format
    return url

def get_domain(url: str) -> str:
    """Extract domain from URL, removing www."""
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc
        # Remove www. if present
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain.lower() # Return lowercase domain
    except Exception as e:
        log.warning(f"Could not parse domain from URL '{url}': {e}")
        return ""

def backoff_retry(func, max_retries=3, initial_delay=1.0, allowed_exceptions=(requests.exceptions.RequestException, TimeoutException), *args, **kwargs):
    """Retry a function with exponential backoff for specific exceptions."""
    retries = 0
    delay = initial_delay
    while retries < max_retries:
        try:
            return func(*args, **kwargs)
        except allowed_exceptions as e:
            retries += 1
            if retries >= max_retries:
                log.error(f"Function {func.__name__} failed after {max_retries} retries: {e}")
                raise # Re-raise the last exception
            wait = delay + random.uniform(0, 0.5 * delay) # Add jitter
            log.warning(f"Operation failed: {e}. Retrying in {wait:.2f}s ({retries}/{max_retries})")
            time.sleep(wait)
            delay *= 2 # Exponential increase
        except Exception as e:
            log.error(f"Function {func.__name__} failed with unexpected exception: {e}")
            raise # Re-raise unexpected exceptions immediately


def clean_emails(raw: List[str]) -> List[str]:
    """Clean, validate, and deduplicate email addresses."""
    seen: Set[str] = set()
    cleaned = []

    # Common disposable/temporary email domains (add more as needed)
    disposable_domains = {"mailinator.com", "temp-mail.org", "10minutemail.com"}
    # Common image file extensions
    image_extensions = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}


    for e in raw:
        if not e or not isinstance(e, str):
            continue
        e = e.strip().lower()

        # Basic check
        if "@" not in e or "." not in e.split('@')[-1]:
            continue

        # Skip common fake/example emails
        if any(p in e for p in (
            "example.com", "sentry.wixpress.com", "your@email",
            "email@example", "info@your", "name@domain",
            "user@", "username@", "email@domain", "@localhost",
            "example.org", "example.net", "domain.com",
            "contact@example.com", "privacy@example.com",
            "email@here.com"
        )):
            continue

        # Skip emails ending with common image extensions
        if any(e.endswith(ext) for ext in image_extensions):
             continue

        # Skip emails from known disposable domains
        try:
            domain = e.split('@')[1]
            if domain in disposable_domains:
                continue
        except IndexError:
             continue # Should not happen if '@' is present, but safety first

        # Use the detailed regex for better validation
        if not EMAIL_RE.fullmatch(e):
            # log.debug(f"Skipping invalid format email: {e}") # Optional: log invalid ones
            continue

        # Trim weird fragments after known TLDs (already handled by regex, but keep as safety)
        # (This logic might be redundant with the regex but kept for robustness)
        # for tld in (".com", ".net", ".org", ".edu", ".gov", ".co.uk", ".ac.uk", ".uk"):
        #     if tld in e:
        #         parts = e.split(tld, 1)
        #         if len(parts) > 1:
        #             e = parts[0] + tld
        #         break

        if e in seen:
            continue

        seen.add(e)
        cleaned.append(e)

    return cleaned


def emails_from_text(text: str) -> List[str]:
    """Extract email addresses from text using regex."""
    if not text or not isinstance(text, str):
        return []
    # Decode potential HTML entities like '&#64;' for '@' and '&#46;' for '.'
    try:
        import html
        text = html.unescape(text)
    except ImportError:
        pass # Continue without html module if not available

    # Replace common obfuscations like [at] and [dot]
    text = re.sub(r'\s*\[\s*(at|@)\s*\]\s*', '@', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*\[\s*(dot|\.)\s*\]\s*', '.', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*\(\s*(at|@)\s*\)\s*', '@', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*\(\s*(dot|\.)\s*\)\s*', '.', text, flags=re.IGNORECASE)
    text = text.replace(' at ', '@').replace(' dot ', '.') # Simple space replacement

    return EMAIL_RE.findall(text or "")

def guess_emails_from_domain(domain: str, business_name: str) -> List[str]:
    """Generate likely email addresses based on domain and business name."""
    if not domain or not business_name:
        return []

    # Clean business name: remove special chars, convert to lowercase
    name = business_name.lower()
    name = re.sub(r'[\s\-]+', ' ', name) # Normalize whitespace and hyphens
    name = re.sub(r'[^\w\s]', '', name).strip() # Remove remaining special chars
    words = name.split()

    if not words:
        return []

    # Generate common patterns
    patterns = set() # Use a set to avoid duplicates initially

    # Generic prefixes
    generic_prefixes = ["info", "contact", "hello", "enquiries", "support", "admin", "office", "mail", "sales", "bookings", "reservations", "help", "general"]
    for prefix in generic_prefixes:
        patterns.add(f"{prefix}@{domain}")

    # Name-based patterns
    if len(words) == 1:
        # Single word name
        if len(words[0]) < 15: # Only for reasonably short names
            patterns.add(f"{words[0]}@{domain}")
    elif len(words) > 1:
        # Multiple words name
        first_word = words[0]
        last_word = words[-1]
        first_initial = first_word[0]
        full_name_no_space = "".join(words)

        # firstword@domain.com
        if len(first_word) < 15:
            patterns.add(f"{first_word}@{domain}")
        # firstinitial.lastname@domain.com
        if len(last_word) < 15:
             patterns.add(f"{first_initial}.{last_word}@{domain}")
        # firstname.lastname@domain.com
        if len(first_word) < 15 and len(last_word) < 15:
             patterns.add(f"{first_word}.{last_word}@{domain}")
        # firstinitiallastname@domain.com
        if len(last_word) < 15:
             patterns.add(f"{first_initial}{last_word}@{domain}")
        # fullnamenospace@domain.com
        if len(full_name_no_space) < 20:
            patterns.add(f"{full_name_no_space}@{domain}")


    # Limit the number of guesses to avoid excessive noise
    max_guesses = 10
    return list(patterns)[:max_guesses]


def score_email(email: str, domain: str, context: Dict[str, Any]) -> int:
    """Score an email based on various heuristics."""
    score = 0
    if not email or '@' not in email:
        return 0

    # Base score for being found
    score += 10

    # Domain match is a strong signal
    try:
        email_domain = email.split('@')[1]
        if domain and email_domain == domain:
            score += 50 # Exact match
        elif domain and email_domain.endswith("." + domain):
             score += 30 # Subdomain match
        elif domain and domain in email_domain:
            score += 15 # Partial domain match (less reliable)
    except IndexError:
        return 0 # Invalid email format


    # Email format scoring
    prefix = email.split('@')[0]
    if prefix in ["info", "contact", "hello", "enquiries", "support", "sales", "bookings", "reservations"]:
        score += 25 # Common contact prefixes
    elif prefix in ["admin", "office", "mail", "help", "general"]:
        score += 15 # Other common prefixes
    elif prefix in ["press", "media", "jobs", "careers", "hr"]:
         score += 10 # Specific department prefixes
    elif len(prefix) <= 3 and not prefix.isdigit(): # Very short prefixes (non-numeric) are often less desirable
        score -= 5
    elif re.match(r'^\d+$', prefix): # Purely numeric prefix
         score -= 10
    elif re.search(r'[a-f0-9]{8,}', prefix): # Looks like a hash/random string
          score -= 15

    # Context scoring (add points based on where it was found)
    if context.get("found_on_contact_page", False):
        score += 30
    if context.get("found_in_mailto", False):
        score += 20
    if context.get("found_in_footer", False):
        score += 15
    if context.get("found_in_header", False):
         score += 10
    if context.get("found_near_contact_text", False):
        score += 15
    if context.get("found_in_form", False): # Especially hidden fields or mailto actions
        score += 20
    if context.get("found_in_text", False) or context.get("found_in_body", False) or context.get("found_in_element", False):
        score += 5 # Basic find in text
    if context.get("found_in_script", False) or context.get("found_in_meta", False):
        score += 0 # Neutral score for script/meta, could be anything
    if context.get("found_obfuscated", False):
         score += 10 # Found via de-obfuscation technique
    if context.get("found_in_accessibility", False):
         score += 5 # Found in alt/aria

    # Penalize emails found only in source/script/meta if better context exists for others
    if score < 50 and (context.get("found_in_source", False) or context.get("found_in_script", False) or context.get("found_in_meta", False)):
         # Only penalize if *only* found in these less reliable places
         only_in_weak_source = True
         for key, val in context.items():
             if val and key not in ["found_in_source", "found_in_script", "found_in_meta", "found_on_contact_page"]:
                 only_in_weak_source = False
                 break
         if only_in_weak_source:
            score -= 10


    return max(0, min(100, score)) # Clamp score between 0 and 100


def prioritize_emails(emails_with_scores: List[Tuple[str, int]]) -> List[str]:
    """Sort emails by their score and return unique emails."""
    if not emails_with_scores:
        return []

    # Use a dictionary to keep the highest score for each unique email
    best_scores: Dict[str, int] = {}
    for email, score in emails_with_scores:
        if email not in best_scores or score > best_scores[email]:
            best_scores[email] = score

    # Convert back to list of tuples and sort
    sorted_emails_tuples = sorted(best_scores.items(), key=lambda item: item[1], reverse=True)

    # Return just the emails, ordered by score
    return [email for email, _ in sorted_emails_tuples]


def extract_from_accessibility_elements(driver: webdriver.Chrome) -> List[str]:
    """Extract emails from accessibility elements like alt text and aria labels."""
    emails = set()
    if not is_driver_alive(driver): return []

    # Check alt text
    try:
        elements = driver.find_elements(By.XPATH, "//*[@alt and contains(@alt, '@')]")
        for el in elements:
            try:
                alt_text = el.get_attribute("alt") or ""
                emails.update(emails_from_text(alt_text))
            except StaleElementReferenceException:
                continue
            except Exception as e_inner:
                 log.debug(f"Inner error getting alt text: {e_inner}")
    except (NoSuchElementException, WebDriverException) as e:
        log.debug(f"Error finding alt elements: {e}")
    except Exception as e:
         log.debug(f"Unexpected error in alt text extraction: {e}")

    # Check aria labels
    try:
        elements = driver.find_elements(By.XPATH, "//*[@aria-label and contains(@aria-label, '@')]")
        for el in elements:
             try:
                 aria_text = el.get_attribute("aria-label") or ""
                 emails.update(emails_from_text(aria_text))
             except StaleElementReferenceException:
                 continue
             except Exception as e_inner:
                 log.debug(f"Inner error getting aria label: {e_inner}")
    except (NoSuchElementException, WebDriverException) as e:
        log.debug(f"Error finding aria-label elements: {e}")
    except Exception as e:
         log.debug(f"Unexpected error in aria-label extraction: {e}")

    return list(emails)

def extract_obfuscated_emails(driver: webdriver.Chrome) -> List[str]:
    """Extract emails that are obfuscated with JavaScript or CSS."""
    emails = set()
    if not is_driver_alive(driver): return []

    # Execute JavaScript to find elements with data attributes containing email parts
    try:
        script = """
        const results = new Set();
        const elements = document.querySelectorAll('[data-email], [data-user], [data-name], [data-domain], [data-host]');

        elements.forEach(el => {
            try {
                let email = el.dataset.email || null;
                if (!email) {
                    const name = el.dataset.name || el.dataset.user || null;
                    const domain = el.dataset.domain || el.dataset.host || null;
                    if (name && domain) {
                        email = name + '@' + domain;
                    }
                }
                // Basic validation in JS
                if (email && email.includes('@') && email.includes('.')) {
                    results.add(email.toLowerCase().trim());
                }

                // Check innerText for reversed emails or similar tricks
                const text = el.innerText || el.textContent || '';
                if (text.includes('@') || text.includes('(at)') || text.includes('[at]')) {
                     // Further processing needed in Python for complex cases
                     // For now, just add if it looks like a potential email part
                     if (text.length < 100) { // Avoid huge blocks
                         results.add(text); // Add potential fragments for Python regex
                     }
                }

            } catch (e) {
                 // Ignore errors for individual elements
            }
        });

        // Look for emails split across spans (e.g., user [at] domain [dot] com)
        document.querySelectorAll('span').forEach(span => {
             try {
                if (span.innerText && span.innerText.includes('@')) {
                    results.add(span.innerText.toLowerCase().trim());
                }
             } catch (e) {}
        });


        return Array.from(results);
        """
        obfuscated_data = driver.execute_script(script)
        # Process results with Python regex for better accuracy
        for item in obfuscated_data:
             emails.update(emails_from_text(item))

    except WebDriverException as e:
        log.debug(f"JavaScript execution error for obfuscated emails: {e}")
    except Exception as e:
         log.debug(f"Unexpected error extracting obfuscated emails: {e}")

    # Add CSS ::before/:after content check? (More complex, might require specific JS)

    return list(emails)


def extract_social_media(html_content: str, url: str) -> Dict[str, str]:
    """Extract social media links from HTML content using Regex."""
    social_profiles = {}
    if not html_content or not isinstance(html_content, str):
        return {}

    base_domain = get_domain(url) # For context, if needed

    # Use BeautifulSoup to find links reliably
    soup = BeautifulSoup(html_content, "html.parser")
    links = soup.find_all('a', href=True)

    # Keywords often found near social links
    social_keywords = ['follow', 'social', 'connect', 'network', 'profile']

    found_platforms = set()

    for link in links:
        href = link.get('href', '').strip()
        if not href or href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:'):
            continue

        # Check parent elements for keywords indicating social links
        is_likely_social = False
        parent = link.parent
        for _ in range(3): # Check up to 3 levels up
            if parent and parent.name != 'body':
                parent_classes = ' '.join(parent.get('class', [])).lower()
                parent_id = parent.get('id', '').lower()
                if any(keyword in parent_classes or keyword in parent_id for keyword in social_keywords):
                    is_likely_social = True
                    break
                parent = parent.parent
            else:
                break

        # Also check link text/title/aria-label
        link_text = link.get_text(strip=True).lower()
        link_title = link.get('title', '').lower()
        link_aria = link.get('aria-label', '').lower()

        for platform, patterns in SOCIAL_MEDIA_PATTERNS.items():
             if platform in found_platforms: # Already found a link for this platform
                 continue

             for pattern in patterns:
                match = re.search(pattern, href, re.IGNORECASE)
                if match:
                    handle = match.group(1)

                    # Basic validation for handle
                    if not handle or len(handle) < 2 or handle.lower() in [
                        "sharer", "share", "intent", "tweet", "post", "view",
                        "plugins", "login", "signup", "home", "search", "explore",
                        "pages", "groups", "events", "ads", "about", "privacy", "terms"
                    ] or '/' in handle: # Handles shouldn't contain slashes typically
                        continue

                    # Additional check: platform name often in link text/attributes
                    platform_in_attrs = platform in link_text or platform in link_title or platform in link_aria

                    # Require either context keywords or platform name in attributes for higher confidence
                    if is_likely_social or platform_in_attrs:
                         # Construct full URL - use the matched href directly for accuracy
                         # social_profiles[platform] = href # Store the exact found URL
                         # Alternative: Construct canonical URL
                         constructed_url = ""
                         if platform == 'facebook':
                             constructed_url = f"https://facebook.com/{handle}"
                         elif platform == 'twitter':
                             constructed_url = f"https://twitter.com/{handle}"
                         elif platform == 'instagram':
                             constructed_url = f"https://instagram.com/{handle}"
                         elif platform == 'linkedin':
                             if 'company' in pattern: constructed_url = f"https://linkedin.com/company/{handle}"
                             elif 'school' in pattern: constructed_url = f"https://linkedin.com/school/{handle}"
                             else: constructed_url = f"https://linkedin.com/in/{handle}" # Assume 'in' if unsure
                         elif platform == 'youtube':
                             # Youtube handles can be complex (channel ID, custom URL, @handle)
                             # Storing the original href might be safer here
                             constructed_url = href # Use original link for YouTube
                             # Simplification - try to extract @handle if present
                             if '@' in handle:
                                 constructed_url = f"https://youtube.com/@{handle.split('@')[-1]}"
                         elif platform == 'pinterest':
                             constructed_url = f"https://pinterest.com/{handle}"
                         elif platform == 'tiktok':
                             constructed_url = f"https://tiktok.com/@{handle}"

                         if constructed_url:
                            social_profiles[platform] = constructed_url
                            found_platforms.add(platform)
                            break # Go to next platform once found

             if platform in found_platforms:
                 break # Move to next link if platform found


    return social_profiles


def extract_social_media_selenium(driver: webdriver.Chrome) -> Dict[str, str]:
    """Extract social media links using Selenium by checking links and icons."""
    social_profiles = {}
    if not is_driver_alive(driver): return {}

    found_platforms = set()
    processed_hrefs = set() # Avoid processing the same link multiple times

    try:
        # Get all links
        links = driver.find_elements(By.TAG_NAME, "a")

        for link in links:
            try:
                href = link.get_attribute("href")
                if not href or not isinstance(href, str) or href in processed_hrefs:
                    continue

                href = href.strip()
                processed_hrefs.add(href) # Mark as processed

                if not href or href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:') or href.startswith('javascript:'):
                     continue

                # Check each platform
                for platform, patterns in SOCIAL_MEDIA_PATTERNS.items():
                    if platform in found_platforms: continue

                    for pattern in patterns:
                        match = re.search(pattern, href, re.IGNORECASE)
                        if match:
                            handle = match.group(1)

                            # Basic validation
                            if not handle or len(handle) < 2 or handle.lower() in [
                                "sharer", "share", "intent", "tweet", "post", "view",
                                "plugins", "login", "signup", "home", "search", "explore",
                                "pages", "groups", "events", "ads", "about", "privacy", "terms"
                            ] or '/' in handle:
                                continue

                            # Store the actual href found
                            social_profiles[platform] = href
                            found_platforms.add(platform)
                            log.debug(f"Found social link via href: {platform} -> {href}")
                            break # Next platform

                    if platform in found_platforms:
                        break # Move to next link element

            except StaleElementReferenceException:
                continue # Element disappeared
            except Exception as e_inner:
                log.debug(f"Inner error processing link: {href} - {e_inner}")


        # Look for social media icons (often within links found above, but sometimes separate)
        # Combine selectors for efficiency
        icon_selectors = [
            "i[class*='fa-facebook']", "i[class*='fa-twitter']", "i[class*='fa-instagram']",
            "i[class*='fa-linkedin']", "i[class*='fa-youtube']", "i[class*='fa-pinterest']",
            "i[class*='fa-tiktok']", "i[class*='fa-x-twitter']", # FontAwesome 6 for X
            "[class*='social-icon']", "[class*='social-media']", "[class*='social-link']",
             "svg[aria-label*='facebook']", "svg[aria-label*='twitter']", "svg[aria-label*='instagram']", # SVGs with labels
             "svg[class*='facebook']", "svg[class*='twitter']", "svg[class*='instagram']" # SVGs with classes
        ]
        combined_selector = ", ".join(icon_selectors)

        try:
             icon_elements = driver.find_elements(By.CSS_SELECTOR, combined_selector)
        except WebDriverException as e:
             log.debug(f"Could not select icon elements: {e}")
             icon_elements = []


        for icon in icon_elements:
             try:
                # Try to find the parent link
                parent_link = None
                current_element = icon
                for _ in range(4): # Look up to 4 levels up
                    if current_element.tag_name == 'a':
                         parent_link = current_element
                         break
                    # Need to use XPath to find parent in Selenium Python
                    try:
                         current_element = current_element.find_element(By.XPATH, "..")
                    except NoSuchElementException:
                         break # Reached top or detached element
                if not parent_link:
                     continue

                href = parent_link.get_attribute("href")
                if not href or not isinstance(href, str) or href in processed_hrefs:
                     continue

                href = href.strip()
                processed_hrefs.add(href)

                if not href or href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:') or href.startswith('javascript:'):
                     continue

                # Check platforms again for this href
                for platform, patterns in SOCIAL_MEDIA_PATTERNS.items():
                     if platform in found_platforms: continue
                     for pattern in patterns:
                         match = re.search(pattern, href, re.IGNORECASE)
                         if match:
                             handle = match.group(1)
                             if not handle or len(handle) < 2 or '/' in handle: continue

                             social_profiles[platform] = href
                             found_platforms.add(platform)
                             log.debug(f"Found social link via icon parent: {platform} -> {href}")
                             break
                     if platform in found_platforms: break

             except StaleElementReferenceException:
                 continue
             except Exception as e_inner:
                 log.debug(f"Inner error processing icon element: {e_inner}")

    except WebDriverException as e:
        log.debug(f"Selenium error extracting social media: {e}")
    except Exception as e:
        log.error(f"Unexpected error extracting social media with Selenium: {e}", exc_info=True)


    # Final check: Remove generic platform links if specific ones were found
    # e.g., if we have linkedin.com/company/xyz and linkedin.com, keep the specific one
    to_remove = set()
    for p1 in social_profiles:
        for p2 in social_profiles:
            if p1 != p2 and p1 in SOCIAL_MEDIA_PATTERNS and p2 in SOCIAL_MEDIA_PATTERNS:
                 # Very basic check: if one URL is just the domain and the other is more specific
                 domain1 = get_domain(social_profiles[p1]).replace('www.','')
                 domain2 = get_domain(social_profiles[p2]).replace('www.','')
                 if domain1 == domain2:
                     path1 = urllib.parse.urlparse(social_profiles[p1]).path.strip('/')
                     path2 = urllib.parse.urlparse(social_profiles[p2]).path.strip('/')
                     if not path1 and path2: to_remove.add(p1)
                     elif path1 and not path2: to_remove.add(p2)

    for p in to_remove:
        if p in social_profiles:
             log.debug(f"Removing generic social link {p}: {social_profiles[p]}")
             del social_profiles[p]


    return social_profiles


# ───────────────── Selenium Driver ───────────────────
def make_driver(headless: bool, debug: bool = False) -> Optional[webdriver.Chrome]:
    """Create a Selenium WebDriver instance with anti-detection measures."""
    ua = random.choice(UA_POOL)
    log.debug(f"Using User-Agent: {ua}")

    opt = Options()
    if headless:
        log.debug("Running Chrome in headless mode")
        opt.add_argument("--headless=new") # Preferred headless mode

    # Standard arguments
    opt.add_argument(f"--user-agent={ua}")
    opt.add_argument("--window-size=1366,768") # Common resolution
    opt.add_argument("--disable-gpu") # Often necessary for headless/server environments
    opt.add_argument("--disable-dev-shm-usage") # Overcome limited resource problems
    opt.add_argument("--no-sandbox") # Bypass OS security model, required in some environments
    opt.add_argument("--disable-extensions")
    opt.add_argument("--log-level=3") # Suppress console logs from Chrome itself
    opt.add_argument("--silent")
    opt.add_argument("--disable-logging")
    opt.add_experimental_option('excludeSwitches', ['enable-logging', 'enable-automation'])
    opt.add_experimental_option("useAutomationExtension", False)

    # Anti-detection arguments
    opt.add_argument("--disable-blink-features=AutomationControlled")
    # opt.add_argument('--profile-directory=Default') # Using default profile might seem less automated
    # opt.add_argument("--disable-plugins-discovery")
    # opt.add_argument("--start-maximized") # Alternative to fixed window size

    # Randomize language settings slightly
    languages = ["en-US,en;q=0.9", "en-GB,en;q=0.9", "en-CA,en;q=0.9"]
    opt.add_argument(f"--lang={random.choice(languages)}")

    # Performance / Stability
    opt.add_argument("--disable-webgl")
    opt.add_argument("--disable-3d-apis")
    opt.add_argument("--disable-software-rasterizer")
    opt.page_load_strategy = 'normal' # 'eager' can sometimes miss dynamically loaded content

    # Try creating the driver
    drv = None
    try:
        drv = webdriver.Chrome(options=opt)
        log.debug("WebDriver created successfully.")

        # Apply stealth settings via CDP (after driver creation)
        # Using try/except for each CDP command in case one fails
        try:
            drv.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
                "source": """
                    // General Webdriver Spoofing
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] }); // Minimal plugin spoof

                    // Chrome Specific Spoofing
                    const originalQuery = window.navigator.permissions.query;
                    window.navigator.permissions.query = (parameters) => (
                        parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                    );
                    // Remove 'chrome' object if it causes issues (might break some sites)
                    // delete window.chrome;
                 """
             })
            log.debug("CDP stealth script injected.")
        except Exception as e:
            log.warning(f"Failed to inject CDP stealth script: {e}")

        # Set timeouts
        drv.set_page_load_timeout(30) # Increased page load timeout
        drv.set_script_timeout(15) # Timeout for execute_script
        drv.implicitly_wait(3) # Small implicit wait can help with timing issues

        log.debug("Driver timeouts set.")
        return drv

    except WebDriverException as e:
        log.error(f"Failed to create WebDriver: {e}")
        if "cannot find Chrome binary" in str(e).lower():
             log.error("Please ensure Chrome/Chromium is installed and accessible in your PATH.")
        elif "permission denied" in str(e).lower():
             log.error("Permission error creating driver. Check chromedriver permissions.")
        # Attempt to cleanup if partially created
        if drv:
            try: drv.quit()
            except: pass
        return None
    except Exception as e:
        log.error(f"Unexpected error creating WebDriver: {e}", exc_info=debug)
        if drv:
            try: drv.quit()
            except: pass
        return None

# ───────────────── Cookie/Popup Handling ───────────────────
def dismiss_cookie_consent(driver: webdriver.Chrome, debug: bool = False) -> bool:
    """Attempt to dismiss cookie consent popups using multiple strategies."""
    if not is_driver_alive(driver): return False

    strategies_attempted = 0
    strategies_succeeded = 0

    # Wait a short moment for popups to potentially appear
    time.sleep(random.uniform(1.0, 2.0))

    # --- Strategy 1: Find buttons by common text/ID/class ---
    try:
        strategies_attempted += 1
        # Combine XPaths for efficiency
        xpath_parts = []
        for pattern in COOKIE_BUTTON_PATTERNS:
             # Case-insensitive text match (covers text(), value, aria-label)
             xpath_parts.append(f"contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pattern}')")
             xpath_parts.append(f"contains(translate(@value, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pattern}')")
             xpath_parts.append(f"contains(translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{pattern}')")
             # Match IDs and classes (case-sensitive for IDs, usually lower for classes)
             xpath_parts.append(f"@id='{pattern}'")
             xpath_parts.append(f"contains(concat(' ', normalize-space(@class), ' '), ' {pattern} ')")


        # Find potential buttons (limit search depth?)
        # Prioritize buttons and elements with explicit roles
        xpath_query = f"//button[{' or '.join(xpath_parts)}] | //*[@role='button' and ({' or '.join(xpath_parts)})] | //a[{' or '.join(xpath_parts)}]"


        # log.debug(f"Cookie button XPath: {xpath_query}") # Very verbose
        potential_buttons = driver.find_elements(By.XPATH, xpath_query)
        log.debug(f"Found {len(potential_buttons)} potential cookie buttons via XPath.")


        clicked = False
        for element in potential_buttons:
            try:
                 # Check visibility and interactability robustly
                 if element.is_displayed() and element.is_enabled():
                     # Get text/id/class for logging
                     el_text = (element.text or "").strip().lower()
                     el_id = element.get_attribute("id") or ""
                     el_class = element.get_attribute("class") or ""
                     log.debug(f"Attempting to click cookie button. Text:'{el_text}', ID:'{el_id}', Class:'{el_class}'")
                     # Try JS click first - sometimes bypasses overlays
                     try:
                         driver.execute_script("arguments[0].click();", element)
                         log.debug("Clicked cookie button using JavaScript.")
                     except WebDriverException:
                         # Fallback to Selenium click
                         log.debug("JS click failed, trying Selenium click.")
                         element.click()
                         log.debug("Clicked cookie button using Selenium.")

                     time.sleep(random.uniform(0.5, 1.0)) # Wait for banner to disappear
                     strategies_succeeded += 1
                     clicked = True
                     break # Assume one click is enough
            except (ElementNotInteractableException, StaleElementReferenceException, ElementClickInterceptedException) as e_click:
                 log.debug(f"Button found but not interactable: {e_click}")
                 continue
            except WebDriverException as e_wd:
                 log.debug(f"WebDriverException clicking button: {e_wd}")
                 continue # Try next button
            except Exception as e_unexp:
                 log.error(f"Unexpected error clicking cookie button: {e_unexp}", exc_info=debug)
                 continue # Try next button

        if clicked: return True # Success from Strategy 1

    except WebDriverException as e:
        log.debug(f"WebDriverException during cookie button search: {e}")
    except Exception as e:
         log.error(f"Unexpected error in cookie strategy 1: {e}", exc_info=debug)


    # --- Strategy 2: Look for iframes ---
    try:
        strategies_attempted += 1
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        log.debug(f"Found {len(iframes)} iframes.")
        for iframe in iframes:
            try:
                 iframe_id = iframe.get_attribute("id") or ""
                 iframe_src = iframe.get_attribute("src") or ""
                 iframe_title = iframe.get_attribute("title") or ""

                 # Check if it looks like a cookie consent iframe
                 if any(term in iframe_id.lower() or term in iframe_src.lower() or term in iframe_title.lower()
                        for term in ["cookie", "consent", "privacy", "gdpr", "cmp", "onetrust", "trustarc", "banner"]):

                     log.debug(f"Switching to potential consent iframe: ID='{iframe_id}', Title='{iframe_title}', Src='{iframe_src[:100]}...'")
                     driver.switch_to.frame(iframe)

                     # Recursively call dismiss function inside the iframe
                     if dismiss_cookie_consent(driver, debug):
                         log.debug("Cookie consent dismissed within iframe.")
                         driver.switch_to.default_content()
                         strategies_succeeded += 1
                         return True # Success

                     # Switch back if recursive call didn't succeed
                     driver.switch_to.default_content()
                     log.debug("Switched back from iframe.")

            except NoSuchElementException:
                log.debug("Iframe disappeared before switching.")
                driver.switch_to.default_content() # Ensure we are back
                continue
            except WebDriverException as e_iframe:
                log.warning(f"Error processing iframe: {e_iframe}")
                try:
                     driver.switch_to.default_content() # Attempt to switch back safely
                except WebDriverException:
                     log.error("Failed to switch back from iframe, driver state might be unstable.")
                     # Consider restarting driver or marking site as failed
                     return False
                continue
            except Exception as e_unexp_iframe:
                 log.error(f"Unexpected error with iframe: {e_unexp_iframe}", exc_info=debug)
                 try:
                     driver.switch_to.default_content()
                 except WebDriverException: pass
                 continue

    except WebDriverException as e:
        log.debug(f"WebDriverException finding iframes: {e}")
    except Exception as e:
         log.error(f"Unexpected error in cookie strategy 2 (iframes): {e}", exc_info=debug)


    # --- Strategy 3: Press Escape key --- (Less reliable)
    # try:
    #     strategies_attempted += 1
    #     log.debug("Trying Escape key...")
    #     ActionChains(driver).send_keys(Keys.ESCAPE).perform()
    #     time.sleep(0.5)
    #     # How to verify success? Difficult. Assume it might work sometimes.
    #     # strategies_succeeded += 1 # Don't increment success unless verified
    #     # return True
    # except WebDriverException as e:
    #      log.debug(f"Error sending Escape key: {e}")
    # except Exception as e:
    #      log.error(f"Unexpected error sending ESC: {e}", exc_info=debug)


    # --- Strategy 4: Remove overlay elements via JavaScript --- (Aggressive)
    # try:
    #     strategies_attempted += 1
    #     log.debug("Trying to remove potential overlays via JS...")
    #     script = """
    #         const overlaySelectors = [
    #             '.modal', '.overlay', '.cookie-banner', '.cookie-consent',
    #             '.gdpr-banner', '.consent-banner', '#cookie-notice', '#gdpr-consent',
    #             '[id*="consent"]', '[class*="consent"]', '[id*="cookie"]', '[class*="cookie"]',
    #             'div[style*="position: fixed"][style*="z-index"]' // Fixed divs with high z-index
    #         ];
    #         let removedCount = 0;
    #         overlaySelectors.forEach(selector => {
    #             try {
    #                 document.querySelectorAll(selector).forEach(el => {
    #                     // Basic check to avoid removing the whole body if styles match
    #                     if (el.tagName !== 'BODY' && el.offsetHeight > 10 && el.offsetWidth > 10) {
    #                         // Check z-index for fixed elements
    #                         if (selector.includes('fixed')) {
    #                              const zIndex = parseInt(window.getComputedStyle(el).zIndex);
    #                              if (!isNaN(zIndex) && zIndex > 100) { // Only remove high z-index fixed elements
    #                                 el.remove(); removedCount++;
    #                              }
    #                         } else {
    #                              el.remove(); removedCount++;
    #                         }
    #                     }
    #                 });
    #             } catch (e) { console.warn('Error removing overlay:', selector, e); }
    #         });
    #         // Ensure body is scrollable
    #         try { document.body.style.overflow = 'auto'; } catch (e) {}
    #         return removedCount;
    #         """
    #     removed_count = driver.execute_script(script)
    #     if removed_count > 0:
    #         log.debug(f"Removed {removed_count} potential overlay elements via JS.")
    #         strategies_succeeded += 1
    #         return True # Assume success if something was removed
    # except WebDriverException as e_js:
    #      log.debug(f"Error executing JS overlay removal: {e_js}")
    # except Exception as e_unexp_js:
    #      log.error(f"Unexpected error removing overlays: {e_unexp_js}", exc_info=debug)


    log.debug(f"Cookie dismissal attempts finished. Succeeded: {strategies_succeeded}/{strategies_attempted}")
    return strategies_succeeded > 0


# ───────────────── Email Extraction ───────────────────
def selenium_emails(driver: webdriver.Chrome, url: str, debug: bool = False) -> List[Tuple[str, Dict[str, Any]]]:
    """Extract emails from a single page using Selenium with context information."""
    found_emails_with_context: List[Tuple[str, Dict[str, Any]]] = []
    processed_emails: Set[str] = set() # Track emails found on this specific page

    if not is_driver_alive(driver):
         log.warning(f"Driver not alive when trying to process {url}")
         raise WebDriverException("Driver is not alive") # Raise exception to signal failure

    try:
        log.debug(f"Navigating to {url} with Selenium")
        driver.get(url)

        # Try to dismiss cookie consent popups after navigation
        dismissed = dismiss_cookie_consent(driver, debug)
        if dismissed:
             log.debug(f"Cookie consent likely dismissed for {url}")
             time.sleep(0.5) # Short pause after dismissal


    except TimeoutException:
        log.warning(f"Timeout loading {url}")
        # Don't return empty immediately, maybe some content loaded partially
        # Or raise an exception to be caught by the caller?
        # Let's try to proceed and see if we can extract anything from partial load
        pass # Continue and try extraction
    except WebDriverException as e:
         log.error(f"WebDriverException loading {url}: {e}")
         # This might indicate a dead driver or major navigation issue
         raise # Re-raise to be handled by the main loop (circuit breaker)


    # Wait for body element (use smaller timeout as page load might have timed out)
    try:
        WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    except TimeoutException:
        log.warning(f"Timeout waiting for body element on {url} after navigation attempt.")
        # Proceed, but expect potential issues finding elements
    except WebDriverException as e:
         log.error(f"WebDriverException waiting for body: {e}")
         raise # Re-raise critical errors

    page_source = ""
    try:
        page_source = driver.page_source
        if not page_source:
             log.warning(f"Page source is empty for {url}")
             # No point continuing if source is empty
             return []
    except WebDriverException as e:
         log.warning(f"Could not get page source for {url}: {e}")
         # Cannot proceed without source or body
         return []


    is_contact_page = any(p.strip('/') in url.lower() for p in CONTACT_PATHS if p != '/') or "contact" in url.lower() or "about" in url.lower()


    # --- Extraction Methods ---

    # 1. Extract from visible text (body.text)
    try:
        body_element = driver.find_element(By.TAG_NAME, "body")
        # Get text content robustly, handling potential StaleElementReferenceException
        for _ in range(2): # Retry once if stale
            try:
                body_text = body_element.text
                if body_text:
                    emails = emails_from_text(body_text)
                    for email in emails:
                        if email not in processed_emails:
                            context = {"found_in_body": True, "found_on_contact_page": is_contact_page}
                            found_emails_with_context.append((email, context))
                            processed_emails.add(email)
                    if emails and debug: log.debug(f"Found {len(emails)} emails in body text")
                break # Success
            except StaleElementReferenceException:
                 log.debug("Body element became stale, retrying find...")
                 time.sleep(0.2)
                 body_element = driver.find_element(By.TAG_NAME, "body") # Re-find element
            except WebDriverException as e_body:
                 log.debug(f"Could not get body text: {e_body}")
                 break # Stop trying if WebDriverException occurs
    except NoSuchElementException:
         log.warning(f"Could not find body element on {url}")
    except Exception as e:
        log.debug(f"Error extracting body text: {e}")


    # 2. Extract from elements containing @ (more targeted than full body text)
    try:
        # Limit search to common containers + links to avoid excessive elements
        elements = driver.find_elements(By.XPATH, "//p[contains(text(), '@')] | //span[contains(text(), '@')] | //div[contains(text(), '@')] | //a[contains(text(), '@')]")[:50] # Limit elements
        for el in elements:
            try:
                # Get textContent which includes hidden text unlike .text
                txt = el.get_attribute("textContent") or ""
                new_emails = emails_from_text(txt)
                for email in new_emails:
                    if email not in processed_emails:
                        context = {"found_in_element": True, "found_on_contact_page": is_contact_page}
                        # Check if near contact words (expensive, do selectively?)
                        # Check if in header/footer (more reliable)
                        in_header, in_footer = False, False
                        try:
                             current = el
                             for _ in range(6): # Check up to 6 levels up
                                 if not current or current.tag_name == 'body': break
                                 tag = current.tag_name.lower()
                                 eid = (current.get_attribute("id") or "").lower()
                                 ecls = (current.get_attribute("class") or "").lower()
                                 if tag == "header" or "header" in eid or "header" in ecls or tag == "nav" or "nav" in eid or "menu" in eid:
                                     in_header = True; break
                                 if tag == "footer" or "footer" in eid or "footer" in ecls or "copyright" in eid or "copyright" in ecls:
                                     in_footer = True; break
                                 # Use XPath for parent in loop
                                 current = current.find_element(By.XPATH, '..')
                        except (NoSuchElementException, StaleElementReferenceException): pass # Stop checking ancestors
                        except WebDriverException as e_ancestor: log.debug(f"Error checking ancestors: {e_ancestor}")

                        context["found_in_header"] = in_header
                        context["found_in_footer"] = in_footer
                        found_emails_with_context.append((email, context))
                        processed_emails.add(email)
                if new_emails and debug: log.debug(f"Found emails in element textContent: {new_emails}")
            except StaleElementReferenceException: continue
            except WebDriverException as e_el: log.debug(f"Error processing element with @: {e_el}")
    except WebDriverException as e: log.debug(f"Error finding elements with @: {e}")


    # 3. Extract from mailto: links
    try:
        links = driver.find_elements(By.XPATH, "//a[starts-with(@href, 'mailto:')]")
        for a in links:
            try:
                href = a.get_attribute("href") or ""
                # Mailto link might have subject etc., extract email part
                email_part = href.split('?')[0].replace('mailto:', '', 1)
                new_emails = emails_from_text(email_part) # Use regex on extracted part
                for email in new_emails:
                     if email not in processed_emails:
                        context = {"found_in_mailto": True, "found_on_contact_page": is_contact_page}
                        # Check header/footer context
                        in_header, in_footer = False, False
                        try:
                             current = a
                             for _ in range(6):
                                 if not current or current.tag_name == 'body': break
                                 tag = current.tag_name.lower()
                                 eid = (current.get_attribute("id") or "").lower()
                                 ecls = (current.get_attribute("class") or "").lower()
                                 if tag == "header" or "header" in eid or "header" in ecls or tag == "nav" or "nav" in eid or "menu" in eid:
                                     in_header = True; break
                                 if tag == "footer" or "footer" in eid or "footer" in ecls or "copyright" in eid or "copyright" in ecls:
                                     in_footer = True; break
                                 current = current.find_element(By.XPATH, '..')
                        except (NoSuchElementException, StaleElementReferenceException): pass
                        except WebDriverException as e_ancestor: log.debug(f"Error checking mailto ancestors: {e_ancestor}")

                        context["found_in_header"] = in_header
                        context["found_in_footer"] = in_footer
                        found_emails_with_context.append((email, context))
                        processed_emails.add(email)
                if new_emails and debug: log.debug(f"Found emails in mailto: {new_emails}")
            except StaleElementReferenceException: continue
            except WebDriverException as e_mailto: log.debug(f"Error processing mailto link: {e_mailto}")
    except WebDriverException as e: log.debug(f"Error finding mailto links: {e}")


    # 4. Extract from full page source (redundant if body text worked, but catches comments/hidden)
    # Only run if body text extraction wasn't very successful? No, run anyway for hidden ones.
    try:
        # page_source already fetched earlier
        if page_source:
             source_emails = emails_from_text(page_source)
             newly_found_count = 0
             for email in source_emails:
                 if email not in processed_emails:
                     context = {"found_in_source": True, "found_on_contact_page": is_contact_page}
                     # Less valuable context, add only if truly new
                     found_emails_with_context.append((email, context))
                     processed_emails.add(email)
                     newly_found_count += 1
             if newly_found_count > 0 and debug:
                 log.debug(f"Found {newly_found_count} additional emails in page source")
    except Exception as e: log.debug(f"Error extracting from page source: {e}")


    # 5. Extract from meta tags
    try:
        meta_tags = driver.find_elements(By.TAG_NAME, "meta")
        for tag in meta_tags:
            try:
                 content = tag.get_attribute("content") or ""
                 if "@" in content:
                     new_emails = emails_from_text(content)
                     for email in new_emails:
                         if email not in processed_emails:
                             context = {"found_in_meta": True, "found_on_contact_page": is_contact_page}
                             found_emails_with_context.append((email, context))
                             processed_emails.add(email)
                     if new_emails and debug: log.debug(f"Found emails in meta tag: {new_emails}")
            except StaleElementReferenceException: continue
            except WebDriverException as e_meta: log.debug(f"Error processing meta tag: {e_meta}")
    except WebDriverException as e: log.debug(f"Error finding meta tags: {e}")


    # 6. Extract from inline scripts (limit search)
    try:
        scripts = driver.find_elements(By.TAG_NAME, "script")
        script_texts = []
        for script in scripts[:25]: # Limit number of scripts checked
            try:
                script_text = script.get_attribute("textContent") or ""
                if script_text and "@" in script_text and len(script_text) < 50000: # Avoid huge scripts
                     script_texts.append(script_text)
            except StaleElementReferenceException: continue
            except WebDriverException as e_script_get: log.debug(f"Error getting script content: {e_script_get}")

        combined_script_text = " ".join(script_texts)
        if combined_script_text:
             script_emails = emails_from_text(combined_script_text)
             newly_found_count = 0
             for email in script_emails:
                 if email not in processed_emails:
                     context = {"found_in_script": True, "found_on_contact_page": is_contact_page}
                     found_emails_with_context.append((email, context))
                     processed_emails.add(email)
                     newly_found_count += 1
             if newly_found_count > 0 and debug:
                 log.debug(f"Found {newly_found_count} emails in inline scripts")
    except WebDriverException as e: log.debug(f"Error finding script tags: {e}")
    except Exception as e: log.debug(f"Error extracting from scripts: {e}")


    # 7. Extract from forms (action, hidden fields)
    try:
        forms = driver.find_elements(By.TAG_NAME, "form")
        for form in forms:
            try:
                # Check form action for mailto:
                action = form.get_attribute("action") or ""
                if "mailto:" in action:
                     email_part = action.split('?')[0].replace('mailto:', '', 1)
                     new_emails = emails_from_text(email_part)
                     for email in new_emails:
                         if email not in processed_emails:
                             context = {"found_in_form": True, "found_on_contact_page": is_contact_page}
                             found_emails_with_context.append((email, context))
                             processed_emails.add(email)
                     if new_emails and debug: log.debug(f"Found emails in form mailto action: {new_emails}")

                # Check hidden fields for values containing @
                hidden_fields = form.find_elements(By.XPATH, ".//input[@type='hidden']")
                for field in hidden_fields:
                     field_value = field.get_attribute("value") or ""
                     if "@" in field_value:
                         new_emails = emails_from_text(field_value)
                         for email in new_emails:
                             if email not in processed_emails:
                                 context = {"found_in_form": True, "found_in_hidden_field": True, "found_on_contact_page": is_contact_page}
                                 found_emails_with_context.append((email, context))
                                 processed_emails.add(email)
                         if new_emails and debug: log.debug(f"Found emails in hidden form field: {new_emails}")
            except StaleElementReferenceException: continue
            except WebDriverException as e_form_inner: log.debug(f"Error processing form internals: {e_form_inner}")
    except WebDriverException as e: log.debug(f"Error finding form tags: {e}")


    # 8. Extract from accessibility elements
    try:
        accessibility_emails = extract_from_accessibility_elements(driver)
        newly_found_count = 0
        for email in accessibility_emails:
            if email not in processed_emails:
                context = {"found_in_accessibility": True, "found_on_contact_page": is_contact_page}
                found_emails_with_context.append((email, context))
                processed_emails.add(email)
                newly_found_count += 1
        if newly_found_count > 0 and debug:
            log.debug(f"Found {newly_found_count} emails in accessibility attributes")
    except WebDriverException as e: log.debug(f"Error extracting from accessibility elements: {e}")


    # 9. Extract obfuscated emails (JS data attributes, etc.)
    try:
        obfuscated_emails = extract_obfuscated_emails(driver)
        newly_found_count = 0
        for email in obfuscated_emails:
            if email not in processed_emails:
                context = {"found_obfuscated": True, "found_on_contact_page": is_contact_page}
                found_emails_with_context.append((email, context))
                processed_emails.add(email)
                newly_found_count += 1
        if newly_found_count > 0 and debug:
            log.debug(f"Found {newly_found_count} potential obfuscated emails")
    except WebDriverException as e: log.debug(f"Error extracting obfuscated emails: {e}")


    log.debug(f"Finished Selenium extraction for {url}. Found {len(found_emails_with_context)} raw email instances.")
    return found_emails_with_context


def requests_emails(url: str, debug: bool = False) -> Tuple[List[Tuple[str, Dict[str, Any]]], Optional[str]]:
    """Extract emails from a website using requests and BeautifulSoup with context.
       Returns tuple: (list_of_emails_with_context, html_content_or_none)
    """
    found_emails_with_context = []
    processed_emails = set()
    html_content = None

    try:
        headers = {
            "User-Agent": random.choice(UA_POOL),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Referer": url.split('/')[0] + "//" + url.split('/')[2] + "/", # Basic referer
            "DNT": "1", # Do Not Track
            "Upgrade-Insecure-Requests": "1"
        }
        r = requests.get(url, timeout=10, headers=headers, allow_redirects=True)
        r.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        # Check content type
        content_type = r.headers.get('Content-Type', '').lower()
        if 'text/html' not in content_type:
            log.debug(f"Skipping non-HTML content type '{content_type}' for {url}")
            return [], None

        html_content = r.text
        if not html_content:
             log.warning(f"Empty content received from {url}")
             return [], None

        soup = BeautifulSoup(html_content, "html.parser")
        is_contact_page = any(p.strip('/') in url.lower() for p in CONTACT_PATHS if p != '/') or "contact" in url.lower() or "about" in url.lower()


        # 1. Extract from visible text
        visible_text = soup.get_text(separator=' ')
        if visible_text:
            text_emails = emails_from_text(visible_text)
            for email in text_emails:
                if email not in processed_emails:
                     context = {"found_in_text": True, "found_on_contact_page": is_contact_page}
                     found_emails_with_context.append((email, context))
                     processed_emails.add(email)
            if debug and text_emails: log.debug(f"Requests: Found {len(text_emails)} emails in visible text")


        # 2. Extract from mailto links
        for a in soup.find_all('a', href=True):
            href = a.get('href', '')
            if href.startswith('mailto:'):
                email_part = href.split('?')[0].replace('mailto:', '', 1)
                new_emails = emails_from_text(email_part)
                for email in new_emails:
                     if email not in processed_emails:
                        context = {"found_in_mailto": True, "found_on_contact_page": is_contact_page}
                        # Check header/footer context (simplified for requests)
                        in_header = any(p.name == 'header' or (p.get('id') and 'header' in p.get('id', '').lower()) for p in a.parents)
                        in_footer = any(p.name == 'footer' or (p.get('id') and 'footer' in p.get('id', '').lower()) for p in a.parents)
                        context["found_in_header"] = in_header
                        context["found_in_footer"] = in_footer
                        found_emails_with_context.append((email, context))
                        processed_emails.add(email)
                if debug and new_emails: log.debug(f"Requests: Found emails in mailto: {new_emails}")

        # 3. Extract from meta tags
        for meta in soup.find_all('meta', content=True):
             content = meta.get('content', '')
             if '@' in content:
                 new_emails = emails_from_text(content)
                 for email in new_emails:
                     if email not in processed_emails:
                         context = {"found_in_meta": True, "found_on_contact_page": is_contact_page}
                         found_emails_with_context.append((email, context))
                         processed_emails.add(email)
                 if debug and new_emails: log.debug(f"Requests: Found emails in meta: {new_emails}")


        # 4. Check full HTML source (includes comments etc.)
        source_emails = emails_from_text(html_content)
        newly_found_count = 0
        for email in source_emails:
            if email not in processed_emails:
                context = {"found_in_source": True, "found_on_contact_page": is_contact_page}
                found_emails_with_context.append((email, context))
                processed_emails.add(email)
                newly_found_count += 1
        if debug and newly_found_count > 0: log.debug(f"Requests: Found {newly_found_count} additional emails in source")


        if debug and found_emails_with_context:
            log.debug(f"Requests: Found {len(processed_emails)} unique emails total for {url}")

        return found_emails_with_context, html_content

    except requests.exceptions.Timeout:
        log.warning(f"Requests timeout for {url}")
        return [], None
    except requests.exceptions.RequestException as e:
        log.warning(f"Requests error for {url}: {e}")
        # Could check status code here, e.g., if e.response is not None
        # if e.response is not None and e.response.status_code == 403:
        #     log.warning(f"Access denied (403) for {url}")
        return [], None # Treat request errors as no emails found by this method
    except Exception as e:
        log.error(f"Unexpected error in requests_emails for {url}: {e}", exc_info=debug)
        return [], None


def harvest_emails(site: str, business_name: str, driver: webdriver.Chrome, debug: bool = False) -> Tuple[List[str], Dict[str, str], str]:
    """Harvest emails and social media profiles from a website.

    Args:
        site: The website URL.
        business_name: Name of the business for context.
        driver: Selenium WebDriver instance.
        debug: Debug logging flag.

    Returns:
        A tuple containing:
        - List of prioritized, unique email addresses found.
        - Dictionary of social media profiles {platform: url}.
        - Status string ("found", "checked", "failed").
    """
    if not site or site == "N/A":
        return [], {}, "skipped" # Or "checked" if N/A implies processed?

    site = normalize_url(site)
    if not site:
        log.warning(f"Invalid URL format for business '{business_name}', skipping.")
        return [], {}, "skipped" # Mark as skipped due to bad URL

    domain = get_domain(site)
    if not domain:
        log.warning(f"Could not extract domain from '{site}' for '{business_name}', skipping.")
        return [], {}, "skipped"

    all_emails_with_context: List[Tuple[str, Dict[str, Any]]] = []
    unique_emails_found = set()
    social_profiles: Dict[str, str] = {}
    status = "checked" # Default status if process completes but finds nothing


    # Check circuit breaker before any network access
    if circuit_breaker.is_open(domain):
        log.warning(f"Circuit breaker open for {domain}, skipping {site}")
        return [], {}, "failed" # Mark as failed due to circuit breaker


    # --- Attempt 1: Requests ---
    req_emails_ctx, html_content = [], None
    try:
        log.debug(f"[{domain}] Trying requests method...")
        req_emails_ctx, html_content = requests_emails(site, debug)
        all_emails_with_context.extend(req_emails_ctx)
        for email, _ in req_emails_ctx: unique_emails_found.add(email)

        # Extract social media from requests HTML if content was retrieved
        if html_content:
            social_profiles.update(extract_social_media(html_content, site))
            if social_profiles: log.debug(f"[{domain}] Found social via requests: {list(social_profiles.keys())}")

        if unique_emails_found:
             log.info(f"[{domain}] Found {len(unique_emails_found)} emails via requests.")
             # Consider stopping here if requests found emails? Or always try Selenium for more?
             # Decision: Always try Selenium for potentially more emails/social links unless requests failed badly

    except Exception as e_req:
        # This catch block is mostly for unexpected errors within requests_emails itself
        log.error(f"[{domain}] Unexpected error during requests phase: {e_req}", exc_info=debug)
        # Don't mark as failed yet, Selenium might work

    # --- Attempt 2: Selenium (Main Page) ---
    # Run Selenium if requests found nothing, or always run it for better coverage?
    # Decision: Always run Selenium unless requests failed catastrophically (which it shouldn't here)
    selenium_worked = False
    try:
        log.debug(f"[{domain}] Trying Selenium method (main page)...")
        if not is_driver_alive(driver):
             log.error(f"[{domain}] Driver died before Selenium main page attempt for {site}")
             raise WebDriverException("Driver died") # Trigger circuit breaker

        selenium_main_emails_ctx = selenium_emails(driver, site, debug)
        for email, ctx in selenium_main_emails_ctx:
            if email not in unique_emails_found:
                 all_emails_with_context.append((email, ctx))
                 unique_emails_found.add(email)

        # Extract social media using Selenium (might find more than requests)
        selenium_social = extract_social_media_selenium(driver)
        if selenium_social:
            log.debug(f"[{domain}] Found/updated social via Selenium: {list(selenium_social.keys())}")
            social_profiles.update(selenium_social) # Update/add Selenium findings

        selenium_worked = True # Mark Selenium main page attempt as successful (even if no emails found)


    except (WebDriverException, TimeoutException) as e_main_selenium:
        log.warning(f"[{domain}] Selenium failed on main page {site}: {type(e_main_selenium).__name__} - {e_main_selenium}")
        circuit_breaker.record_failure(domain) # Record failure for this domain
        # Don't necessarily stop, contact pages might still work if it was just the homepage
    except Exception as e_main_unexp:
         log.error(f"[{domain}] Unexpected error during Selenium main page processing for {site}: {e_main_unexp}", exc_info=debug)
         circuit_breaker.record_failure(domain)


    # --- Attempt 3: Selenium (Contact Pages) ---
    # Only check contact pages if no emails were found so far OR if Selenium worked on main page
    if (not unique_emails_found or selenium_worked) and len(unique_emails_found) < 3 : # Heuristic: check contact if few emails found
        log.debug(f"[{domain}] Checking contact pages...")
        for path in CONTACT_PATHS:
            # Avoid checking home page again if path is '/' or empty
            if not path or path == '/': continue

            contact_url = site.rstrip('/') + path
            log.debug(f"[{domain}] Checking contact page: {contact_url}")

            try:
                 if not is_driver_alive(driver):
                     log.error(f"[{domain}] Driver died before Selenium contact page attempt for {contact_url}")
                     raise WebDriverException("Driver died")

                 contact_emails_ctx = selenium_emails(driver, contact_url, debug)
                 newly_found_count = 0
                 for email, ctx in contact_emails_ctx:
                     if email not in unique_emails_found:
                         all_emails_with_context.append((email, ctx))
                         unique_emails_found.add(email)
                         newly_found_count += 1

                 if newly_found_count > 0:
                     log.info(f"[{domain}] Found {newly_found_count} new emails on contact page {path}")

                 # Extract/update social media from contact page
                 contact_social = extract_social_media_selenium(driver)
                 if contact_social:
                     log.debug(f"[{domain}] Found/updated social via contact page {path}: {list(contact_social.keys())}")
                     social_profiles.update(contact_social)

                 # Optional: Stop checking contact pages if enough emails found?
                 if len(unique_emails_found) >= 3: # Heuristic: Stop if we have a few emails
                      log.debug(f"[{domain}] Found sufficient emails ({len(unique_emails_found)}), stopping contact page search.")
                      break

                 rdelay(CONTACT_WAIT_MIN, CONTACT_WAIT_MAX) # Delay between contact page checks

            except (WebDriverException, TimeoutException) as e_contact_selenium:
                 log.warning(f"[{domain}] Selenium failed on contact page {contact_url}: {type(e_contact_selenium).__name__} - {e_contact_selenium}")
                 # Don't record failure here again unless it's a driver death, main page failure was recorded
                 if "invalid session id" in str(e_contact_selenium).lower():
                      circuit_breaker.record_failure(domain) # Record driver death
                      break # Stop checking contact pages if driver died
                 # Continue to next contact page otherwise
            except Exception as e_contact_unexp:
                 log.error(f"[{domain}] Unexpected error processing contact page {contact_url}: {e_contact_unexp}", exc_info=debug)
                 # Continue to next contact page

            # Break loop immediately if driver died
            if not is_driver_alive(driver):
                 log.error(f"[{domain}] Driver died during contact page processing. Stopping search for {site}")
                 circuit_breaker.record_failure(domain)
                 status = "failed" # Mark as failed if driver died
                 break


    # --- Final Processing ---
    # Clean the combined list of emails (including duplicates with different contexts)
    cleaned_raw_emails = clean_emails([e for e, _ in all_emails_with_context])
    if debug and len(cleaned_raw_emails) != len(unique_emails_found):
         log.debug(f"[{domain}] Initial unique count: {len(unique_emails_found)}, after clean_emails: {len(cleaned_raw_emails)}")
         unique_emails_found = set(cleaned_raw_emails) # Update unique set after cleaning

    # Score the emails using their contexts
    scored_emails: List[Tuple[str, int]] = []
    email_contexts: Dict[str, Dict[str, Any]] = {}

    # Combine contexts for unique emails before scoring
    for email, context in all_emails_with_context:
        email_clean = email.strip().lower()
        if email_clean in unique_emails_found: # Only process cleaned, unique emails
             if email_clean not in email_contexts:
                 email_contexts[email_clean] = {}
             # Merge contexts, favoring True values
             for key, value in context.items():
                 if value:
                     email_contexts[email_clean][key] = True

    # Now score based on combined context
    for email in unique_emails_found:
        combined_context = email_contexts.get(email, {})
        score = score_email(email, domain, combined_context)
        scored_emails.append((email, score))
        if debug: log.debug(f"[{domain}] Scored '{email}': {score} (Context: {combined_context})")

    # Prioritize based on score
    prioritized_emails = prioritize_emails(scored_emails)

    # Add guessed emails if *no* emails were found? (Optional, can be noisy)
    # if not prioritized_emails and business_name:
    #     log.debug(f"[{domain}] No emails found, attempting to guess...")
    #     guessed = guess_emails_from_domain(domain, business_name)
    #     if guessed:
    #         log.info(f"[{domain}] Guessed emails: {guessed}")
    #         prioritized_emails.extend(guessed) # Add guesses at the end

    # Determine final status
    if prioritized_emails:
        status = "found"
        circuit_breaker.record_success(domain) # Record success if emails found
        log.info(f"[{domain}] SUCCESS: Found {len(prioritized_emails)} emails. Top: {prioritized_emails[0]}")
    elif status != "failed": # Avoid overriding failure status
         status = "checked" # Found nothing, but process completed without critical failure
         circuit_breaker.record_success(domain) # Also record success if checked thoroughly without errors
         log.info(f"[{domain}] CHECKED: No emails found.")
    else:
         log.warning(f"[{domain}] FAILED: Processing ended with status 'failed'.")


    # Clean up social profiles (remove fragments, ensure https)
    final_social_profiles = {}
    for platform, link in social_profiles.items():
        try:
            parsed_link = urllib.parse.urlparse(link)
            # Reconstruct with https, netloc, and path only
            clean_link = f"https://{parsed_link.netloc}{parsed_link.path}"
            # Remove trailing slash
            clean_link = clean_link.rstrip('/')
            # Basic validation
            if platform in clean_link and '.' in parsed_link.netloc:
                final_social_profiles[platform] = clean_link
            else:
                 log.debug(f"[{domain}] Skipping potentially invalid social link for {platform}: {link}")
        except Exception as e_social_clean:
             log.warning(f"[{domain}] Error cleaning social link {link}: {e_social_clean}")
             final_social_profiles[platform] = link # Keep original if cleaning fails


    if final_social_profiles:
         log.info(f"[{domain}] Found {len(final_social_profiles)} social profiles: {list(final_social_profiles.keys())}")

    return prioritized_emails, final_social_profiles, status


# ───────────────── Worker Function ────────────────────
# Flag for signal handling
shutdown_flag = False

def signal_handler(signum, frame):
    """Sets the shutdown flag upon receiving SIGINT or SIGTERM."""
    global shutdown_flag
    log.warning(f"Received signal {signum}. Initiating graceful shutdown...")
    shutdown_flag = True

def process_business(record: Dict[str, Any], collection, headless: bool, debug: bool) -> Tuple[str, str, int, int]:
    """Processes a single business record: creates driver, scrapes, updates DB."""
    business_id = record.get('_id')
    website = record.get('website')
    business_name = record.get('businessname', 'Unknown Business')
    log.info(f"Processing: {business_name} ({website})")

    driver = None
    emails = []
    social_profiles = {}
    status = "failed" # Default to failed unless successful

    try:
        if not website or website == "N/A":
            log.info(f"Skipping {business_name} due to missing/invalid website.")
            status = "skipped" # Mark as skipped
            # Still update DB to reflect this skip status
            update_data = {
                "emailstatus": status,
                "email": [],
                "social_profiles": {},
                "emailscraped_at": datetime.utcnow()
            }
            collection.update_one({"_id": business_id}, {"$set": update_data})
            return business_id, status, 0, 0

        # Create a new driver instance for this task
        log.debug(f"Creating new driver for {business_name}")
        driver = make_driver(headless, debug)
        if driver is None:
            log.error(f"Failed to create driver for {business_name}, marking as failed.")
            status = "failed"
            domain = get_domain(normalize_url(website))
            circuit_breaker.record_failure(domain) # Record failure if driver creation fails
            raise Exception("Driver creation failed") # Propagate failure


        emails, social_profiles, status = harvest_emails(website, business_name, driver, debug)

        # Update MongoDB record
        log.debug(f"Updating DB for {business_name} with status: {status}")
        update_data = {
            "emailstatus": status,
            "email": emails[:10], # Store top 10 emails found
            "social_profiles": social_profiles,
            "emailscraped_at": datetime.utcnow()
        }
        try:
            result = collection.update_one({"_id": business_id}, {"$set": update_data})
            if result.matched_count == 0:
                log.warning(f"Could not find record with ID {business_id} to update.")
            elif result.modified_count == 0 and result.matched_count == 1:
                 log.debug(f"Record {business_id} already had the same data.")


        except PyMongoError as e_update:
            log.error(f"Failed to update MongoDB for {business_name} (ID: {business_id}): {e_update}")
            # Don't change status back to failed if scraping succeeded but DB failed
            # Maybe retry update later? For now, log the error.


        return business_id, status, len(emails), len(social_profiles)

    except Exception as e:
        log.error(f"Error processing {business_name} ({website}): {e}", exc_info=debug)
        status = "failed" # Ensure status is marked as failed on any exception
        domain = get_domain(normalize_url(website))
        circuit_breaker.record_failure(domain) # Record failure if any exception occurs

        # Attempt to update DB with failure status
        try:
            update_data = {
                "emailstatus": status,
                "emailscraped_at": datetime.utcnow()
            }
            # Optionally clear email/social if it failed
            # update_data["email"] = []
            # update_data["social_profiles"] = {}
            collection.update_one({"_id": business_id}, {"$set": update_data})
            log.info(f"Marked {business_name} as failed in DB.")
        except PyMongoError as e_fail_update:
            log.error(f"Failed to update MongoDB with failure status for {business_name}: {e_fail_update}")
        except Exception as e_db_final:
             log.error(f"Unexpected error updating DB failure status for {business_name}: {e_db_final}")


        return business_id, status, 0, 0 # Return failure status

    finally:
        # Ensure driver is always closed if it was created
        if driver:
            log.debug(f"Closing driver for {business_name}")
            try:
                driver.quit()
            except WebDriverException as e_quit:
                 log.warning(f"Error quitting driver for {business_name}: {e_quit}")
            except Exception as e_quit_unexp:
                  log.error(f"Unexpected error quitting driver: {e_quit_unexp}", exc_info=debug)


# ────────────────── Main Logic ───────────────────────
def main():
    """Main execution function."""
    global shutdown_flag
    args = parse_args()
    setup_logging(args.debug)

    log.info("--- Email & Social Scraper Initializing ---")
    log.info(f"Args: {vars(args)}")

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Setup MongoDB
    client, collection = setup_mongodb(args.mongo_uri, args.db_name, args.collection)
    if client is None or collection is None:
        log.critical("Exiting due to MongoDB connection failure.")
        sys.exit(1)

    # Handle standalone commands
    if args.reset_status:
        reset_email_status(collection, args.debug)
        log.info("Status reset complete. Exiting.")
        client.close()
        sys.exit(0)

    if args.list_records:
        list_business_records(collection, args.debug)
        log.info("Record listing complete. Exiting.")
        client.close()
        sys.exit(0)

    # Handle single URL test
    if args.test_url:
        log.info(f"--- Testing single URL: {args.test_url} ---")
        test_driver = None
        try:
            test_driver = make_driver(args.headless, args.debug)
            if test_driver is None:
                 log.error("Failed to create driver for single URL test.")
            else:
                # Use a dummy business name for testing
                emails, social, status = harvest_emails(args.test_url, "Test Business", test_driver, args.debug)
                log.info(f"--- Test Results for {args.test_url} ---")
                log.info(f"Status: {status}")
                log.info(f"Emails Found ({len(emails)}):")
                for i, email in enumerate(emails):
                    log.info(f"  {i+1}. {email}")
                if not emails: log.info("  None")

                log.info(f"Social Profiles Found ({len(social)}):")
                for platform, link in social.items():
                    log.info(f"  {platform.capitalize()}: {link}")
                if not social: log.info("  None")
                log.info("--- Test Complete ---")
        except Exception as e_test:
            log.error(f"Error during single URL test: {e_test}", exc_info=args.debug)
        finally:
            if test_driver:
                try: test_driver.quit()
                except: pass
            client.close() # Close DB connection
            sys.exit(0)

    # --- Main Processing Loop ---
    start_time = time.time()
    log.info("--- Starting Main Processing ---")

    db_stats = check_database_status(collection)
    log.info("Database Status:")
    for key, value in db_stats.items():
        log.info(f"  {key.replace('_', ' ').capitalize()}: {value}")

    if db_stats["businesses_pending_email"] == 0:
        log.info("No businesses found with 'pending' status. Nothing to process.")
        if args.export_csv:
             log.info("Proceeding with CSV export based on current data.")
             export_to_csv(collection, args.export_csv, args.debug)
        client.close()
        sys.exit(0)

    # Query for businesses to process
    query = {
        "website": {"$exists": True, "$nin": ["", None, "N/A"]},
        "emailstatus": "pending"
    }
    limit = args.max_sites if args.max_sites > 0 else 0

    log.info(f"Fetching businesses with pending status (Limit: {'All' if limit == 0 else limit})...")
    try:
        records_to_process = list(collection.find(query, {"_id": 1, "website": 1, "businessname": 1}).limit(limit))
        total_to_process = len(records_to_process)
        if total_to_process == 0:
            # This case should be caught by db_stats check, but double-check
            log.info("Redundant check: No records match the processing query.")
            client.close()
            sys.exit(0)
        log.info(f"Found {total_to_process} businesses to process.")
    except PyMongoError as e_fetch:
        log.critical(f"Failed to fetch records from MongoDB: {e_fetch}. Exiting.")
        client.close()
        sys.exit(1)


    # Initialize counters
    processed_count = 0
    success_count = 0
    checked_count = 0
    failed_count = 0
    skipped_count = 0
    total_emails = 0
    total_socials = 0

    futures: List[Future] = []

    try:
        # Using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=args.threads, thread_name_prefix='ScraperThread') as executor:
            log.info(f"Starting thread pool with {args.threads} workers.")

            # Submit initial batch of tasks
            for record in records_to_process:
                if shutdown_flag:
                    log.warning("Shutdown requested before submitting all tasks.")
                    break
                future = executor.submit(process_business, record, collection, args.headless, args.debug)
                futures.append(future)

            log.info(f"Submitted {len(futures)} tasks to the executor.")

            # Process completed tasks
            for future in as_completed(futures):
                if shutdown_flag:
                    # Attempt to cancel remaining futures (may not be effective if already running)
                    log.warning("Shutdown flag set, processing remaining completed tasks and stopping.")
                    # for f in futures:
                    #      if not f.done(): f.cancel() # Doesn't reliably stop running threads

                processed_count += 1
                try:
                    business_id, status, num_emails, num_socials = future.result()
                    log.debug(f"Completed task for ID {business_id} with status '{status}'")

                    if status == "found":
                        success_count += 1
                        total_emails += num_emails
                        total_socials += num_socials
                    elif status == "checked":
                        checked_count += 1
                        total_socials += num_socials # Checked might still find social links
                    elif status == "failed":
                        failed_count += 1
                    elif status == "skipped":
                         skipped_count += 1

                except Exception as e_future:
                    # Log exceptions from the worker function itself
                    log.error(f"Task resulted in an exception: {e_future}", exc_info=args.debug)
                    failed_count += 1 # Count exceptions as failures

                # Log progress periodically
                if processed_count % 10 == 0 or processed_count == total_to_process:
                    elapsed_time = time.time() - start_time
                    rate = processed_count / elapsed_time if elapsed_time > 0 else 0
                    log.info(f"Progress: {processed_count}/{total_to_process} | "
                             f"Found: {success_count} | Checked: {checked_count} | "
                             f"Failed: {failed_count} | Skipped: {skipped_count} | "
                             f"Rate: {rate:.2f}/s")

                # Check shutdown flag again after processing each result
                if shutdown_flag:
                     break # Exit the as_completed loop


            log.info("Processing loop finished or interrupted.")
            # Ensure executor shuts down cleanly, waiting for running tasks if not interrupted
            wait_shutdown = not shutdown_flag
            log.info(f"Shutting down executor (wait={wait_shutdown})...")
            executor.shutdown(wait=wait_shutdown, cancel_futures=shutdown_flag) # Cancel pending if shutting down early
            log.info("Executor shutdown complete.")


    except KeyboardInterrupt:
        log.warning("KeyboardInterrupt caught in main loop. Shutting down.")
        shutdown_flag = True # Ensure flag is set
    except Exception as e_main:
        log.critical(f"An unexpected error occurred in the main loop: {e_main}", exc_info=True)
    finally:
        # Final summary
        end_time = time.time()
        total_time = end_time - start_time
        log.info("--- Processing Summary ---")
        log.info(f"Total businesses processed: {processed_count}/{total_to_process}")
        log.info(f"  - Emails Found: {success_count}")
        log.info(f"  - Checked (no email): {checked_count}")
        log.info(f"  - Failed: {failed_count}")
        log.info(f"  - Skipped (bad URL): {skipped_count}")
        log.info(f"Total unique emails collected: {total_emails}") # Note: This counts emails per *successful* business
        log.info(f"Total unique social profiles collected: {total_socials}") # Note: Counts per business
        log.info(f"Total execution time: {total_time:.2f} seconds")

        # Export to CSV if requested
        if args.export_csv:
            export_to_csv(collection, args.export_csv, args.debug)

        # Close MongoDB connection
        if client:
            log.info("Closing MongoDB connection.")
            client.close()

        log.info("--- Scraper Finished ---")
        sys.exit(0 if failed_count == 0 else 1) # Exit with error code if failures occurred


if __name__ == "__main__":
    main()