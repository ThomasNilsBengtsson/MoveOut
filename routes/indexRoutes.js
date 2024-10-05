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


/* 
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
   
    let userInput= {
        textContent: null,
        image:null,
        audio: null
    }

    const formType = req.body.formType;

    if(formType === "createLabel")
    {

        const text = "Kitchen items";
        const imagePath = 'public/images/label-image.png';
        const newImage = await qrFunctions.overlayQRCodeOnImage(text, imagePath);
        
        const publicImagePath = '/' + path.relative('public', newImage).replace(/\\/g, '/');
        data.imageUrl = publicImagePath;
    }

    else if(formType === "addText")
    {

    userInput.textContent = req.body.f_text_content;
    console.log("userInput",userInput);
    await moveout.insert_info_qr_code(req.session.email, userInput);
    }       
    
    res.render('pages/home.ejs', data);
}); */


router.get("/home", isAuthenticated, (req, res) => {
    res.render("pages/home.ejs", {
        title: "Home",
        email: req.session.email,
    });
});




router.get("/create-label", isAuthenticated, (req, res) => {
    let data = {
        title: "Create label",
        email: req.session.email,
        imageUrl: null
    };
    res.render("pages/create-label.ejs", data);
});


router.post("/create-label", isAuthenticated, async (req, res) => {
    let data = {
        title: "Create label",
        email: req.session.email
    };


    const email = req.session.email;
    const textContent = req.body.textContent || null; // Initial text content, if any.

    // Insert label into the database and get labelId.
    const labelId = await moveout.insert_info_qr_code(email, textContent);


    const imagePath = 'public/images/label-image.png';
    const qrContent = `https://e241-2a02-1406-3b-8780-7a2f-dc2a-87d4-ba2e.ngrok-free.app/label/${labelId}`; // Content embedded in the QR code.
    const qrImagePath = await qrFunctions.overlayQRCodeOnImage(qrContent, imagePath );
    const publicImagePath = '/' + path.relative('public', qrImagePath).replace(/\\/g, '/');

    data.imageUrl = publicImagePath;
    // Store QR code image path and labelId in the database (if necessary).

    // Redirect to the label page.
    //res.redirect(`/label/${labelId}`);
    res.render("pages/create-label.ejs", data);
});


router.get("/label/:labelId", async (req, res) => {
    const labelId = req.params.labelId;

    // Retrieve label details from the database
    const label = await moveout.get_label_by_id(labelId);

    if (!label) {
        return res.status(404).send('Label not found.');
    }

    res.render("pages/label.ejs", {
        title: "Label Details",
        label: label, // Pass the label data to the template
    });
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
