const express = require("express");
const router = express.Router();
const moveout = require("../src/moveout.js");
//console.log("moveout:", moveout);
const verify = require("../verifiers/verifiers.js");
//console.log('verify object:', verify);
const validator = require('validator');
const verifiers = require("../verifiers/verifiers.js");
const emailFunctions = require("../utils/email.js");
const isAuthenticated = require('../utils/auth.js');
const qrFunctions = require("../utils/generateQR.js");
const path = require('path');


/* router.get("/", (req, res) => {
    let data = {};

    data.title = "Välkommen | Eshop";
    res.render("pages/login.ejs", data);
}); */

router.get("/login", (req, res) => {
    let data = {
        error: {},
        title: "Login"
    };

    //data.title = "Välkommen | Eshop";
    res.render("pages/login.ejs", data);
});

router.post("/login", async (req, res) => {
    let data = {
        error: {},
        title: "Login"
    };
    //data.title = "Login";

    const email = req.body.f_email;
    const password = req.body.f_user_password;


    
    const result = await moveout.userLogIn(email, password);
    const verifiedEmail = await moveout.isEmailVerified(email);
    if(result.success && verifiedEmail.success)
    {
        req.session.email = email;
        res.redirect("/home");
    }
    else
    {
        data.error.invalid = result.message;
        res.render("pages/login.ejs", data);
    }

});


router.get("/register", (req, res) => {
    const data = {
        title: 'Register',
        errors: {},
        formData: {}
    };
    res.render("pages/register.ejs", data);
});


//regrestring account submit
router.post("/register", async (req, res) => {

    const email = req.body.f_email;
    const password = req.body.f_user_password;

    const errorEmail = verify.validateEmail(email);
    const errorPassword = verify.validatePassword(password);
    const isEmailreg = await moveout.isEmailReg(email);
    //const ifEmailAlreadyReg = verify.ifEmailReg(email);

    const verificationToken = verify.verificationTokenCreation();

    if(Object.keys(errorEmail).length > 0)
    {
        const data = {
            title: 'Register',
            errors: errorEmail, 
            formData: req.body
        };
        res.render("pages/register.ejs", data);
    }
    else if(Object.keys(errorPassword).length > 0)
    {
        const data = {
            title: 'Register',
            errors: errorPassword, 
            formData: req.body
        };
        res.render("pages/register.ejs", data);
    }
    else if(Object.keys(isEmailreg).length > 0)
    {
        const data = {
            title: 'Register',
            errors: isEmailreg,
            formData: req.body
        };
        res.render("pages/register.ejs", data);
    }
    else
    {
            await moveout.registerUser(req.body, verificationToken);
            res.redirect("/login");

            //email verification
            const verificationLink = `${process.env.BASE_URL}/email-verified?token=${verificationToken}&email=${encodeURIComponent(email)}`;
            await emailFunctions.sendVerificationEmail(email, verificationLink);
    }
 
});


router.get("/email-verified", async (req, res) => {
    let data = {};
    data.title = "Verified";

    const verificationToken = req.query.token;
    if(!verificationToken){
        console.log("no token");
    };
    await moveout.userVerificationByToken(verificationToken);
    

    const email = req.query.email;
    await emailFunctions.accountCreationConfirmation(email);
    res.render("pages/email-verified.ejs", data);
});


router.post("/email-verified", async (req, res) => {
  
    res.redirect("/login");
});



router.get("/home", isAuthenticated, (req, res) => {
    let data = {
        title: "Home",
        email: req.session.email,
        imageUrl: null
    };
    res.render("pages/home.ejs", data);
});


router.post("/home", isAuthenticated, async (req, res) => {
    let data = {
        title: "Home",
        email: req.session.email,
    };
    //res.render("pages/home.ejs", data);
    const text = "Kitchen items";
    const imagePath = 'public/images/label-image.png';
    const newImage = await qrFunctions.overlayQRCodeOnImage(text, imagePath);
    console.log("new image path", newImage);
    const publicImagePath = '/' + path.relative('public', newImage).replace(/\\/g, '/');
    console.log("public image path", publicImagePath);
    data.imageUrl = publicImagePath;
    //console.log("check check", data.imageUrl);
    //console.log("New label");
    res.render('pages/home.ejs', data);
});


router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            // Handle the error accordingly
        }
        res.redirect('/login');
    });
});




module.exports = router;
