const moveout = require("../src/moveout.js");
async function loginPost(req, res) {
    let data = {
        error: {},
        title: "Login"
    };

    const email = req.body.f_email;
    const password = req.body.f_user_password;
    
/*     const userExists = await moveout.isUserExists(email);
    if (!userExists.success) {
        data.error.invalid = userExists.message; // This will be "User not found"
        return res.render("pages/login.ejs", data);
    } */


    // Step 2: Validate the user's credentials
    const result = await moveout.userLogIn(email, password);
    if (!result.success) {
        data.error.invalid = "Invalid email or password.";
        return res.render("pages/login.ejs", data);
    }

    // Step 3: Check if the email is verified
    const verifiedEmail = await moveout.isEmailVerified(email);
    if (!verifiedEmail.success) {
        data.error.invalid = "Please verify your email before logging in.";
        return res.render("pages/login.ejs", data);
    }

    // Step 4: Successful login - set session and redirect to home page
    req.session.email = email;
    return res.redirect("/home");
}

module.exports = { loginPost };