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
    tag: string;
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

export async function processImages(imageModules: Record<string, any>): Promise<ImageData[]> {
  const imageList: { filename: string; path: string; module: any }[] = [];
  
  for (const [path, module] of Object.entries(imageModules)) {
    const filename = path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
    imageList.push({ filename, path, module });
  }
  
  // support numeric prefix for sorting
  imageList.sort((a, b) => {
    const aMatch = a.filename.match(/^(\d+)_/);
    const bMatch = b.filename.match(/^(\d+)_/);
    
    if (aMatch && bMatch) {
      const aNum = parseInt(aMatch[1], 10);
      const bNum = parseInt(bMatch[1], 10);
      return aNum - bNum;
    }
    
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    
    return a.filename.localeCompare(b.filename);
  });
  
  const allImages: ImageData[] = [];
  for (const { filename, path, module } of imageList) {
    const pathParts = path.split('/');
    const folder = pathParts[pathParts.length - 2];
    
    const slug = filename.replace(/^\d+_/, '');
    
    // Convert glob path to actual file system path for EXIF extraction
    // Remove all ../ segments and prepend src/
    const filePath = path.replace(/\.\.\//g, '').replace('assets/', 'src/assets/');
    const exifData = await extractExifData(filePath);
    
    allImages.push({
      slug: slug,
      data: {
        src: module.default,
        tag: folder,
        exif: exifData
      }
    });
  }

  return allImages;
}

export function extractTags(imageModules: Record<string, any>): string[] {
  const tags = [...new Set(Object.keys(imageModules).map(path => {
    const pathParts = path.split('/');
    return pathParts[pathParts.length - 2];
  }))];
  
  return tags.sort();
}

export async function groupImagesByTag(imageModules: Record<string, any>): Promise<Record<string, ImageData[]>> {
  const allImages = await processImages(imageModules);
  const imagesByTag: Record<string, ImageData[]> = {};

  for (const image of allImages) {
    if (!imagesByTag[image.data.tag]) {
      imagesByTag[image.data.tag] = [];
    }
    imagesByTag[image.data.tag].push(image);
  }

  return imagesByTag;
}