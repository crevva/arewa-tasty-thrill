import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

import type { Database } from "../src/lib/db/types";
import { ensureSeededSuperadmin } from "../src/server/backoffice/bootstrap";
import { galleryOnlyImages, productImageMap } from "./product-image-map";

type SeedDb = Kysely<Database>;

const categories = [
  { name: "Smoothies & Juices", slug: "smoothies-juices" },
  { name: "Shawarma", slug: "shawarma" },
  { name: "Combos", slug: "combos" }
];

const products = [
  {
    name: "Fruity Zobo",
    slug: "fruity-zobo",
    description: "Refreshing zobo blend with fruity depth and a bold finish.",
    base_price: 250000,
    category: "smoothies-juices"
  },
  {
    name: "Green Detox Smoothie",
    slug: "green-detox-smoothie",
    description: "Spinach-forward blend with cucumber and citrus brightness.",
    base_price: 280000,
    category: "smoothies-juices"
  },
  {
    name: "Banana Bliss Smoothie",
    slug: "banana-bliss-smoothie",
    description: "Creamy banana smoothie with naturally sweet finish.",
    base_price: 270000,
    category: "smoothies-juices"
  },
  {
    name: "Berry Beet Smoothie",
    slug: "berry-beet-smoothie",
    description: "Rich berry-beet blend with antioxidant-packed flavor.",
    base_price: 300000,
    category: "smoothies-juices"
  },
  {
    name: "Classic Chicken Shawarma",
    slug: "classic-chicken-shawarma",
    description: "Loaded chicken shawarma with crisp veggies and creamy sauce.",
    base_price: 420000,
    category: "shawarma"
  },
  {
    name: "Classic Beef Shawarma",
    slug: "classic-beef-shawarma",
    description: "Smoky beef shawarma with signature AT Thrill dressing.",
    base_price: 480000,
    category: "shawarma"
  },
  {
    name: "Shawarma + Drink Combo",
    slug: "shawarma-drink-combo",
    description: "One shawarma and one drink, perfectly paired.",
    base_price: 620000,
    category: "combos"
  },
  {
    name: "Grilled Chicken & Fries Combo",
    slug: "grilled-chicken-fries-combo",
    description: "Grilled chicken portions with fries and a side drink.",
    base_price: 950000,
    category: "combos"
  }
];

const zones = [
  ["Ikeja", 180000, "45-60 mins"],
  ["Lekki", 250000, "55-70 mins"],
  ["Victoria Island", 260000, "55-75 mins"],
  ["Surulere", 200000, "45-65 mins"],
  ["Yaba", 190000, "40-60 mins"],
  ["Ajah", 280000, "65-85 mins"],
  ["Ikorodu", 300000, "75-95 mins"],
  ["Mainland", 210000, "50-70 mins"]
] as const;

const cmsPages = [
  {
    slug: "about",
    title: "About AT Thrill",
    seo_title: "About AT Thrill",
    seo_description: "Meet Arewa Tasty Thrill, Lagos' premium shawarma and smoothie kitchen.",
    markdown: "## About Us\n\nArewa Tasty Thrill crafts premium shawarma, smoothies, and event-ready catering experiences across Lagos."
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    seo_title: "AT Thrill FAQ",
    seo_description: "Delivery, payments, and ordering help for AT Thrill.",
    markdown: "## FAQ\n\n### Do you deliver in Lagos?\nYes. Select your zone at checkout.\n\n### Can I order as a guest?\nYes, guest checkout is first-class."
  },
  {
    slug: "legal",
    title: "Legal",
    seo_title: "AT Thrill Legal",
    seo_description: "Privacy policy and purchase terms for AT Thrill orders.",
    markdown: "## Legal\n\nBy placing an order, you agree to our delivery and refund terms."
  },
  {
    slug: "contact",
    title: "Contact",
    seo_title: "Contact AT Thrill",
    seo_description: "Contact AT Thrill for support, events, and partnerships.",
    markdown: "## Contact\n\nReach us via Instagram or phone for quick support and event inquiries."
  },
  {
    slug: "home",
    title: "Homepage Content",
    seo_title: "AT Thrill Premium Food in Lagos",
    seo_description: "Shawarma, smoothies, and combos delivered in Lagos.",
    markdown: "## Hero\n\nEvery taste is a thrill."
  }
];

