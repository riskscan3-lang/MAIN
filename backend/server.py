from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Literal
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ---- Contact form ----
class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    subject: str
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=300)
    message: str = Field(min_length=1, max_length=5000)


@api_router.post("/contact", response_model=ContactMessage)
async def create_contact_message(payload: ContactMessageCreate):
    obj = ContactMessage(**payload.model_dump())
    doc = obj.model_dump()
    doc['email'] = str(doc['email'])
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contact_messages.insert_one(doc)
    logger.info("New contact message stored: id=%s email=%s", obj.id, obj.email)
    return obj


@api_router.get("/contact", response_model=List[ContactMessage])
async def list_contact_messages():
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for m in messages:
        if isinstance(m.get('created_at'), str):
            m['created_at'] = datetime.fromisoformat(m['created_at'])
    return messages


# ---- Crypto purchases ----
class PurchaseCreate(BaseModel):
    plan_id: str
    plan_name: Optional[str] = None
    buyer_address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    amount: str = Field(min_length=1, max_length=64)
    chain: Literal[1, 56, 137]
    tx_hash: str = Field(pattern=r"^0x[a-fA-F0-9]{64}$")
    token_type: Literal["USDT", "USDC", "NATIVE"]
    billing_mode: Literal["standard", "annual"] = "standard"


class Purchase(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    plan_id: str
    plan_name: Optional[str] = None
    buyer_address: str
    amount: str
    chain: int
    tx_hash: str
    token_type: str
    billing_mode: str = "standard"
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.post("/purchases", response_model=Purchase)
async def create_purchase(payload: PurchaseCreate):
    data = payload.model_dump()
    data['buyer_address'] = data['buyer_address'].lower()
    obj = Purchase(**data)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.purchases.insert_one(doc)
    logger.info("Purchase recorded id=%s tx=%s plan=%s", obj.id, obj.tx_hash, obj.plan_id)
    return obj


@api_router.get("/purchases", response_model=List[Purchase])
async def list_purchases(buyer_address: Optional[str] = None):
    q = {}
    if buyer_address:
        q['buyer_address'] = buyer_address.lower()
    items = await db.purchases.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for it in items:
        if isinstance(it.get('created_at'), str):
            it['created_at'] = datetime.fromisoformat(it['created_at'])
    return items


# ---- Wallet sessions (wallet address = user identity) ----
class WalletSessionCreate(BaseModel):
    address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    source: Literal["injected", "walletconnect", "unknown"] = "unknown"
    chain_id: Optional[int] = None
    user_agent: Optional[str] = Field(default=None, max_length=500)
    referrer: Optional[str] = Field(default=None, max_length=1000)


class WalletSession(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    address: str
    source: str = "unknown"
    chain_id: Optional[int] = None
    user_agent: Optional[str] = None
    referrer: Optional[str] = None
    connected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.post("/wallet-sessions", response_model=WalletSession)
async def record_wallet_session(payload: WalletSessionCreate):
    data = payload.model_dump()
    data['address'] = data['address'].lower()
    obj = WalletSession(**data)
    doc = obj.model_dump()
    doc['connected_at'] = doc['connected_at'].isoformat()
    await db.wallet_sessions.insert_one(doc)
    return obj


class WalletActivityStats(BaseModel):
    address: str
    session_count: int = 0
    purchase_count: int = 0
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    total_spent_usd_like: float = 0.0  # sum of USDT/USDC amounts (NATIVE excluded here)


class WalletActivityResponse(BaseModel):
    address: str
    stats: WalletActivityStats
    sessions: List[WalletSession]
    purchases: List[Purchase]


@api_router.get("/wallet/{address}/activity", response_model=WalletActivityResponse)
async def get_wallet_activity(address: str):
    addr = address.lower()
    if not (addr.startswith("0x") and len(addr) == 42):
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    sessions_raw = await db.wallet_sessions.find({"address": addr}, {"_id": 0}).sort("connected_at", -1).to_list(500)
    purchases_raw = await db.purchases.find({"buyer_address": addr}, {"_id": 0}).sort("created_at", -1).to_list(500)

    for s in sessions_raw:
        if isinstance(s.get('connected_at'), str):
            s['connected_at'] = datetime.fromisoformat(s['connected_at'])
    for p in purchases_raw:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])

    # Stats
    total_usd = 0.0
    for p in purchases_raw:
        if p.get('token_type') in ("USDT", "USDC"):
            try:
                total_usd += float(p.get('amount', 0))
            except (TypeError, ValueError):
                pass

    connected_at_times = [s['connected_at'] for s in sessions_raw if s.get('connected_at')]
    first_seen = min(connected_at_times) if connected_at_times else None
    last_seen = max(connected_at_times) if connected_at_times else None

    stats = WalletActivityStats(
        address=addr,
        session_count=len(sessions_raw),
        purchase_count=len(purchases_raw),
        first_seen=first_seen,
        last_seen=last_seen,
        total_spent_usd_like=round(total_usd, 2),
    )

    return WalletActivityResponse(
        address=addr,
        stats=stats,
        sessions=[WalletSession(**s) for s in sessions_raw],
        purchases=[Purchase(**p) for p in purchases_raw],
    )


