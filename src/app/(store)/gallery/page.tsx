import Image from "next/image";

import { DEFAULT_BLUR_DATA_URL } from "@/lib/constants/images";
import { listGalleryImages } from "@/server/store/catalog";

export default async function GalleryPage() {
  const images = await listGalleryImages();

  return (
    <section className="section-shell">
      <header className="mb-6">
        <h1 className="h1">Gallery</h1>
        <p className="mt-2 text-muted-foreground">A visual taste of our menu, styling, and catering moments.</p>
      </header>

      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((image, index) => (
          <div key={`${image}-${index}`} className="mb-4 overflow-hidden rounded-2xl border border-primary/10 bg-card shadow-premium">
            <Image
              src={image}
              alt={`AT Thrill gallery shot ${index + 1}`}
              width={900}
              height={700}
              className="h-auto w-full object-cover"
              placeholder="blur"
              blurDataURL={DEFAULT_BLUR_DATA_URL}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
