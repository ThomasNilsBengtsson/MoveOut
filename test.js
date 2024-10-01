const { registerUser } = require('./src/moveout');

async function testRegistration() {
    try {
        await registerUser({
            f_email: "test@example.com",
            f_user_password: "password123"
        });
        console.log("User registered successfully!");
    } catch (error) {
        console.error("Error registering user:", error);
    }
}

testRegistration();