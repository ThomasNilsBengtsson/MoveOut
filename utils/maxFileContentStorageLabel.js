const fs = require('fs').promises;
const path = require('path');

const MAX_LABEL_STORAGE = 10 * 1024 * 1024; 

async function checkStorageLimit(existingImagePaths = [], existingAudioPaths = [], newFiles = []) {
    let totalSize = 0;
 
    for (const imagePath of existingImagePaths) {
        if (typeof imagePath === 'string') {
            const fullPath = path.join(__dirname, '..', 'public', imagePath);
            try {
                const stats = await fs.stat(fullPath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            } catch (err) {
                console.error(`Failed to get stats for image file: ${fullPath}`, err);
            }
        }
    }

    for (const audioPath of existingAudioPaths) {
        if (typeof audioPath === 'string') {
            const fullPath = path.join(__dirname, '..', 'public', audioPath);
            try {
                const stats = await fs.stat(fullPath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            } catch (err) {
                console.error(`Failed to get stats for audio file: ${fullPath}`, err);
            }
        }
    }

    for (const file of newFiles) {
        totalSize += file.size;
    }

    if (totalSize > MAX_LABEL_STORAGE) {
        return {
            exceedsLimit: true,
            message: `The total storage for this label exceeds the maximum allowed storage of ${(MAX_LABEL_STORAGE / 1024).toFixed(2)} KB.`
        };
    }
    
    return { exceedsLimit: false };
}

module.exports = {checkStorageLimit}

