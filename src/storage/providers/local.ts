import path from "node:path";

import type { StorageProvider, UploadProductImageInput } from "@/storage/types";

const localStorageProvider: StorageProvider = {
  async uploadProductImage(input: UploadProductImageInput) {
    const safeFile = `${Date.now()}-${input.fileName}`.replace(/[^a-zA-Z0-9.-]/g, "-");
    return {
      storagePath: `local/${safeFile}`,
      publicUrl: `/images/${safeFile}`
    };
  },
  getPublicUrl(storagePath) {
    if (storagePath.startsWith("local/")) {
      return `/images/${path.basename(storagePath)}`;
    }
    return storagePath;
  },
  async deleteObject() {
    return;
  }
};

export default localStorageProvider;
