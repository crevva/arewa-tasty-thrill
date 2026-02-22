export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  seoTitle: string | null;
  seoDescription: string | null;
  markdown: string;
  published: boolean;
  updatedAt: string;
};
