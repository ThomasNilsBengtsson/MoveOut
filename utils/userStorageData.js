const fs = require('fs').promises;
const path = require('path');

async function getTotalStorageUsed(email) {

    const userImageDir = path.join(__dirname, '..', 'public', 'uploads', 'images', email);
    const userAudioDir = path.join(__dirname, '..', 'public', 'uploads', 'audio', email);
    
    let totalSize = 0;

    async function getDirectorySize(directory) {
        try {
          
            const files = await fs.readdir(directory);
            for (const file of files) {
                const filePath = path.join(directory, file);
   
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    totalSize += stats.size;
                }
            }
        } catch (err) {
       
            if (err.code !== 'ENOENT') {
                console.error(`Error reading directory ${directory}:`, err);
            }
        }
    }

    await getDirectorySize(userImageDir);
    await getDirectorySize(userAudioDir);

    return totalSize;
}


module.exports = {
    getTotalStorageUsed
};
