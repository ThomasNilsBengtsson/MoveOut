# MoveOut

How to Use
Prerequisites
Node.js: Download from nodejs.org
MySQL: This project uses a MySQL database hosted on DigitalOcean.
Database CA Certificate
To securely connect to the DigitalOcean database, a CA certificate file is required. Ensure the certificate file is located in the designated folder within your project so that the database connection uses it securely.

Ngrok for Remote Access
This project uses Ngrok to securely expose the local server to the internet. Ngrok is particularly helpful for testing features that require external access, such as scanning the QR code on a label with a mobile device to render its contents.

Install Ngrok: Download and install Ngrok from ngrok.com.
Start Ngrok: Run the following command to create a tunnel for your application (assuming it runs on port 3000):
