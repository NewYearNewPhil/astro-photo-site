import type { CollectionEntry } from "astro:content";

export interface ExifData {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
}

export interface ImageData {
  slug: string;
  data: {
    src: any;
    tags: string[];
    exif?: ExifData;
  };
}

async function extractExifData(filePath: string): Promise<ExifData | undefined> {
  try {
    const exifr = (await import('exifr')).default;
    
    const exif = await exifr.parse(filePath, {
      pick: [
        'Make', 'Model', // camera
        'LensModel', 'LensSpecification', // lens
        'FocalLength', 'FocalLengthIn35mmFormat', // focal length
        'FNumber', 'ApertureValue', // aperture
        'ExposureTime', 'ShutterSpeedValue', // shutter speed
        'ISO', 'ISOSpeedRatings', // ISO
      ]
    });

    if (!exif) return undefined;

    return {
      camera: exif.Make && exif.Model ? `${exif.Make} ${exif.Model}` : undefined,
      lens: exif.LensModel || undefined,
      focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : undefined,
      aperture: exif.FNumber ? `f/${exif.FNumber}` : undefined,
      shutterSpeed: exif.ExposureTime ? formatShutterSpeed(exif.ExposureTime) : undefined,
      iso: exif.ISO || exif.ISOSpeedRatings || undefined,
    };
  } catch (error) {
    console.warn(`Failed to extract EXIF data from ${filePath}:`, error);
    return undefined;
  }
}

function formatShutterSpeed(exposureTime: number): string {
  if (exposureTime >= 1) {
    return `${exposureTime}s`;
  } else {
    return `1/${Math.round(1 / exposureTime)}s`;
  }
}

export async function processImagesFromCollection(
  entries: CollectionEntry<"images">[],
  assetModules?: Record<string, any>,
): Promise<ImageData[]> {
  const sorted = sortEntries(entries);
  const assets =
    assetModules ?? import.meta.glob("../assets/images/**/*.{jpeg,jpg,png,webp}", { eager: true });

  const results: ImageData[] = [];
  for (const entry of sorted) {
    const src = resolveAsset(entry.data.image, assets);
    results.push({
      slug: entry.data.slug ?? entry.id,
      data: {
        src,
        tags: entry.data.tags ?? [],
        exif: entry.data.exif,
      },
    });
  }
  return results;
}

function resolveAsset(imagePath: string, assets: Record<string, any>) {
  const filename = imagePath.split("/").pop();
  if (!filename) return undefined;
  const matchKey = Object.keys(assets).find((key) => key.endsWith(`/${filename}`));
  const mod = matchKey ? assets[matchKey] : undefined;
  return mod ? mod.default ?? mod : undefined;
}

function sortEntries(entries: CollectionEntry<"images">[]) {
  return [...entries].sort((a, b) => {
    const aOrder = a.data.order ?? Number.POSITIVE_INFINITY;
    const bOrder = b.data.order ?? Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.id.localeCompare(b.id);
  });
}

export function extractTagsFromCollection(entries: CollectionEntry<"images">[]): string[] {
  const tags = [...new Set(entries.flatMap((e) => e.data.tags ?? []))];
  return tags.sort();
}

export async function groupImagesByTagFromCollection(
  entries: CollectionEntry<"images">[],
): Promise<Record<string, ImageData[]>> {
  const allImages = await processImagesFromCollection(entries);
  const imagesByTag: Record<string, ImageData[]> = {};

  for (const image of allImages) {
    const tags = image.data.tags?.length ? image.data.tags : ["untagged"];
    for (const tag of tags) {
      if (!imagesByTag[tag]) {
        imagesByTag[tag] = [];
      }
      imagesByTag[tag].push(image);
    }
  }

  return imagesByTag;
}