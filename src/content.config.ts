import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const emptyToUndefined = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.number().optional());
const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

const exifSchema = z
  .object({
    camera: optionalString,
    lens: optionalString,
    focalLength: optionalString,
    aperture: optionalString,
    shutterSpeed: optionalString,
    iso: optionalNumber,
  })
  .strip()
  .optional();

const images = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/images" }),
  schema: z.object({
    title: z.string().default(""),
    slug: z.string(),
    image: z.string(),
    tags: z.array(z.string()).min(1),
    date: optionalDate,
    exif: exifSchema,
    order: optionalNumber,
  }),
});

export const collections = {
  images,
};
