/* const QRCode = require('qrcode');

// Generate QR Code with the text "hi"
QRCode.toString('hi', { type: 'terminal' }, function (err, url) {
  if (err) return console.log('Error occurred', err);

  // Print the QR code in the terminal
  console.log(url);
});
 */

/* const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function overlayQRCodeOnImage(text, imagePath, outputPath) {
  // Load the background image
  const backgroundImage = await loadImage(imagePath);
  const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
  const ctx = canvas.getContext('2d');

  // Draw the background image onto the canvas
  ctx.drawImage(backgroundImage, 0, 0);

  // Create a canvas for the QR code
  const qrSize = 100; // Size of the QR code
  const qrCanvas = createCanvas(qrSize, qrSize);

  // Generate the QR code directly onto the QR canvas
  await QRCode.toCanvas(qrCanvas, text);

  // Calculate the position to center the QR code on the background image
  const x = (canvas.width - qrSize) / 2;
  const y = (canvas.height - qrSize) / 2;

  // Draw the QR code onto the main canvas
  ctx.drawImage(qrCanvas, x, y);

  // Save the final image
  const out = fs.createWriteStream(outputPath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () => {
    console.log('The image was saved successfully!');
  });
} */

/* (async () => {
  try {
    await overlayQRCodeOnImage('Hi', 'public/images/label-image.png', 'output-image.png');
  } catch (error) {
    console.error('Error:', error);
  }
})();
 */



const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // For generating unique filenames

async function overlayQRCodeOnImage(text, imagePath) {
  // Generate a unique filename
  const filename = uuidv4() + '.png';
  const outputPath = path.join('public', 'images', filename);

  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load the background image
  const backgroundImage = await loadImage(imagePath);
  const canvas = createCanvas(backgroundImage.width, backgroundImage.height);
  const ctx = canvas.getContext('2d');

  // Draw the background image onto the canvas
  ctx.drawImage(backgroundImage, 0, 0);

  // Create a canvas for the QR code
  const qrSize = 100; // Size of the QR code
  const qrCanvas = createCanvas(qrSize, qrSize);

  // Generate the QR code directly onto the QR canvas
  await QRCode.toCanvas(qrCanvas, text);

  // Calculate the position to center the QR code on the background image
  const x = (canvas.width - qrSize) / 2;
  const y = (canvas.height - qrSize) / 2;

  // Draw the QR code onto the main canvas
  ctx.drawImage(qrCanvas, x, y);

  // Save the final image and return the output path
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(outputPath);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => {
      console.log('The image was saved successfully!');
      resolve(outputPath); // Return the path to the saved image
    });
    out.on('error', (err) => {
      reject(err);
    });
  });
}





module.exports = 
{ 
    overlayQRCodeOnImage
};
