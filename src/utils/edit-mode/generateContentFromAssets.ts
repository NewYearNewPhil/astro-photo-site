import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { frontmatterString, readDate, readExif, slugify } from "./metadata";

const assetsRoot = path.resolve("src/assets/images");
const contentRoot = path.resolve("src/content/images");

type GenerateOptions = {
  overwrite?: boolean;
};

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function clearExistingContent() {
  await fs.rm(contentRoot, { recursive: true, force: true });
  await ensureDir(contentRoot);
}

export async function generateContentFromAssets(options: GenerateOptions = {}) {
  const { overwrite = false } = options;
  if (overwrite) {
    await clearExistingContent();
  } else {
    await ensureDir(contentRoot);
  }
  const tags = await fs.readdir(assetsRoot);

  for (const tag of tags) {
    const tagDir = path.join(assetsRoot, tag);
    const stat = await fs.stat(tagDir);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(tagDir);
    for (const filename of files) {
      const slug = slugify(filename);
      const outPath = path.join(contentRoot, `${slug}.md`);
      if (!overwrite) {
        try {
          await fs.access(outPath);
          continue; // skip existing
        } catch {
          // fallthrough
        }
      }
      const absImagePath = path.join(tagDir, filename);
      const exif = await readExif(absImagePath);
      const date = await readDate(absImagePath, exif);
      const orderMatch = filename.match(/^(\d+)_/);
      const order = orderMatch ? Number(orderMatch[1]) : undefined;
      const fm = frontmatterString({
        slug,
        image: `../assets/images/${tag}/${filename}`,
        tags: [tag],
        exif,
        date,
        order,
      });
      await fs.writeFile(outPath, fm, "utf8");
    }
  }
  return { ok: true } as const;
}


async function main() {
  const overwrite = process.argv.includes("--overwrite");
  await generateContentFromAssets({ overwrite });
  console.log(`Content generation complete${overwrite ? " (overwritten)" : ""}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
