import { promises as fs } from "fs";
import exifr from "exifr";

export type ParsedExif = {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  rawDates?: {
    DateTimeOriginal?: Date;
    CreateDate?: Date;
    ModifyDate?: Date;
  };
};

export function slugify(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  return base.replace(/^\d+_/, "");
}

export async function readExif(filePath: string): Promise<ParsedExif | undefined> {
  try {
    const parsed = await exifr.parse(filePath, {
      pick: [
        "Make",
        "Model",
        "LensModel",
        "LensSpecification",
        "FocalLength",
        "FocalLengthIn35mmFormat",
        "FNumber",
        "ApertureValue",
        "ExposureTime",
        "ShutterSpeedValue",
        "ISO",
        "ISOSpeedRatings",
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
      ],
    });
    if (!parsed) return undefined;
    return {
      camera: parsed.Make && parsed.Model ? `${parsed.Make} ${parsed.Model}` : undefined,
      lens: (parsed as any).LensModel ?? undefined,
      focalLength: parsed.FocalLength ? `${parsed.FocalLength}mm` : undefined,
      aperture: parsed.FNumber ? `f/${parsed.FNumber}` : undefined,
      shutterSpeed: formatShutterSpeed(parsed.ExposureTime),
      iso: parsed.ISO || parsed.ISOSpeedRatings || undefined,
      rawDates: {
        DateTimeOriginal: parsed.DateTimeOriginal,
        CreateDate: parsed.CreateDate,
        ModifyDate: parsed.ModifyDate,
      },
    };
  } catch (err) {
    console.warn(`EXIF parse failed for ${filePath}:`, err);
    return undefined;
  }
}

export async function readDate(filePath: string, exif?: ParsedExif): Promise<string | undefined> {
  const exifDate: Date | undefined =
    exif?.rawDates?.DateTimeOriginal || exif?.rawDates?.CreateDate || exif?.rawDates?.ModifyDate;
  if (exifDate instanceof Date && !Number.isNaN(exifDate.getTime())) {
    return exifDate.toISOString();
  }
  try {
    const stats = await fs.stat(filePath);
    return stats.birthtime.toISOString();
  } catch {
    return undefined;
  }
}

function formatShutterSpeed(exposureTime?: number) {
  if (typeof exposureTime !== "number") return undefined;
  if (exposureTime >= 1) return `${exposureTime}s`;
  return `1/${Math.round(1 / exposureTime)}s`;
}

export function frontmatterString({
  title = "",
  slug,
  image,
  tags,
  date,
  exif,
  order,
}: {
  title?: string;
  slug: string;
  image: string;
  tags: string[];
  date?: string;
  exif?: ParsedExif;
  order?: number;
}) {
  const lines: string[] = [
    "---",
    `title: "${title}"`,
    `slug: "${slug}"`,
    `image: "${image}"`,
    "tags:",
    ...tags.map((tag) => `  - "${tag}"`),
  ];

  if (date) {
    lines.push(`date: ${date}`);
  }

  if (
    exif &&
    (exif.camera ||
      exif.lens ||
      exif.focalLength ||
      exif.aperture ||
      exif.shutterSpeed ||
      typeof exif.iso === "number")
  ) {
    lines.push("exif:");
    if (exif.camera) lines.push(`  camera: "${exif.camera}"`);
    if (exif.lens) lines.push(`  lens: "${exif.lens}"`);
    if (exif.focalLength) lines.push(`  focalLength: "${exif.focalLength}"`);
    if (exif.aperture) lines.push(`  aperture: "${exif.aperture}"`);
    if (exif.shutterSpeed) lines.push(`  shutterSpeed: "${exif.shutterSpeed}"`);
    if (typeof exif.iso === "number") lines.push(`  iso: ${exif.iso}`);
  }

  if (typeof order === "number") {
    lines.push(`order: ${order}`);
  }

  lines.push("---", "");
  return lines.join("\n");
}
