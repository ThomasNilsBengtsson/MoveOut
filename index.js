/* 
Setup for express server
*/
require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const indexRoutes = require("./routes/indexRoutes.js");
const session = require('express-session');
require('./inactiveUsers/inactiveUsers.js');
require('./admin/admin.js');

// Log message for starting the server
console.log('Attempting to start the server...');

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({extended: true}));


app.use(session({
  secret: 'moveout',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  res.locals.showNavbar = true;
  res.locals.is_admin = req.session.is_admin || false; 
  next();
});



app.use(indexRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});