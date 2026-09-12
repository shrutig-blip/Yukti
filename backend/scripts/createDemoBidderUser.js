const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");

async function createDemoBidderUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");

        const existingUser = await User.findOne({
            email: "demo.bidder@gem.com"
        });

        if (existingUser) {
            console.log("Demo bidder user already exists");
            console.log("User ID:", existingUser._id);
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(
            "DemoBidder@123",
            10
        );

        const user = await User.create({
            name: "Demo Bidder",
            email: "demo.bidder@gem.com",
            password: hashedPassword,
            role: "BIDDER"
        });

        console.log("Demo bidder user created successfully");
        console.log("User ID:", user._id);
        console.log("Email:", user.email);

        process.exit(0);
    } catch (error) {
        console.error("Error creating demo bidder user:", error);
        process.exit(1);
    }
}

createDemoBidderUser();