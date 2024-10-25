const moveout = require("../src/moveout.js");
async function loginPost(req, res) {
    let data = {
        error: {},
        title: "Login"
    };

    const email = req.body.f_email;
    const password = req.body.f_user_password;
    
    const result = await moveout.userLogIn(email, password);
    if (!result.success) {
        data.error.invalid = "Invalid email or password.";
        return res.render("pages/login.ejs", data);
    }

    const verifiedEmail = await moveout.isEmailVerified(email);
    if (!verifiedEmail.success) {
        data.error.invalid = "Please verify your email before logging in.";
        return res.render("pages/login.ejs", data);
    }

    const activatedAccount = await moveout.accountDeactivationStatus(email);
    console.log("activated account: ", activatedAccount);
    if (activatedAccount === false )
    {
        console.log("if statment deactiavtedaccount : hello");
        data.error.invalid = 'Account it decactivated. Contact support to activate the account';
        return res.render('pages/login.ejs', data);
    }

    req.session.email = email;  
    await moveout.updateLastLogin(req.session.email);
    const isAdmin = await moveout.isAdmin(email); 
    req.session.is_admin = isAdmin;
    return res.redirect("/home");
}

module.exports = { loginPost };