from fastapi import FastAPI, APIRouter, HTTPException, Header
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
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
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — re-attach verifiers for any purchases left pending across restarts
    asyncio.create_task(_resume_pending_verifications())
    yield
    # Shutdown
    client.close()


app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Chain metadata — kept in backend so Telegram messages can render nice links
CHAINS = {1: "Ethereum", 56: "BSC", 137: "Polygon"}
CHAIN_EXPLORERS = {
    1: "https://etherscan.io",
    56: "https://bscscan.com",
    137: "https://polygonscan.com",
}

# Public JSON-RPC endpoints used to verify purchase txs on-chain. Override per
# chain via env (e.g. RPC_URL_1, RPC_URL_56, RPC_URL_137) for higher rate limits
# or paid providers in production.
RPC_URLS = {
    1:   os.environ.get("RPC_URL_1",   "https://eth.llamarpc.com"),
    56:  os.environ.get("RPC_URL_56",  "https://bsc-dataseed.binance.org"),
    137: os.environ.get("RPC_URL_137", "https://polygon-rpc.com"),
}

# Token contracts the frontend can pay with — must match REACT_APP_USDT_*/USDC_*
# in /app/frontend/.env. Verifying a tx requires checking that the input call
# went to one of these addresses and decoded as transfer(recipient, amount).
TOKEN_CONTRACTS = {
    "USDT": {
        1:   "0xdac17f958d2ee523a2206206994597c13d831ec7",
        56:  "0x55d398326f99059ff775485246999027b3197955",
        137: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    },
    "USDC": {
        1:   "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        56:  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        137: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    },
}

# Decimal places per (token, chain). USDT/USDC = 6 on Ethereum/Polygon, 18 on BSC.
TOKEN_DECIMALS = {
    ("USDT", 1):   6,  ("USDT", 137): 6,  ("USDT", 56):  18,
    ("USDC", 1):   6,  ("USDC", 137): 6,  ("USDC", 56):  18,
}

ERC20_TRANSFER_SELECTOR = "0xa9059cbb"  # transfer(address,uint256)


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
    referrer_address: Optional[str] = Field(default=None, pattern=r"^0x[a-fA-F0-9]{40}$")


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
    referrer_address: Optional[str] = None
    status: str = "pending"  # pending | confirmed | failed
    verified_at: Optional[datetime] = None
    verification_error: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# How long to keep retrying on-chain verification before giving up. Most txs
# confirm in <2 min on BSC/Polygon and <3 min on Ethereum at standard gas.
PURCHASE_VERIFY_DEADLINE_SEC = 30 * 60   # 30 min
PURCHASE_VERIFY_INTERVAL_SEC = 30        # poll every 30s


def _recipient_address() -> Optional[str]:
    addr = os.environ.get("RECIPIENT_ADDRESS") or os.environ.get("REACT_APP_RECIPIENT_ADDRESS")
    return addr.lower() if addr else None


async def _rpc_call(chain: int, method: str, params: list) -> Optional[dict]:
    """Issue a JSON-RPC call to the given chain. Returns `result` or None on failure."""
    url = RPC_URLS.get(chain)
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(url, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
        if r.status_code != 200:
            return None
        body = r.json()
        if "error" in body:
            logger.warning("RPC error chain=%s %s: %s", chain, method, body["error"])
            return None
        return body.get("result")
    except Exception as e:
        logger.warning("RPC call failed chain=%s %s: %s", chain, method, e)
        return None


def _hex_to_int(h: Optional[str]) -> int:
    if not h:
        return 0
    return int(h, 16)


async def _verify_purchase_onchain(purchase: dict) -> tuple[str, Optional[str]]:
    """Returns (status, error). status ∈ {pending, confirmed, failed}.

    `pending` means tx not yet mined (try again later).
    `confirmed` means tx mined successfully AND moved expected funds to recipient.
    `failed` means tx reverted, or the funds didn't reach the recipient at all.
    """
    chain = purchase["chain"]
    tx_hash = purchase["tx_hash"]
    buyer = purchase["buyer_address"].lower()
    token_type = purchase["token_type"]
    recipient = _recipient_address()
    if not recipient:
        return ("pending", "RECIPIENT_ADDRESS not configured")

    receipt = await _rpc_call(chain, "eth_getTransactionReceipt", [tx_hash])
    if not receipt:
        return ("pending", None)  # not mined yet
    # Tx mined — was it successful?
    if receipt.get("status") != "0x1":
        return ("failed", "transaction reverted on chain")

    tx = await _rpc_call(chain, "eth_getTransactionByHash", [tx_hash])
    if not tx:
        return ("failed", "tx receipt found but tx body missing")

    tx_from = (tx.get("from") or "").lower()
    tx_to = (tx.get("to") or "").lower()
    if tx_from != buyer:
        return ("failed", f"tx from {tx_from} doesn't match buyer {buyer}")

    # ----- Native (ETH/BNB/MATIC) -----
    if token_type == "NATIVE":
        if tx_to != recipient:
            return ("failed", f"native tx sent to {tx_to}, expected {recipient}")
        # value is in wei (18 decimals on all 3 chains)
        value_wei = _hex_to_int(tx.get("value"))
        try:
            expected_native = float(purchase["amount"])
        except (TypeError, ValueError):
            return ("failed", "submitted amount not a number")
        # 18-decimal precision; allow 1% slippage tolerance for gas-token rounding
        expected_wei = int(expected_native * (10 ** 18) * 0.99)
        if value_wei < expected_wei:
            return ("failed", f"value {value_wei} wei < expected {expected_wei} wei")
        return ("confirmed", None)

    # ----- ERC20 (USDT / USDC) -----
    expected_token = TOKEN_CONTRACTS.get(token_type, {}).get(chain)
    if not expected_token:
        return ("failed", f"no {token_type} contract configured for chain {chain}")
    if tx_to != expected_token:
        return ("failed", f"tx target {tx_to} is not the {token_type} contract")

    # Decode `transfer(address,uint256)` from input
    data = tx.get("input") or "0x"
    if not data.startswith(ERC20_TRANSFER_SELECTOR) or len(data) < (10 + 64 + 64):
        return ("failed", "input is not a transfer() call")
    raw_to = "0x" + data[10:74][-40:]      # last 20 bytes of first arg
    raw_amount = data[74:138]
    if raw_to.lower() != recipient:
        return ("failed", f"transfer recipient {raw_to.lower()} != expected {recipient}")
    transferred = int(raw_amount, 16)
    decimals = TOKEN_DECIMALS.get((token_type, chain), 6)
    try:
        expected_units = int(float(purchase["amount"]) * (10 ** decimals) * 0.99)  # 1% tolerance
    except (TypeError, ValueError):
        return ("failed", "submitted amount not a number")
    if transferred < expected_units:
        return ("failed", f"transferred {transferred} < expected {expected_units}")
    return ("confirmed", None)


async def _process_purchase_verification(purchase_id: str):
    """Background task: verify a single purchase on-chain, retrying until the
    tx is mined or the deadline expires."""
    while True:
        doc = await db.purchases.find_one({"id": purchase_id}, {"_id": 0})
        if not doc:
            return
        if doc.get("status") in ("confirmed", "failed"):
            return  # already terminal

        # Past deadline? mark as failed.
        created = doc.get("created_at")
        if isinstance(created, str):
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except Exception:
                created_dt = datetime.now(timezone.utc)
        else:
            created_dt = created or datetime.now(timezone.utc)
        if (datetime.now(timezone.utc) - created_dt).total_seconds() > PURCHASE_VERIFY_DEADLINE_SEC:
            await db.purchases.update_one(
                {"id": purchase_id},
                {"$set": {"status": "failed", "verification_error": "verification timed out — tx not mined"}},
            )
            await _notify_admin_telegram(
                f"⚠️ <b>Purchase verification TIMED OUT</b>\nID: <code>{purchase_id}</code>\n"
                f"Buyer: <code>{doc['buyer_address']}</code>\nTx: <code>{doc['tx_hash']}</code>"
            )
            return

        status, err = await _verify_purchase_onchain(doc)
        if status == "pending":
            await asyncio.sleep(PURCHASE_VERIFY_INTERVAL_SEC)
            continue
        # Terminal state (confirmed or failed) — persist and notify
        update = {"status": status, "verified_at": datetime.now(timezone.utc).isoformat()}
        if err:
            update["verification_error"] = err
        await db.purchases.update_one({"id": purchase_id}, {"$set": update})
        chain_label = CHAINS.get(doc["chain"], f"chain {doc['chain']}")
        if status == "confirmed":
            msg = (
                f"✅ <b>Purchase CONFIRMED on-chain</b>\n"
                f"Plan: <b>{doc.get('plan_name') or doc['plan_id']}</b>\n"
                f"Amount: <b>{doc['amount']} {doc['token_type']}</b> on {chain_label}\n"
                f"Buyer: <code>{doc['buyer_address']}</code>\n"
                f"Tx: <code>{doc['tx_hash']}</code>"
            )
        else:
            msg = (
                f"❌ <b>Purchase FAILED verification</b>\n"
                f"Reason: {err}\n"
                f"Plan: <b>{doc.get('plan_name') or doc['plan_id']}</b>\n"
                f"Amount claimed: {doc['amount']} {doc['token_type']} on {chain_label}\n"
                f"Buyer: <code>{doc['buyer_address']}</code>\n"
                f"Tx: <code>{doc['tx_hash']}</code>"
            )
        await _notify_admin_telegram(msg)
        return


async def _resume_pending_verifications():
    """On startup, re-attach background verifiers for any purchases still pending.
    Critical so server restarts don't strand purchases in 'pending' forever."""
    pending = await db.purchases.find({"status": "pending"}, {"_id": 0, "id": 1}).to_list(1000)
    for p in pending:
        asyncio.create_task(_process_purchase_verification(p["id"]))
    if pending:
        logger.info("Resumed verification for %d pending purchases", len(pending))


@api_router.post("/purchases", response_model=Purchase)
async def create_purchase(payload: PurchaseCreate):
    data = payload.model_dump()
    data['buyer_address'] = data['buyer_address'].lower()
    if data.get('referrer_address'):
        data['referrer_address'] = data['referrer_address'].lower()
        # Don't allow self-referral
        if data['referrer_address'] == data['buyer_address']:
            data['referrer_address'] = None
    obj = Purchase(**data)
    doc = obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('verified_at'):
        doc['verified_at'] = doc['verified_at'].isoformat()
    await db.purchases.insert_one(doc)
    logger.info("Purchase recorded id=%s tx=%s plan=%s ref=%s", obj.id, obj.tx_hash, obj.plan_id, obj.referrer_address)

    # Kick off async on-chain verification. Status stays "pending" until the tx
    # is mined and validated; the dashboard will only count "confirmed" purchases.
    asyncio.create_task(_process_purchase_verification(obj.id))

    # Telegram: notify admin a request was placed (will follow up with confirmed/failed)
    chain_label = CHAINS.get(obj.chain, f"chain {obj.chain}")
    explorer = CHAIN_EXPLORERS.get(obj.chain)
    tx_line = f"<a href=\"{explorer}/tx/{obj.tx_hash}\">{obj.tx_hash[:18]}…</a>" if explorer else f"<code>{obj.tx_hash}</code>"
    msg = (
        f"🛒 <b>New plan purchase (verifying)</b>\n"
        f"Plan: <b>{obj.plan_name or obj.plan_id}</b> ({obj.billing_mode})\n"
        f"Amount: <b>{obj.amount} {obj.token_type}</b> on {chain_label}\n"
        f"Buyer: <code>{obj.buyer_address}</code>\n"
        + (f"Referrer: <code>{obj.referrer_address}</code>\n" if obj.referrer_address else "")
        + f"Tx: {tx_line}"
    )
    await _notify_admin_telegram(msg)
    return obj


@api_router.post("/purchases/{purchase_id}/verify", response_model=Purchase)
async def trigger_purchase_verification(purchase_id: str):
    """Manual re-verify endpoint — useful for ops debugging or if a user wants
    to nudge a slow tx."""
    doc = await db.purchases.find_one({"id": purchase_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if doc.get("status") in ("confirmed", "failed"):
        return Purchase(**doc)
    status, err = await _verify_purchase_onchain(doc)
    if status != "pending":
        update = {"status": status, "verified_at": datetime.now(timezone.utc).isoformat()}
        if err:
            update["verification_error"] = err
        await db.purchases.update_one({"id": purchase_id}, {"$set": update})
        doc.update(update)
    return Purchase(**doc)


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

    # Telegram: only ping admin on a wallet's FIRST connect (avoid spam on every
    # page reload / session rehydration).
    prior = await db.wallet_sessions.count_documents({"address": obj.address})
    if prior <= 1:
        chain_label = CHAINS.get(obj.chain_id, f"chain {obj.chain_id}") if obj.chain_id else "unknown chain"
        msg = (
            f"🔌 <b>New wallet connected</b>\n"
            f"Wallet: <code>{obj.address}</code>\n"
            f"Source: {obj.source}\n"
            f"Chain: {chain_label}"
        )
        await _notify_admin_telegram(msg)
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


# ---- Referrals: aggregate downline of a wallet ----
class ReferredUser(BaseModel):
    address: str
    plan_id: str
    plan_name: Optional[str] = None
    amount: str
    token_type: str
    created_at: datetime


class ReferralSummary(BaseModel):
    address: str
    direct_count: int
    direct_solo_rigs: int
    network_value_usd: float
    network_solo_rigs_total: int
    referred_users: List[ReferredUser]
    legs: List[List[ReferredUser]]  # 3 legs (sorted by referred user count desc)


# Solo Rig (Plan 2) is the qualifying SKU for the leadership program.
SOLO_RIG_PLAN_ID = "2"
SOLO_RIG_USD = 2500


def _is_stable(p):
    return p.get('token_type') in ("USDT", "USDC")


def _amount_to_usd(p) -> float:
    if not _is_stable(p):
        return 0.0
    try:
        return float(p.get('amount', 0))
    except (TypeError, ValueError):
        return 0.0


@api_router.get("/wallet/{address}/referrals", response_model=ReferralSummary)
async def get_wallet_referrals(address: str):
    addr = address.lower()
    if not (addr.startswith("0x") and len(addr) == 42):
        raise HTTPException(status_code=400, detail="Invalid wallet address")

    # Direct referrals: every purchase where referrer_address == addr
    direct_purchases = await db.purchases.find(
        {"referrer_address": addr},
        {"_id": 0},
    ).sort("created_at", -1).to_list(2000)

    direct_users_map = {}  # buyer_address -> first/best ReferredUser
    direct_solo_rigs = 0
    network_value_usd = 0.0
    network_solo_rigs_total = 0

    # Track referred wallets so we can build legs (one leg per direct referee)
    leg_aggregates = {}  # direct_addr -> { 'count': int, 'solo': int, 'users': [ReferredUser] }

    for p in direct_purchases:
        buyer = p.get('buyer_address')
        if not buyer:
            continue
        if isinstance(p.get('created_at'), str):
            try:
                p['created_at'] = datetime.fromisoformat(p['created_at'])
            except Exception:
                p['created_at'] = datetime.now(timezone.utc)
        usd = _amount_to_usd(p)
        network_value_usd += usd
        is_solo = (p.get('plan_id') == SOLO_RIG_PLAN_ID)
        if is_solo:
            direct_solo_rigs += 1
            network_solo_rigs_total += 1
        # Keep one entry per direct buyer for the headline list
        if buyer not in direct_users_map:
            direct_users_map[buyer] = ReferredUser(
                address=buyer,
                plan_id=p.get('plan_id', ''),
                plan_name=p.get('plan_name'),
                amount=p.get('amount', '0'),
                token_type=p.get('token_type', 'USDT'),
                created_at=p['created_at'],
            )
        leg = leg_aggregates.setdefault(buyer, {'count': 0, 'solo': 0, 'users': []})
        leg['count'] += 1
        if is_solo:
            leg['solo'] += 1
        leg['users'].append(direct_users_map[buyer])

    direct_users = list(direct_users_map.values())
    direct_users.sort(key=lambda u: u.created_at, reverse=True)

    # Build the 3-2-2 legs: top 3 direct referees by their network value
    sorted_legs = sorted(leg_aggregates.items(), key=lambda kv: kv[1]['count'], reverse=True)
    legs_out: List[List[ReferredUser]] = []
    for i in range(3):
        if i < len(sorted_legs):
            users = sorted_legs[i][1]['users']
            # Deduplicate by address
            seen = set()
            uniq = []
            for u in users:
                if u.address in seen:
                    continue
                seen.add(u.address)
                uniq.append(u)
            legs_out.append(uniq)
        else:
            legs_out.append([])

    return ReferralSummary(
        address=addr,
        direct_count=len(direct_users),
        direct_solo_rigs=direct_solo_rigs,
        network_value_usd=round(network_value_usd, 2),
        network_solo_rigs_total=network_solo_rigs_total,
        referred_users=direct_users,
        legs=legs_out,
    )


# ---- Notification subscriptions (email alerts for reward unlocks) ----
class NotificationSubscribeCreate(BaseModel):
    wallet_address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    email: EmailStr
    topics: List[Literal["rewards", "earnings", "all"]] = ["rewards"]


class NotificationSubscribe(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    email: EmailStr
    topics: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@api_router.post("/notifications/subscribe", response_model=NotificationSubscribe)
async def notifications_subscribe(payload: NotificationSubscribeCreate):
    data = payload.model_dump()
    data["wallet_address"] = data["wallet_address"].lower()
    data["email"] = data["email"].lower()
    obj = NotificationSubscribe(**data)
    doc = obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    # Upsert by wallet+email so re-subscribing doesn't create duplicates
    await db.notification_subscriptions.update_one(
        {"wallet_address": doc["wallet_address"], "email": doc["email"]},
        {"$set": doc},
        upsert=True,
    )
    logger.info("Notification subscription wallet=%s email=%s topics=%s", doc["wallet_address"], doc["email"], doc["topics"])
    return obj






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



# ---- XMR live price (cached) ----
_xmr_price_cache = {"price": None, "fetched_at": None}
_XMR_PRICE_TTL = 60  # seconds


@api_router.get("/xmr/price")
async def get_xmr_price():
    """Return current XMR/USD price. Cached for 60s. Falls back to last good value on failure."""
    now = datetime.now(timezone.utc)
    cached = _xmr_price_cache.get("price")
    cached_at = _xmr_price_cache.get("fetched_at")
    if cached is not None and cached_at and (now - cached_at).total_seconds() < _XMR_PRICE_TTL:
        return {"price_usd": cached, "source": "cache", "fetched_at": cached_at.isoformat()}
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={"ids": "monero", "vs_currencies": "usd"},
                headers={"User-Agent": "MoneroRig/1.0"},
            )
        if r.status_code == 200:
            data = r.json()
            price = float(data.get("monero", {}).get("usd") or 0)
            if price > 0:
                _xmr_price_cache["price"] = price
                _xmr_price_cache["fetched_at"] = now
                return {"price_usd": price, "source": "coingecko", "fetched_at": now.isoformat()}
    except Exception as e:
        logger.warning("CoinGecko XMR price fetch failed: %s", e)
    # Fallback to last good value or a sensible default
    if cached is not None:
        return {"price_usd": cached, "source": "stale", "fetched_at": cached_at.isoformat()}
    return {"price_usd": 165.0, "source": "fallback", "fetched_at": now.isoformat()}


# ---- Withdrawals ----
class WithdrawalCreate(BaseModel):
    wallet_address: str = Field(pattern=r"^0x[a-fA-F0-9]{40}$")
    amount_usd: float = Field(gt=0)
    available_usd: float = Field(ge=0)  # client's reported total earned
    xmr_address: Optional[str] = Field(default=None, max_length=128)
    contact_email: Optional[EmailStr] = None


class Withdrawal(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    amount_usd: float
    amount_xmr: Optional[float] = None
    xmr_address: Optional[str] = None
    contact_email: Optional[str] = None
    status: Literal["pending", "processing", "completed", "rejected"] = "pending"
    admin_notified: bool = False
    payout_tx_hash: Optional[str] = None
    admin_note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None


class WithdrawalUpdate(BaseModel):
    status: Literal["pending", "processing", "completed", "rejected"]
    payout_tx_hash: Optional[str] = Field(default=None, max_length=128)
    admin_note: Optional[str] = Field(default=None, max_length=500)


WITHDRAWAL_MIN_USD = 10.0


def _admin_wallets() -> set:
    raw = os.environ.get("ADMIN_WALLET_ADDRESSES", "") or ""
    return {a.strip().lower() for a in raw.split(",") if a.strip()}


def _require_admin(x_admin_wallet: Optional[str]) -> str:
    """Raise 401 if x-admin-wallet header is not a whitelisted admin."""
    addr = (x_admin_wallet or "").lower()
    allowed = _admin_wallets()
    if not allowed:
        raise HTTPException(status_code=503, detail="Admin functionality not configured")
    if addr not in allowed:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return addr


async def _notify_admin_telegram(text: str) -> bool:
    """Best-effort Telegram notification. No-op if env vars missing."""
    bot = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID")
    if not bot or not chat:
        logger.info("Telegram admin notify skipped (env not configured)")
        return False
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                f"https://api.telegram.org/bot{bot}/sendMessage",
                json={"chat_id": chat, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True},
            )
        return r.status_code == 200
    except Exception as e:
        logger.warning("Telegram notify failed: %s", e)
        return False


@api_router.post("/withdrawals", response_model=Withdrawal)
async def create_withdrawal(payload: WithdrawalCreate):
    if payload.amount_usd < WITHDRAWAL_MIN_USD:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is ${WITHDRAWAL_MIN_USD:.0f} USDT")
    addr = payload.wallet_address.lower()
    # Ensure user already has at least one purchase
    has_plan = await db.purchases.count_documents({"buyer_address": addr})
    if not has_plan:
        raise HTTPException(status_code=400, detail="No active plan found for this wallet")
    # Reject if there is already a pending withdrawal
    pending = await db.withdrawals.find_one({"wallet_address": addr, "status": {"$in": ["pending", "processing"]}}, {"_id": 0})
    if pending:
        raise HTTPException(status_code=409, detail="A withdrawal is already in progress for this wallet")

    # Compute XMR equivalent
    xmr_price = _xmr_price_cache.get("price") or 165.0
    amount_xmr = round(payload.amount_usd / xmr_price, 6) if xmr_price else None

    obj = Withdrawal(
        wallet_address=addr,
        amount_usd=round(payload.amount_usd, 4),
        amount_xmr=amount_xmr,
        xmr_address=payload.xmr_address,
        contact_email=payload.contact_email.lower() if payload.contact_email else None,
    )
    doc = obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    if doc.get("processed_at"):
        doc["processed_at"] = doc["processed_at"].isoformat()
    await db.withdrawals.insert_one(doc)

    # Notify admin (best-effort, do not block client on failure)
    msg = (
        f"💰 <b>New Withdrawal Request</b>\n"
        f"Wallet: <code>{addr}</code>\n"
        f"Amount: <b>${obj.amount_usd:.4f}</b> USDT (~ {amount_xmr} XMR)\n"
        f"XMR address: <code>{obj.xmr_address or '—'}</code>\n"
        f"Contact: {obj.contact_email or '—'}\n"
        f"Request ID: <code>{obj.id}</code>"
    )
    notified = await _notify_admin_telegram(msg)
    if notified:
        await db.withdrawals.update_one({"id": obj.id}, {"$set": {"admin_notified": True}})
        obj.admin_notified = True
    logger.info("Withdrawal request id=%s wallet=%s amount=$%.2f notified=%s", obj.id, addr, obj.amount_usd, notified)
    return obj


@api_router.get("/wallet/{address}/withdrawals", response_model=List[Withdrawal])
async def list_wallet_withdrawals(address: str):
    addr = address.lower()
    if not (addr.startswith("0x") and len(addr) == 42):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    docs = await db.withdrawals.find({"wallet_address": addr}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [Withdrawal(**d) for d in docs]


# ---- Admin: withdrawal management ----
@api_router.get("/admin/withdrawals", response_model=List[Withdrawal])
async def admin_list_withdrawals(
    status: Optional[Literal["pending", "processing", "completed", "rejected"]] = None,
    x_admin_wallet: Optional[str] = Header(default=None, alias="X-Admin-Wallet"),
):
    _require_admin(x_admin_wallet)
    query = {}
    if status:
        query["status"] = status
    docs = await db.withdrawals.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Withdrawal(**d) for d in docs]


@api_router.patch("/admin/withdrawals/{withdrawal_id}", response_model=Withdrawal)
async def admin_update_withdrawal(
    withdrawal_id: str,
    payload: WithdrawalUpdate,
    x_admin_wallet: Optional[str] = Header(default=None, alias="X-Admin-Wallet"),
):
    admin = _require_admin(x_admin_wallet)
    existing = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Withdrawal not found")

    # Require payout tx hash when marking a withdrawal completed — completed
    # without a tx hash is meaningless from an audit / user-trust perspective.
    if payload.status == "completed":
        tx = (payload.payout_tx_hash or existing.get("payout_tx_hash") or "").strip()
        if not tx:
            raise HTTPException(status_code=400, detail="payout_tx_hash is required to mark a withdrawal completed")

    update = {"status": payload.status}
    if payload.payout_tx_hash is not None:
        update["payout_tx_hash"] = payload.payout_tx_hash.strip() or None
    if payload.admin_note is not None:
        update["admin_note"] = payload.admin_note.strip() or None
    if payload.status in ("completed", "rejected"):
        update["processed_at"] = datetime.now(timezone.utc).isoformat()

    await db.withdrawals.update_one({"id": withdrawal_id}, {"$set": update})

    # Notify the user-side via in-app dashboard (no email integration yet — toast appears on next poll)
    # Notify admin via Telegram on every status change for an audit trail
    msg = (
        f"🔧 <b>Withdrawal status changed</b>\n"
        f"ID: <code>{withdrawal_id}</code>\n"
        f"Wallet: <code>{existing['wallet_address']}</code>\n"
        f"Amount: <b>${existing['amount_usd']:.4f}</b> USDT\n"
        f"Status: <b>{payload.status.upper()}</b>"
        + (f"\nTX: <code>{payload.payout_tx_hash}</code>" if payload.payout_tx_hash else "")
        + (f"\nNote: {payload.admin_note}" if payload.admin_note else "")
        + f"\nBy: <code>{admin}</code>"
    )
    await _notify_admin_telegram(msg)

    fresh = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    return Withdrawal(**fresh)


# ---- Admin: purchases & wallet sessions ----
@api_router.get("/admin/purchases", response_model=List[Purchase])
async def admin_list_purchases(
    status: Optional[Literal["pending", "confirmed", "failed"]] = None,
    x_admin_wallet: Optional[str] = Header(default=None, alias="X-Admin-Wallet"),
):
    _require_admin(x_admin_wallet)
    query = {}
    if status:
        query["status"] = status
    docs = await db.purchases.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Purchase(**d) for d in docs]


@api_router.get("/admin/wallets")
async def admin_list_wallet_sessions(
    x_admin_wallet: Optional[str] = Header(default=None, alias="X-Admin-Wallet"),
):
    """Return one row per unique wallet address with aggregate session +
    purchase stats. Used by the admin panel's Wallets tab."""
    _require_admin(x_admin_wallet)

    # Aggregate sessions: first/last seen, session_count, sources
    sessions_pipe = [
        {"$group": {
            "_id": "$address",
            "session_count": {"$sum": 1},
            "first_seen": {"$min": "$connected_at"},
            "last_seen":  {"$max": "$connected_at"},
            "sources": {"$addToSet": "$source"},
            "chains": {"$addToSet": "$chain_id"},
        }},
    ]
    by_addr = {}
    async for row in db.wallet_sessions.aggregate(sessions_pipe):
        addr = row["_id"]
        by_addr[addr] = {
            "address": addr,
            "session_count": row.get("session_count", 0),
            "first_seen": row.get("first_seen"),
            "last_seen": row.get("last_seen"),
            "sources": [s for s in (row.get("sources") or []) if s],
            "chains": [c for c in (row.get("chains") or []) if c],
            "purchase_count": 0,
            "confirmed_count": 0,
            "pending_count": 0,
            "failed_count": 0,
            "total_spent_usd": 0.0,
        }

    # Aggregate purchases
    purchases_pipe = [
        {"$group": {
            "_id": "$buyer_address",
            "purchase_count": {"$sum": 1},
            "confirmed_count": {"$sum": {"$cond": [{"$eq": ["$status", "confirmed"]}, 1, 0]}},
            "pending_count":   {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
            "failed_count":    {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}},
        }},
    ]
    async for row in db.purchases.aggregate(purchases_pipe):
        addr = row["_id"]
        entry = by_addr.setdefault(addr, {
            "address": addr,
            "session_count": 0,
            "first_seen": None,
            "last_seen": None,
            "sources": [],
            "chains": [],
            "purchase_count": 0,
            "confirmed_count": 0,
            "pending_count": 0,
            "failed_count": 0,
            "total_spent_usd": 0.0,
        })
        entry["purchase_count"] = row.get("purchase_count", 0)
        entry["confirmed_count"] = row.get("confirmed_count", 0)
        entry["pending_count"] = row.get("pending_count", 0)
        entry["failed_count"] = row.get("failed_count", 0)

    # Sum USDT/USDC totals (only for confirmed purchases)
    async for p in db.purchases.find({"status": "confirmed", "token_type": {"$in": ["USDT", "USDC"]}}, {"_id": 0, "buyer_address": 1, "amount": 1}):
        addr = p["buyer_address"]
        try:
            by_addr.setdefault(addr, {"address": addr})
            by_addr[addr]["total_spent_usd"] = round(by_addr[addr].get("total_spent_usd", 0.0) + float(p["amount"]), 2)
        except (TypeError, ValueError):
            pass

    out = list(by_addr.values())
    # Sort: most recent activity first
    out.sort(key=lambda r: r.get("last_seen") or "", reverse=True)
    return out


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