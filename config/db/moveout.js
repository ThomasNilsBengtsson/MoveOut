require('dotenv').config();

module.exports = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: 25060,
  ssl: {
    ca: "./certs/ca-certificate.crt"
  },
  connectTimeout: 20000
};