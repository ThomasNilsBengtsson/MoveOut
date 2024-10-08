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
const multer = require('multer');
const fs = require('fs');


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        if(file.fieldname === "imageContent")
        {
            cb(null, 'public/uploads/images'); 
        } 
        else if(file.fieldname === "audioContent")
        {
            cb(null, 'public/uploads/audio');
        }
        else {
            cb(new Error('Invalid field name.'), false);
        }
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (file.fieldname === 'imageContent' && file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else if (file.fieldname === 'audioContent' && file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type or field name.'), false);
        }
    }
});




router.get("/login", (req, res) => {
    let data = {
        error: {},
        title: "Login"
    };


    res.render("pages/login.ejs", data);
});

router.post("/login", async (req, res) => {
    let data = {
        error: {},
        title: "Login"
    };

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



router.post("/register", async (req, res) => {

    const email = req.body.f_email;
    const password = req.body.f_user_password;

    const errorEmail = verify.validateEmail(email);
    const errorPassword = verify.validatePassword(password);
    const isEmailreg = await moveout.isEmailReg(email);
   
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
});


router.get("/home", isAuthenticated, (req, res) => {

    const directoryPath = path.join(__dirname, '../public/images');
    
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Unable to scan directory:', err);
            return res.status(500).send('Unable to display images.');
        }

        // Filter image files (assuming images are in .png, .jpg, etc.)
        const imageFiles = files.filter(file => {
            return file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg');
        });

        res.render('pages/home.ejs', {
            title: 'Home',
            email: req.session.email,
            images: imageFiles
        });
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


router.post('/create-label', isAuthenticated, upload.fields([
    { name: 'imageContent', maxCount: 1 },
    { name: 'audioContent', maxCount: 1 }
]), async (req, res) => {

    let data = {
        title: "Create label",
        email: req.session.email
    };

    console.log("creating label");
    const email = req.session.email;
    const contentType = req.body.contentType; 

    let textContent = null;
    let userImagePath = null;
    let userAudioPath = null;

    if(contentType === "text"){
        textContent = req.body.textContent;
    } 
    else if (contentType === "image"){
        userImagePath = "/uploads/images/" + req.files.imageContent[0].filename;
    }
    else if(contentType === "audio"){
        userAudioPath = "/uploads/audio/" + req.files.audioContent[0].filename;
    }

    const labelId = await moveout.insert_info_qr_code(email, textContent, userImagePath, userAudioPath);


    const imagePath = 'public/images/label-image.png';
    const qrContent = `https://04eb-2001-6b0-2a-c280-bdc1-f512-44f2-213.ngrok-free.app/label/${labelId}?email=${encodeURIComponent(email)}`; 
    const qrImagePath = await qrFunctions.overlayQRCodeOnImage(qrContent, imagePath );
    const publicImagePath = '/' + path.relative('public', qrImagePath).replace(/\\/g, '/');

    data.imageUrl = publicImagePath;

    res.render("pages/create-label.ejs", data);
});


router.get("/label/:labelId", async (req, res) => {
    const labelId = req.params.labelId;
    const email = req.query.email;

    const label = await moveout.get_label_by_id(labelId);


    if(!label.is_user_verified)
    {
        let verficationCode = label.verification_code;
        if(!verficationCode)
        {
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            await moveout.insert_verification_code_label(labelId, verificationCode);
            await emailFunctions.sendVerificationCodeLabel(email, verificationCode);
            
        }
        return res.redirect(`/verification-code-label?labelId=${labelId}&email=${encodeURIComponent(email)}`);
    }
    


    return res.render("pages/label.ejs", {
        title: "Label Details",
        label: label
    }); 
  
});


router.get("/verification-code-label", async (req, res) => {
    console.log("label verification");
    const labelId = req.query.labelId;
    const email = req.query.email;

    console.log("get verifcation doe email: ", email);
    if (!labelId || !email) {
        return res.status(400).send('Label ID and email are required.');
    }

   
    res.render("pages/verification-code-label.ejs", {
        title: "Verify Label",
        labelId: labelId,
        email: email
    });
});


router.post("/verification-code-label", async (req, res) => {

    const labelId = req.body.labelId;
    const email = req.body.email;
    const verificationCode = req.body.verificationCode;
    const isValid = await moveout.is_user_label_code_verified(labelId, verificationCode);

    if (isValid) {
        await moveout.markLabelAsVerified(labelId);
        res.redirect(`/label/${labelId}?email=${encodeURIComponent(email)}`);
    } else {
        res.render("pages/verification-code-label.ejs", {
            title: "Verify Label",
            labelId: labelId,
            email: email,
            error: "Invalid verification code. Please try again."
        });
    }

});



router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);

        }
        res.redirect('/login');
    });
});




module.exports = router;
