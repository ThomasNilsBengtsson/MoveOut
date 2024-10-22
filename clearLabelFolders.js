const fs = require('fs');
const path = require('path');

async function clearLabelFolders() {
    const directories = [
        path.join(__dirname, 'public', 'uploads', 'images'),
        path.join(__dirname, 'public', 'uploads', 'audio'),
        path.join(__dirname, 'public', 'labels')
    ];

    for (const directory of directories) {
        try {
            const subDirs = await fs.promises.readdir(directory);

            for (const subDir of subDirs) {
                const subDirPath = path.join(directory, subDir);
                const files = await fs.promises.readdir(subDirPath);

                // Delete all files in the subdirectory
                for (const file of files) {
                    const filePath = path.join(subDirPath, file);
                    const stats = await fs.promises.stat(filePath);
                    
                    if (stats.isFile()) {
                        await fs.promises.unlink(filePath);
                        console.log(`Deleted file: ${filePath}`);
                    }
                }

                // Remove the subdirectory after deleting all files inside
                await fs.promises.rmdir(subDirPath);
                console.log(`Deleted directory: ${subDirPath}`);
            }
        } catch (err) {
            console.error(`Error reading or deleting files in directory ${directory}:`, err);
        }
    }
}

clearLabelFolders().catch(err => console.error('Error clearing label folders:', err));
