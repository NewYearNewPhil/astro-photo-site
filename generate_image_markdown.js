import fs from 'fs';
import path from 'path';

fs.readdir('./src/assets/images', (err, files) => {
    if (err) {
        console.error(`Failed to read directory: ${err.message}`);
        return;
    }

    files.forEach(file => {
        const outputFileName = `${file}.md`;
        const outputFilePath = path.join('./src/content/images', outputFileName);

        // Check if the output file already exists
        if (fs.existsSync(outputFilePath)) {
            console.log(`File already exists, skipping: ${outputFilePath}`);
            return;
        }

        // Create the content for the markdown file
        const content = `---
src: "../../assets/images/${file}"
date: 2022-01-01
tags: []
---`;

        // Write the content to the markdown file
        fs.writeFile(outputFilePath, content, (err) => {
            if (err) {
                console.error(`Failed to write file: ${err.message}`);
                return;
            }

            console.log(`File created: ${outputFilePath}`);
        });
    });
});
