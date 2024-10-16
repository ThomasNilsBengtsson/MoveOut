const sharp = require('sharp');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const path = require('path');


async function overlayQRCodeOnImage(text, imagePath, email, labelId, labelTitle) {
  const filename = `qr_code_${labelId}.png`;
  const outputPath = path.join('public', 'labels', email, filename);

  // Generate QR code as a buffer
  const qrBuffer = await QRCode.toBuffer(text, { width: 100, height: 100 });

  // Resize the background image
  const resizedBackground = await sharp(imagePath).resize({ width: 300, height: 400 }).toBuffer();

  // Create an SVG with the text
  const textSvg = `
    <svg width="300" height="50">
      <text x="50%" y="50%" font-size="24" text-anchor="middle" dominant-baseline="middle" fill="white">
        ${labelTitle}
      </text>
    </svg>
  `;
  const textBuffer = Buffer.from(textSvg);

  // Composite the text and QR code on the background image
  const metadata = await sharp(resizedBackground).metadata();
  const x = Math.floor((metadata.width - 100) / 2);
  const y = Math.floor((metadata.height - 100) / 2);

  await sharp(resizedBackground)
    .composite([
      {
        input: textBuffer,
        top: 0, // Place text at the top
        left: 0,
      },
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

/* async function overlayQRCodeOnImage(text, imagePath, email, labelId) {
  const filename = `qr_code_${labelId}.png`;
  const outputPath = path.join('public', 'labels', email, filename);

  
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
} */

module.exports = { overlayQRCodeOnImage };
