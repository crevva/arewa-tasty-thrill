import { Generated, Insertable, Selectable, Updateable } from "kysely";

export type Json = Record<string, unknown>;

export type UsersProfileTable = {
  id: Generated<string>;
  email: string | null;
  name: string | null;
  phone: string | null;
  created_at: Generated<Date>;
};

export type AuthIdentitiesTable = {
  id: Generated<string>;
  user_profile_id: string;
  provider: string;
  provider_user_id: string;
  provider_email: string | null;
  created_at: Generated<Date>;
};

export type UserCredentialsTable = {
  id: Generated<string>;
  user_profile_id: string;
  password_hash: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type UserAddressesTable = {
  id: Generated<string>;
  user_profile_id: string;
  label: string;
  address_json: Json;
  created_at: Generated<Date>;
};

export type CategoriesTable = {
  id: Generated<string>;
  name: string;
  slug: string;
};

export type ProductsTable = {
  id: Generated<string>;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  active: boolean;
  in_stock: boolean;
  category_id: string;
  created_at: Generated<Date>;
};

export type ProductImagesTable = {
  id: Generated<string>;
  product_id: string;
  storage_path: string;
  sort_order: number;
};

export type DeliveryZonesTable = {
  id: Generated<string>;
  country: string;
  state: string;
  city: string;
  zone: string;
  fee: number;
  eta_text: string;
  active: boolean;
};

export type OrdersTable = {
  id: Generated<string>;
  order_code: string;
  user_profile_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency: string;
  delivery_zone_id: string;
  delivery_address_json: Json;
  created_at: Generated<Date>;
};

export type OrderItemsTable = {
  id: Generated<string>;
  order_id: string;
  product_id: string;
  name_snapshot: string;
  unit_price_snapshot: number;
  qty: number;
  line_total: number;
};

export type PaymentsTable = {
  id: Generated<string>;
  order_id: string;
  provider: string;
  provider_ref: string;
  status: string;
  amount: number;
  currency: string;
  raw_payload_json: Json;
  created_at: Generated<Date>;
};

export type WebhookEventsTable = {
  id: Generated<string>;
  provider: string;
  event_id: string;
  received_at: Generated<Date>;
  raw_payload_json: Json;
};

export type EventRequestsTable = {
  id: Generated<string>;
  user_profile_id: string | null;
  name: string;
  phone: string;
  email: string;
  event_date: Date | null;
  event_type: string;
  guests_estimate: number | null;
  notes: string | null;
  status: string;
  created_at: Generated<Date>;
};

export type AdminAuditLogTable = {
  id: Generated<string>;
  actor_user_profile_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  created_at: Generated<Date>;
  meta_json: Json;
};

export type CmsPagesTable = {
  id: Generated<string>;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  markdown: string;
  published: boolean;
  updated_at: Generated<Date>;
};

export type RateLimitBucketsTable = {
  id: Generated<string>;
  route_key: string;
  subject_key: string;
  window_start: Date;
  attempts: number;
  updated_at: Generated<Date>;
};

export type BackofficeUsersTable = {
  id: Generated<string>;
  user_profile_id: string;
  role: "superadmin" | "admin" | "staff";
  status: "active" | "suspended";
  created_by_user_profile_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

export type BackofficeInvitesTable = {
  id: Generated<string>;
  email: string;
  role: "admin" | "staff";
  token_hash: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: Date;
  invited_by_user_profile_id: string;
  accepted_user_profile_id: string | null;
  accepted_at: Date | null;
  revoked_at: Date | null;
  created_at: Generated<Date>;
};

export type Database = {
  users_profile: UsersProfileTable;
  auth_identities: AuthIdentitiesTable;
  user_credentials: UserCredentialsTable;
  user_addresses: UserAddressesTable;
  categories: CategoriesTable;
  products: ProductsTable;
  product_images: ProductImagesTable;
  delivery_zones: DeliveryZonesTable;
  orders: OrdersTable;
  order_items: OrderItemsTable;
  payments: PaymentsTable;
  webhook_events: WebhookEventsTable;
  event_requests: EventRequestsTable;
  admin_audit_log: AdminAuditLogTable;
  cms_pages: CmsPagesTable;
  rate_limit_buckets: RateLimitBucketsTable;
  backoffice_users: BackofficeUsersTable;
  backoffice_invites: BackofficeInvitesTable;
};

export type Row<T extends keyof Database> = Selectable<Database[T]>;
export type NewRow<T extends keyof Database> = Insertable<Database[T]>;
export type RowUpdate<T extends keyof Database> = Updateable<Database[T]>;
