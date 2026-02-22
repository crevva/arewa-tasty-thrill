import { getDb } from "@/lib/db";
import { getStorageProvider } from "@/storage";

type ProductCard = {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  inStock: boolean;
  categoryName: string;
  imageUrl: string;
};

type ProductJoinRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  in_stock: boolean;
  storage_path: string | null;
  sort_order: number | null;
  category_name: string;
};

function buildProductMap(rows: ProductJoinRow[]): ProductCard[] {
  const storage = getStorageProvider();
  const map = new Map<string, ProductCard & { images: Array<{ path: string; sort: number }> }>();

  for (const row of rows) {
    const existing = map.get(row.id);
    if (!existing) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        basePrice: row.base_price,
        inStock: row.in_stock,
        categoryName: row.category_name,
        imageUrl: "/images/arewa-pp.jpg",
        images: row.storage_path ? [{ path: row.storage_path, sort: row.sort_order ?? 0 }] : []
      });
      continue;
    }

    if (row.storage_path) {
      existing.images.push({ path: row.storage_path, sort: row.sort_order ?? 0 });
    }
  }

  return [...map.values()].map((product) => {
    const first = [...product.images].sort((a, b) => a.sort - b.sort)[0]?.path;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: product.basePrice,
      inStock: product.inStock,
      categoryName: product.categoryName,
      imageUrl: first ? storage.getPublicUrl(first) : "/images/arewa-pp.jpg"
    };
  });
}

export async function listActiveProducts() {
  const db = getDb();
  const rows = await db
    .selectFrom("products")
    .innerJoin("categories", "categories.id", "products.category_id")
    .leftJoin("product_images", "product_images.product_id", "products.id")
    .select([
      "products.id",
      "products.name",
      "products.slug",
      "products.description",
      "products.base_price",
      "products.in_stock",
      "product_images.storage_path",
      "product_images.sort_order",
      "categories.name as category_name"
    ])
    .where("products.active", "=", true)
    .orderBy("products.created_at desc")
    .execute();

  return buildProductMap(rows);
}

export async function getProductBySlug(slug: string) {
  const db = getDb();
  const rows = await db
    .selectFrom("products")
    .innerJoin("categories", "categories.id", "products.category_id")
    .leftJoin("product_images", "product_images.product_id", "products.id")
    .select([
      "products.id",
      "products.name",
      "products.slug",
      "products.description",
      "products.base_price",
      "products.in_stock",
      "product_images.storage_path",
      "product_images.sort_order",
      "categories.name as category_name"
    ])
    .where("products.slug", "=", slug)
    .where("products.active", "=", true)
    .execute();

  const products = buildProductMap(rows);
  return products[0] ?? null;
}

export async function listGalleryImages() {
  const storage = getStorageProvider();
  const rows = await getDb()
    .selectFrom("product_images")
    .select(["storage_path"])
    .orderBy("id asc")
    .execute();

  return rows.map((row) => storage.getPublicUrl(row.storage_path));
}

export async function listDeliveryZones() {
  return getDb()
    .selectFrom("delivery_zones")
    .selectAll()
    .where("active", "=", true)
    .orderBy("zone asc")
    .execute();
}

export async function listCategories() {
  return getDb().selectFrom("categories").selectAll().orderBy("name asc").execute();
}
