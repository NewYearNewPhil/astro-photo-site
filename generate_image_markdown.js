import fs from 'fs';
import path from 'path';
import exifr from 'exifr';

// Helper function to extract date from EXIF data
async function getImageDate(filePath) {
    try {
        // Try to get EXIF data
        const exif = await exifr.parse(filePath, {
            // Only pick date-related tags for better performance
            pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate']
        });

        console.log(exif);

        if (exif) {
            // Try different possible date fields in order of preference
            const dateField = exif.DateTimeOriginal || 
                            exif.CreateDate ||
                            exif.ModifyDate;

            if (dateField instanceof Date) {
                return dateField.toISOString().split('T')[0];
            }
        }

        // Fallback to file creation date if no EXIF data
        const stats = await fs.promises.stat(filePath);
        return stats.birthtime.toISOString().split('T')[0];

    } catch (error) {
        console.warn(`Failed to read date from image metadata: ${error.message}`);
        return '2022-01-01'; // Fallback to default date if all methods fail
    }
}

// Main function to process images and create markdown files
async function createImageMarkdown() {
    try {
        const files = await fs.promises.readdir('./src/assets/images');

        for (const file of files) {
            const imageFilePath = path.join('./src/assets/images', file);
            const outputFileName = `${file}.md`;
            const outputFilePath = path.join('./src/content/images', outputFileName);

            // Skip if output file already exists
            if (fs.existsSync(outputFilePath)) {
                console.log(`File already exists, skipping: ${outputFilePath}`);
                continue;
            }

            // Get the image date
            const imageDate = await getImageDate(imageFilePath);

            // Create the content for the markdown file
            const content = `---
src: "../../assets/images/${file}"
date: ${imageDate}
tags: []
---`;

            // Write the content to the markdown file
            await fs.promises.writeFile(outputFilePath, content);
            console.log(`File created: ${outputFilePath}`);
        }

    } catch (error) {
        console.error(`Process failed: ${error.message}`);
    }
}

// Run the process
createImageMarkdown();