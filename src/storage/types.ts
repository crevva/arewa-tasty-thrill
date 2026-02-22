export type UploadProductImageInput = {
  fileName: string;
  fileBuffer: ArrayBuffer;
  contentType: string;
  folder?: string;
};

export interface StorageProvider {
  uploadProductImage(input: UploadProductImageInput): Promise<{ storagePath: string; publicUrl: string }>;
  getPublicUrl(storagePath: string): string;
  deleteObject(storagePath: string): Promise<void>;
}
