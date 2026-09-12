const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");

async function linkDemoUserBidder() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");

        const user = await User.findOne({
            role: "BIDDER"
        });

        if (!user) {
            console.log("No BIDDER user found.");
            process.exit(1);
        }

        user.bidder = "6aa51cc4cd23b812a4416daf";

        await user.save();

        console.log("User linked to demo bidder successfully");
        console.log("User ID:", user._id);
        console.log("Bidder ID:", user.bidder);

        process.exit(0);
    } catch (error) {
        console.error("Error linking user and bidder:", error);
        process.exit(1);
    }
}

linkDemoUserBidder();