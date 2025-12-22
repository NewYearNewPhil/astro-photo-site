import type { APIRoute } from "astro";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { frontmatterString, readDate, readExif, slugify } from "../../utils/edit-mode/metadata";

export const prerender = import.meta.env.PROD;
console.log(import.meta.env.PROD)
const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";

export const GET: APIRoute = async () => {
    return new Response(undefined, { status: 404 });
};

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response(undefined, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    return new Response("Expected multipart/form-data", { status: 415 });
  }

  const file = form.get("file");
  const tagValue = (() => {
    const tag = form.get("tag");
    if (typeof tag === "string" && tag.trim()) return tag.trim();
    return "uploads";
  })();

  if (!(file instanceof File)) {
    return new Response("'file' is required", { status: 400 });
  }

  const originalName = file.name || "upload";
  const ext = path.extname(originalName) || ".jpg";
  const baseName = toSlug(path.basename(originalName, ext));
  const folder = toSlug(tagValue);

  const targetDir = path.join(process.cwd(), "src", "assets", "images", folder);
  await mkdir(targetDir, { recursive: true });

  let filename = `${baseName}${ext}`;
  let counter = 1;
  while (existsSync(path.join(targetDir, filename))) {
    filename = `${baseName}-${counter}${ext}`;
    counter += 1;
  }

  const slug = slugify(filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(targetDir, filename), buffer);

  const assetPath = `../assets/images/${folder}/${filename}`;

  // write markdown next to content collection
  const contentDir = path.join(process.cwd(), "src", "content", "images");
  await mkdir(contentDir, { recursive: true });

  const absImagePath = path.join(targetDir, filename);
  const exif = await readExif(absImagePath);
  const date = await readDate(absImagePath, exif);
  const md = frontmatterString({
    slug,
    image: assetPath,
    tags: [folder],
    exif,
    date,
  });
  await writeFile(path.join(contentDir, `${slug}.md`), md, "utf8");

  return new Response(JSON.stringify({ assetPath, slug: `${folder}/${slug}` }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