# ---- Activity events (page views, clicks, custom events tied to wallet) ----
class ActivityEventCreate(BaseModel):
    wallet: Optional[str] = None
    session_id: Optional[str] = Field(default=None, max_length=64)
    event_type: str = Field(min_length=1, max_length=64)
    page: Optional[str] = Field(default=None, max_length=64)
    payload: Optional[dict] = None


class ActivityEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet: Optional[str] = None
    session_id: Optional[str] = None
    event_type: str
    page: Optional[str] = None
    payload: Optional[dict] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.post("/activity-events", response_model=ActivityEvent)
async def record_activity_event(payload: ActivityEventCreate):
    data = payload.model_dump()
    if data.get("wallet"):
        data["wallet"] = data["wallet"].lower()
    obj = ActivityEvent(**data)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.activity_events.insert_one(doc)
    return obj


# ---- Live chat ----
class ChatMessageCreate(BaseModel):
    wallet: Optional[str] = None
    session_id: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=2000)


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet: Optional[str] = None
    session_id: str
    sender: Literal["user", "bot"] = "user"
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def _smart_reply(text: str) -> str:
    """Lightweight keyword-based auto-reply. In production, swap for a real agent / LLM."""
    t = text.lower().strip()
    if any(w in t for w in ["hi", "hello", "hey", "gm", "good morning"]):
        return "👋 Welcome to MONERO RIG! I'm a quick assistant. Ask me about plans, payouts, wallets, or referrals."
    if any(w in t for w in ["plan", "price", "cost", "starter", "professional", "enterprise"]):
        return ("Our plans are: Starter $2,499 · Professional $4,999 · Enterprise $8,499. "
                "All paid in USDT/USDC on Ethereum, Polygon or BSC. Activate from the Plans section.")
    if any(w in t for w in ["payout", "withdraw", "withdrawal", "earnings"]):
        return ("Payouts run every 24h to the wallet address you used to activate the plan. "
                "Threshold is 0.1 XMR. You can track them on your My Activity page.")
    if any(w in t for w in ["wallet", "metamask", "connect", "walletconnect", "trust"]):
        return ("We support MetaMask, Coinbase Wallet, Trust Wallet (browser extension) and 300+ mobile wallets via WalletConnect QR. "
                "Tap Connect Wallet at the top right to choose.")
    if any(w in t for w in ["refund", "scam", "rugpull", "fraud", "lost"]):
        return ("All transactions are on-chain and final. If you sent funds to a wrong address, please share the tx hash here and we'll investigate.")
    if any(w in t for w in ["referral", "ref", "code", "bonus"]):
        return ("Every connected wallet gets a personal ref code (visible after a purchase). "
                "Share it to earn 10% of every friend's first deposit.")
    if any(w in t for w in ["chain", "network", "polygon", "bsc", "ethereum", "fee", "gas"]):
        return ("We support Ethereum, Polygon, and BNB Smart Chain. Polygon and BSC have the lowest gas fees — recommended for smaller plans.")
    if any(w in t for w in ["tx", "hash", "transaction", "pending", "confirm"]):
        return ("Confirmation ETAs: Ethereum ~3 min, Polygon ~30s, BSC ~15s. "
                "Once confirmed your plan auto-activates. Your tx is visible on My Activity.")
    if "?" in text or len(t) > 0:
        return ("Got it — a real human will follow up shortly. In the meantime, you can browse the FAQ or check your dashboard for live stats.")
    return "Thanks! We'll get back to you within 24 hours."


@api_router.post("/chat/messages")
async def post_chat_message(payload: ChatMessageCreate):
    data = payload.model_dump()
    if data.get("wallet"):
        data["wallet"] = data["wallet"].lower()
    user_msg = ChatMessage(**data, sender="user")
    user_doc = user_msg.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    await db.chat_messages.insert_one(user_doc)

    reply_text = _smart_reply(payload.text)
    bot_msg = ChatMessage(
        wallet=user_msg.wallet,
        session_id=user_msg.session_id,
        sender="bot",
        text=reply_text,
    )
    bot_doc = bot_msg.model_dump()
    bot_doc['created_at'] = bot_doc['created_at'].isoformat()
    await db.chat_messages.insert_one(bot_doc)

    return {"user": user_msg, "bot": bot_msg}


@api_router.get("/chat/messages", response_model=List[ChatMessage])
async def list_chat_messages(session_id: Optional[str] = None, wallet: Optional[str] = None):
    q = {}
    if session_id:
        q['session_id'] = session_id
    if wallet:
        q['wallet'] = wallet.lower()
    if not q:
        return []
    items = await db.chat_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(500)
    for it in items:
        if isinstance(it.get('created_at'), str):
            it['created_at'] = datetime.fromisoformat(it['created_at'])
    return items


