const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
  await c.connect();

  const order = await c.query("select order_code, status, subtotal, delivery_fee, total, guest_email, guest_phone from orders where order_code = 'AT-0FEA994D'");
  const payments = await c.query("select provider, provider_ref, status, amount, currency from payments where order_id = (select id from orders where order_code = 'AT-0FEA994D') order by created_at asc");
  const events = await c.query("select provider, event_id from webhook_events where event_id = '900001'");

  console.log(JSON.stringify({
    order: order.rows[0] ?? null,
    payments: payments.rows,
    webhookEvents: events.rows,
    webhookCount: events.rowCount
  }, null, 2));

  await c.end();
})();
