import { z, defineCollection } from "astro:content";

const imagesCollection = defineCollection({
    type: 'content',
    schema: ({ image }) => z.object({
      title: z.string(),
      date: z.date(),
      src: image(), //.refine((img) => img.width >= 1080, {message: "Cover image must be at least 1080 pixels wide!"}),
      tags: z.optional(z.array(z.string())),
    })
});

// Export a single `collections` object to register your collection(s)
export const collections = {
  images: imagesCollection,
};