# ---- XMR price proxy with cache + fallback ----
import httpx
import math
import random as _random

_xmr_cache: dict = {}  # { days(int): { 'fetched_at': datetime, 'data': {...} } }
_XMR_CACHE_TTL_SECS = 60

def _generate_fallback_xmr_series(days: int):
    """Generate a deterministic-looking but slightly random XMR price series so the chart
    is never empty when CoinGecko rate-limits us. Anchored around a realistic XMR price.
    """
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    anchor_price = 162.0  # realistic XMR/USD anchor for offline fallback
    if days == 1:
        n_points, step_ms = 96, 15 * 60 * 1000  # every 15 min
    elif days == 7:
        n_points, step_ms = 168, 60 * 60 * 1000
    elif days == 30:
        n_points, step_ms = 180, 4 * 60 * 60 * 1000
    else:
        n_points, step_ms = 180, 12 * 60 * 60 * 1000

    prices = []
    price = anchor_price * (0.95 + _random.random() * 0.1)
    for i in range(n_points):
        ts = now_ms - (n_points - 1 - i) * step_ms
        price = price * (1 + (_random.random() - 0.5) * 0.012)
        prices.append([ts, round(price, 4)])
    return {"prices": prices, "source": "fallback"}


@api_router.get("/xmr/chart")
async def get_xmr_chart(days: int = 1):
    if days not in (1, 7, 30, 90):
        days = 1
    cached = _xmr_cache.get(days)
    if cached:
        age = (datetime.now(timezone.utc) - cached['fetched_at']).total_seconds()
        if age < _XMR_CACHE_TTL_SECS:
            return cached['data']
    # Try CoinGecko
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://api.coingecko.com/api/v3/coins/monero/market_chart",
                params={"vs_currency": "usd", "days": days},
                headers={"User-Agent": "MoneroRig/1.0"},
            )
        if r.status_code == 200:
            data = r.json()
            data['source'] = 'coingecko'
            _xmr_cache[days] = {"fetched_at": datetime.now(timezone.utc), "data": data}
            return data
        logger.warning("CoinGecko returned %s", r.status_code)
    except Exception as e:
        logger.warning("CoinGecko fetch failed: %s", e)

    # Fallback
    if cached:
        return cached['data']
    fallback = _generate_fallback_xmr_series(days)
    _xmr_cache[days] = {"fetched_at": datetime.now(timezone.utc), "data": fallback}
    return fallback


# OHLC (candlestick) data
_xmr_ohlc_cache: dict = {}

def _generate_fallback_ohlc(days: int):
    """Generate realistic-looking OHLC candles."""
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    anchor = 162.0
    if days == 1:
        n, step_ms = 48, 30 * 60 * 1000       # 30-min candles
    elif days == 7:
        n, step_ms = 42, 4 * 60 * 60 * 1000   # 4-hour candles
    elif days == 30:
        n, step_ms = 60, 12 * 60 * 60 * 1000  # 12-hour candles
    else:
        n, step_ms = 90, 24 * 60 * 60 * 1000  # 1-day candles
    candles = []
    o = anchor * (0.95 + _random.random() * 0.1)
    for i in range(n):
        ts = now_ms - (n - 1 - i) * step_ms
        # Close drifts from open with noise
        drift = (_random.random() - 0.5) * o * 0.025
        c = o + drift
        hi = max(o, c) + _random.random() * o * 0.012
        lo = min(o, c) - _random.random() * o * 0.012
        candles.append([ts, round(o, 4), round(hi, 4), round(lo, 4), round(c, 4)])
        o = c  # next open = last close
    return {"candles": candles, "source": "fallback"}


@api_router.get("/xmr/ohlc")
async def get_xmr_ohlc(days: int = 1):
    if days not in (1, 7, 30, 90):
        days = 1
    cached = _xmr_ohlc_cache.get(days)
    if cached:
        age = (datetime.now(timezone.utc) - cached['fetched_at']).total_seconds()
        if age < _XMR_CACHE_TTL_SECS:
            return cached['data']
    # CoinGecko OHLC supports days: 1, 7, 14, 30, 90, 180, 365, max
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://api.coingecko.com/api/v3/coins/monero/ohlc",
                params={"vs_currency": "usd", "days": days},
                headers={"User-Agent": "MoneroRig/1.0"},
            )
        if r.status_code == 200:
            data = {"candles": r.json(), "source": "coingecko"}
            _xmr_ohlc_cache[days] = {"fetched_at": datetime.now(timezone.utc), "data": data}
            return data
        logger.warning("CoinGecko OHLC returned %s", r.status_code)
    except Exception as e:
        logger.warning("CoinGecko OHLC fetch failed: %s", e)

    if cached:
        return cached['data']
    fallback = _generate_fallback_ohlc(days)
    _xmr_ohlc_cache[days] = {"fetched_at": datetime.now(timezone.utc), "data": fallback}
    return fallback

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()