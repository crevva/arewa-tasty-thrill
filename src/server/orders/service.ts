import { sql } from "kysely";

import { getDb } from "@/lib/db";
import { getStorageProvider } from "@/storage";
import { sendOrderPaidEmail } from "@/server/notifications/email";
import { normalizeEmail } from "@/server/users/identity";
import type { CanonicalWebhookEvent, PaymentProviderName } from "@/payments/types";
import type {
  ClaimOrdersInput,
  CreateOrderInput,
  NewPaymentAttempt,
  OrderLookupInput,
  QuoteResult
} from "@/server/orders/types";
import { generateOrderCode, normalizePhone } from "@/server/orders/utils";

async function calculateQuoteWithDb(input: {
  deliveryZoneId: string;
  items: Array<{ productId: string; quantity: number }>;
}): Promise<QuoteResult> {
  const db = getDb();
  const zone = await db
    .selectFrom("delivery_zones")
    .select(["id", "zone", "fee", "eta_text"])
    .where("id", "=", input.deliveryZoneId)
    .where("active", "=", true)
    .executeTakeFirst();

  if (!zone) {
    throw new Error("Delivery zone is invalid");
  }

  const productIds = input.items.map((item) => item.productId);
  const productRows = await db
    .selectFrom("products")
    .leftJoin("product_images", "product_images.product_id", "products.id")
    .select([
      "products.id",
      "products.slug",
      "products.name",
      "products.base_price",
      "products.in_stock",
      "products.active",
      "product_images.storage_path",
      "product_images.sort_order"
    ])
    .where("products.id", "in", productIds)
    .execute();

  const productMap = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      basePrice: number;
      inStock: boolean;
      active: boolean;
      images: Array<{ path: string; order: number }>;
    }
  >();

  for (const row of productRows) {
    const existing = productMap.get(row.id);
    if (!existing) {
      productMap.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        basePrice: row.base_price,
        inStock: row.in_stock,
        active: row.active,
        images: row.storage_path ? [{ path: row.storage_path, order: row.sort_order ?? 0 }] : []
      });
      continue;
    }

    if (row.storage_path) {
      existing.images.push({ path: row.storage_path, order: row.sort_order ?? 0 });
    }
  }

  const storage = getStorageProvider();
  const lines = input.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product || !product.active || !product.inStock) {
      throw new Error("One or more products are unavailable");
    }

    const firstImage = [...product.images].sort((a, b) => a.order - b.order)[0]?.path;
    const unitPrice = product.basePrice;
    const lineTotal = unitPrice * item.quantity;

    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitPrice,
      qty: item.quantity,
      lineTotal,
      imageUrl: firstImage ? storage.getPublicUrl(firstImage) : "/images/arewa-pp.jpg"
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const deliveryFee = zone.fee;

  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    currency: "NGN",
    lines,
    deliveryZone: {
      id: zone.id,
      zone: zone.zone,
      etaText: zone.eta_text
    }
  };
}

export async function calculateQuote(input: {
  deliveryZoneId: string;
  items: Array<{ productId: string; quantity: number }>;
}) {
  return calculateQuoteWithDb(input);
}

export async function createOrder(input: CreateOrderInput) {
  const db = getDb();
  const quote = await calculateQuoteWithDb({
    deliveryZoneId: input.deliveryZoneId,
    items: input.items
  });

  const guestEmail = normalizeEmail(input.customer.email);
  const guestPhone = normalizePhone(input.customer.phone);

  let orderCode = "";
  let createdOrderId = "";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateOrderCode();
    try {
      const order = await db
        .insertInto("orders")
        .values({
          order_code: candidate,
          user_profile_id: input.userProfileId ?? null,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          status: "pending_payment",
          subtotal: quote.subtotal,
          delivery_fee: quote.deliveryFee,
          total: quote.total,
          currency: quote.currency,
          delivery_zone_id: input.deliveryZoneId,
          delivery_address_json: {
            ...input.address,
            recipientName: input.customer.name,
            recipientPhone: guestPhone,
            recipientEmail: guestEmail
          }
        })
        .returning(["id", "order_code"])
        .executeTakeFirstOrThrow();

      createdOrderId = order.id;
      orderCode = order.order_code;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Order generation failed";
      if (!message.includes("orders_order_code_key")) {
        throw error;
      }
    }
  }

  if (!createdOrderId || !orderCode) {
    throw new Error("Unable to create unique order code");
  }

  for (const line of quote.lines) {
    await db
      .insertInto("order_items")
      .values({
        order_id: createdOrderId,
        product_id: line.productId,
        name_snapshot: line.name,
        unit_price_snapshot: line.unitPrice,
        qty: line.qty,
        line_total: line.lineTotal
      })
      .execute();
  }

  return {
    id: createdOrderId,
    orderCode,
    quote,
    customer: {
      email: guestEmail,
      phone: guestPhone,
      name: input.customer.name
    },
    paymentProvider: input.paymentProvider
  };
}