async function seedCatalog(db: SeedDb) {
  for (const category of categories) {
    await db
      .insertInto("categories")
      .values(category)
      .onConflict((oc) => oc.column("slug").doUpdateSet({ name: category.name }))
      .execute();
  }

  const categoryRows = await db.selectFrom("categories").select(["id", "slug"]).execute();
  const categoryIdBySlug = new Map(categoryRows.map((row) => [row.slug as string, row.id as string]));

  for (const product of products) {
    const categoryId = categoryIdBySlug.get(product.category);
    if (!categoryId) {
      throw new Error(`Category not found for ${product.slug}`);
    }

    await db
      .insertInto("products")
      .values({
        name: product.name,
        slug: product.slug,
        description: product.description,
        base_price: product.base_price,
        active: true,
        in_stock: true,
        category_id: categoryId
      })
      .onConflict((oc) =>
        oc.column("slug").doUpdateSet({
          name: product.name,
          description: product.description,
          base_price: product.base_price,
          category_id: categoryId,
          in_stock: true,
          active: true
        })
      )
      .execute();
  }

  const productRows = await db.selectFrom("products").select(["id", "slug"]).execute();
  const productIdBySlug = new Map(productRows.map((row) => [row.slug as string, row.id as string]));

  for (const [slug, images] of Object.entries(productImageMap)) {
    const productId = productIdBySlug.get(slug);
    if (!productId) {
      continue;
    }

    await db.deleteFrom("product_images").where("product_id", "=", productId).execute();

    for (const [index, filename] of images.entries()) {
      await db
        .insertInto("product_images")
        .values({
          product_id: productId,
          storage_path: `local/${filename}`,
          sort_order: index
        })
        .execute();
    }
  }

  const galleryCategory = categoryIdBySlug.get("combos");
  if (galleryCategory) {
    for (const [index, filename] of galleryOnlyImages.entries()) {
      const slug = `gallery-shot-${index + 1}`;
      await db
        .insertInto("products")
        .values({
          name: `Gallery Shot ${index + 1}`,
          slug,
          description: "Editorial gallery-only photo.",
          base_price: 100000,
          active: false,
          in_stock: false,
          category_id: galleryCategory
        })
        .onConflict((oc) => oc.column("slug").doNothing())
        .execute();

      const product = await db
        .selectFrom("products")
        .select(["id"])
        .where("slug", "=", slug)
        .executeTakeFirst();

      if (product?.id) {
        await db.deleteFrom("product_images").where("product_id", "=", product.id).execute();
        await db
          .insertInto("product_images")
          .values({
            product_id: product.id,
            storage_path: `local/${filename}`,
            sort_order: 0
          })
          .execute();
      }
    }
  }
}

async function seedZones(db: SeedDb) {
  for (const [zone, fee, eta] of zones) {
    await db
      .insertInto("delivery_zones")
      .values({
        country: "Nigeria",
        state: "Lagos",
        city: "Lagos",
        zone,
        fee,
        eta_text: eta,
        active: true
      })
      .onConflict((oc) =>
        oc.columns(["country", "state", "city", "zone"]).doUpdateSet({
          fee,
          eta_text: eta,
          active: true
        })
      )
      .execute();
  }
}

async function seedCms(db: SeedDb) {
  for (const page of cmsPages) {
    await db
      .insertInto("cms_pages")
      .values({
        ...page,
        published: true
      })
      .onConflict((oc) =>
        oc.column("slug").doUpdateSet({
          title: page.title,
          seo_title: page.seo_title,
          seo_description: page.seo_description,
          markdown: page.markdown,
          published: true,
          updated_at: new Date()
        })
      )
      .execute();
  }
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for db:seed");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = new Kysely({
    dialect: new PostgresDialect({ pool })
  });

  try {
    await seedCatalog(db);
    await seedZones(db);
    await seedCms(db);
    await ensureSeededSuperadmin({ db });
    console.log("Database seed completed.");
  } finally {
    await db.destroy();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
