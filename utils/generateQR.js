const sharp = require('sharp');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

async function overlayQRCodeOnImage(text, imagePath) {
  const filename = uuidv4() + '.png';
  const outputPath = path.join('public', 'images', filename);

  
  const qrBuffer = await QRCode.toBuffer(text, { width: 100, height: 100 });


  const resizedBackground = await sharp(imagePath).resize({ width: 300, height: 400 }).toBuffer();

  
  const metadata = await sharp(resizedBackground).metadata();


  const x = Math.floor((metadata.width - 100) / 2);
  const y = Math.floor((metadata.height - 100) / 2);

 
  await sharp(resizedBackground)
    .composite([
      {
        input: qrBuffer,
        top: y,
        left: x,
      },
    ])
    .toFile(outputPath);

  console.log('The image was saved successfully!');
  return outputPath;
}

module.exports = { overlayQRCodeOnImage };
