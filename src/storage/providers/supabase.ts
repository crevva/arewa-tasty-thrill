import path from "node:path";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StorageProvider, UploadProductImageInput } from "@/storage/types";

const BUCKET = "product-media";

function publicFallback(storagePath: string) {
  if (storagePath.startsWith("local/")) {
    return `/images/${path.basename(storagePath)}`;
  }
  return storagePath;
}

const supabaseStorageProvider: StorageProvider = {
  async uploadProductImage(input: UploadProductImageInput) {
    const supabase = createSupabaseAdminClient();
    const safeName = `${Date.now()}-${input.fileName}`.replace(/[^a-zA-Z0-9.-]/g, "-");
    const folder = input.folder ?? "products";
    const storagePath = `${folder}/${safeName}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, Buffer.from(input.fileBuffer), {
        contentType: input.contentType,
        upsert: false
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: data.publicUrl
    };
  },
  getPublicUrl(storagePath: string) {
    if (storagePath.startsWith("local/")) {
      return publicFallback(storagePath);
    }

    try {
      const supabase = createSupabaseAdminClient();
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      return data.publicUrl;
    } catch {
      return storagePath;
    }
  },
  async deleteObject(storagePath: string) {
    if (storagePath.startsWith("local/")) {
      return;
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) {
      throw new Error(error.message);
    }
  }
};

export default supabaseStorageProvider;
