const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

const createDemoUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const existingUser = await User.findOne({
            email: "officer@gem-demo.gov.in"
        });

        if (existingUser) {
            console.log("Demo user already exists");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(
            "GemDemo@123",
            10
        );

        await User.create({
            name: "Demo Procurement Officer",
            email: "officer@gem-demo.gov.in",
            password: hashedPassword,
            role: "PROCUREMENT_OFFICER"
        });

        console.log("Demo user created successfully");

        process.exit(0);
    } catch (error) {
        console.error("Error creating demo user:", error.message);
        process.exit(1);
    }
};

createDemoUser();