/* const express = require('express');
const app = express();
const port = 8000; // You can use any available port

app.get('/', (req, res) => {
  res.send('hello');
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
 */


const express = require('express');
const QRCode = require('qrcode'); // Import the QR code library
const app = express();
const port = 8000; // You can use any available port

// Replace this with your actual ngrok URL
const ngrokUrl = 'https://0ce9-2a02-1406-264-97a-3d8a-8365-ef2d-64f.ngrok-free.app'; // Update this with your ngrok URL

app.get('/', (req, res) => {
  res.send('hello');
});

// Route to generate and display the QR code
app.get('/qrcode', async (req, res) => {
  try {
    // Generate the QR code as a Data URL
    const qrCodeDataURL = await QRCode.toDataURL(ngrokUrl);

    // Send an HTML page that displays the QR code
    res.send(`
      <h1>Scan this QR Code with your phone</h1>
      <img src="${qrCodeDataURL}" alt="QR Code">
      <p>After scanning, you will be taken to the 'hello' page served by your local server.</p>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating QR code');
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