export async function createPaymentAttempt(input: NewPaymentAttempt) {
  const db = getDb();
  await db
    .insertInto("payments")
    .values({
      order_id: input.orderId,
      provider: input.provider,
      provider_ref: input.providerRef,
      status: "initiated",
      amount: input.amount,
      currency: input.currency,
      raw_payload_json: input.rawPayload
    })
    .onConflict((oc) =>
      oc.columns(["provider", "provider_ref"]).doUpdateSet({
        status: "initiated",
        amount: input.amount,
        currency: input.currency,
        raw_payload_json: input.rawPayload
      })
    )
    .execute();
}

export async function findOrderByCode(orderCode: string) {
  return getDb()
    .selectFrom("orders")
    .selectAll()
    .where("order_code", "=", orderCode)
    .executeTakeFirst();
}

export async function lookupOrder(input: OrderLookupInput) {
  const db = getDb();
  const order = await db
    .selectFrom("orders")
    .selectAll()
    .where("order_code", "=", input.orderCode)
    .executeTakeFirst();

  if (!order) {
    throw new Error("Order not found");
  }

  const key = input.emailOrPhone.trim().toLowerCase();
  const phone = normalizePhone(input.emailOrPhone);
  const emailMatches = order.guest_email?.toLowerCase() === key;
  const phoneMatches = normalizePhone(order.guest_phone ?? "") === phone;

  if (!emailMatches && !phoneMatches) {
    throw new Error("Order identity verification failed");
  }

  const items = await db
    .selectFrom("order_items")
    .selectAll()
    .where("order_id", "=", order.id)
    .orderBy("id asc")
    .execute();

  return {
    order,
    items
  };
}

export async function claimGuestOrders(input: ClaimOrdersInput) {
  if (!input.emailVerified) {
    throw new Error("Verified email is required before claiming orders");
  }

  const db = getDb();
  const email = normalizeEmail(input.email);

  const query = db
    .updateTable("orders")
    .set({ user_profile_id: input.userProfileId })
    .where("user_profile_id", "is", null)
    .where(sql`lower(guest_email)`, "=", email)
    .returning("id");

  const rows = await (input.phoneHint
    ? query.where("guest_phone", "=", normalizePhone(input.phoneHint)).execute()
    : query.execute());

  await db
    .insertInto("admin_audit_log")
    .values({
      actor_user_profile_id: input.userProfileId,
      action: "claim_guest_orders",
      entity: "orders",
      entity_id: input.userProfileId,
      meta_json: {
        count: rows.length,
        email
      }
    })
    .execute();

  return rows.length;
}

export async function applyWebhookEvent(provider: PaymentProviderName, event: CanonicalWebhookEvent) {
  const db = getDb();

  const transition = await db.transaction().execute(async (trx) => {
    const insertedEvent = await trx
      .insertInto("webhook_events")
      .values({
        provider,
        event_id: event.eventId,
        raw_payload_json: event.rawPayload
      })
      .onConflict((oc) => oc.column("event_id").doNothing())
      .returning("id")
      .executeTakeFirst();

    if (!insertedEvent) {
      return {
        duplicated: true,
        orderCode: event.orderCode,
        updatedToPaid: false,
        recipientEmail: null as string | null,
        amount: event.amount,
        currency: event.currency
      };
    }

    const order = await trx
      .selectFrom("orders")
      .selectAll()
      .where("order_code", "=", event.orderCode)
      .executeTakeFirst();

    if (!order) {
      throw new Error(`Order not found for webhook orderCode=${event.orderCode}`);
    }

    await trx
      .insertInto("payments")
      .values({
        order_id: order.id,
        provider,
        provider_ref: event.providerRef,
        status: event.status,
        amount: event.amount,
        currency: event.currency,
        raw_payload_json: event.rawPayload
      })
      .onConflict((oc) =>
        oc.columns(["provider", "provider_ref"]).doUpdateSet({
          status: event.status,
          amount: event.amount,
          currency: event.currency,
          raw_payload_json: event.rawPayload
        })
      )
      .execute();

    let updatedToPaid = false;
    if (event.status === "paid" && order.status !== "paid") {
      await trx.updateTable("orders").set({ status: "paid" }).where("id", "=", order.id).execute();
      updatedToPaid = true;
    }

    let recipientEmail: string | null = order.guest_email;
    if (!recipientEmail && order.user_profile_id) {
      const profile = await trx
        .selectFrom("users_profile")
        .select(["email"])
        .where("id", "=", order.user_profile_id)
        .executeTakeFirst();
      recipientEmail = profile?.email ?? null;
    }

    return {
      duplicated: false,
      orderCode: order.order_code,
      updatedToPaid,
      recipientEmail,
      amount: event.amount,
      currency: event.currency
    };
  });

  if (transition.updatedToPaid && transition.recipientEmail) {
    await sendOrderPaidEmail({
      orderCode: transition.orderCode,
      email: transition.recipientEmail,
      amount: transition.amount,
      currency: transition.currency
    });
  }

  return transition;
}
