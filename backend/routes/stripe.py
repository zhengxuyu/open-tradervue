import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user, CurrentUser
from ..database import get_db
from ..models.subscription import Subscription

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
PRICE_ID = os.getenv("STRIPE_PRICE_ID", "price_1TJiwsL4PxdjwaQBMAEAeQOQ")

router = APIRouter(prefix="/api/stripe", tags=["stripe"])


@router.get("/subscription-status")
async def get_subscription_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # DEV: bypass subscription check locally
    if os.getenv("DEV_BYPASS_SUBSCRIPTION", "").lower() == "true":
        return {"subscribed": True, "status": "active"}
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    if sub and sub.status == "active":
        return {"subscribed": True, "status": sub.status}
    return {"subscribed": False, "status": sub.status if sub else "none"}


@router.post("/create-checkout-session")
async def create_checkout_session(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if already subscribed
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    if sub and sub.status == "active":
        return {"url": None, "message": "Already subscribed"}

    # Create or get Stripe customer
    customer_id = sub.stripe_customer_id if sub else None
    if not customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            metadata={"supabase_user_id": current_user.id},
        )
        customer_id = customer.id

    # Create checkout session
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": PRICE_ID, "quantity": 1}],
        mode="subscription",
        success_url=os.getenv("FRONTEND_URL", "https://tradejournal.dev") + "/?payment=success",
        cancel_url=os.getenv("FRONTEND_URL", "https://tradejournal.dev") + "/?payment=canceled",
        metadata={"supabase_user_id": current_user.id},
        subscription_data={
            "metadata": {"supabase_user_id": current_user.id},
        },
    )

    # Save/update subscription record
    if sub:
        sub.stripe_customer_id = customer_id
        sub.status = "pending"
    else:
        sub = Subscription(
            user_id=current_user.id,
            stripe_customer_id=customer_id,
            status="pending",
        )
        db.add(sub)
    await db.commit()

    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        else:
            # No webhook secret configured — parse directly (less secure)
            import json
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("supabase_user_id")
        subscription_id = session.get("subscription")
        customer_id = session.get("customer")

        if user_id:
            result = await db.execute(
                select(Subscription).where(Subscription.user_id == user_id)
            )
            sub = result.scalar_one_or_none()
            if sub:
                sub.stripe_subscription_id = subscription_id
                sub.stripe_customer_id = customer_id
                sub.status = "active"
            else:
                sub = Subscription(
                    user_id=user_id,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    status="active",
                )
                db.add(sub)
            await db.commit()

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        sub_id = subscription["id"]
        status = subscription["status"]

        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = status
            await db.commit()

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        sub_id = subscription["id"]

        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == sub_id)
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "canceled"
            await db.commit()

    return {"status": "ok"}


@router.post("/create-portal-session")
async def create_portal_session(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No subscription found")

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=os.getenv("FRONTEND_URL", "https://tradejournal.dev"),
    )
    return {"url": session.url}
