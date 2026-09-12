const mongoose = require("mongoose");
require("dotenv").config();

const Bidder = require("../models/Bidder");

async function createDemoBidder() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");

        const existingBidder = await Bidder.findOne({
            companyName: "DEMO ELECTRICAL SOLUTIONS"
        });

        if (existingBidder) {
            console.log("Demo bidder already exists");
            console.log("Bidder MongoDB ID:", existingBidder._id);
            process.exit(0);
        }

        const bidder = await Bidder.create({
            companyName: "DEMO ELECTRICAL SOLUTIONS",
            legalName: "DEMO ELECTRICAL SOLUTIONS PRIVATE LIMITED",
            gstin: "33AOEPP7107F2Z5",
            pan: "ABCDE1234F",
            udyamNumber: "UDYAM-GJ-24-0115917",
            tender: "6aa51bf700c725e78bb7db21",
            verificationStatus: "PENDING",
            finalDecision: "PENDING"
        });

        console.log("Demo bidder created successfully");
        console.log("Bidder MongoDB ID:", bidder._id);
        console.log("Company:", bidder.companyName);

        process.exit(0);
    } catch (error) {
        console.error("Error creating demo bidder:", error);
        process.exit(1);
    }
}

createDemoBidder();