const mongoose = require("mongoose");
require("dotenv").config();

const Tender = require("../models/Tender");

async function createDemoTender() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");

        const existingTender = await Tender.findOne({
            tenderId: "GEM-DEMO-001"
        });

        if (existingTender) {
            console.log("Demo tender already exists");
            console.log("Tender ID:", existingTender._id);
            process.exit(0);
        }

        const tender = await Tender.create({
            tenderId: "GEM-DEMO-001",
            title: "Demo GeM Procurement Tender",
            department: "Demo Procurement Department",
            category: "Electrical Equipment",
            description:
                "Demo tender for AI-powered bid compliance verification.",
            requirements: [
                {
                    name: "PAN",
                    required: true,
                    weight: 20
                },
                {
                    name: "GST",
                    required: true,
                    weight: 25
                },
                {
                    name: "UDYAM",
                    required: true,
                    weight: 20
                },
                {
                    name: "EPFO",
                    required: true,
                    weight: 20
                },
                {
                    name: "OEM",
                    required: false,
                    weight: 15
                }
            ],
            status: "OPEN",
            deadline: new Date("2026-12-31")
        });

        console.log("Demo tender created successfully");
        console.log("Tender MongoDB ID:", tender._id);
        console.log("Tender ID:", tender.tenderId);

        process.exit(0);
    } catch (error) {
        console.error("Error creating demo tender:", error);
        process.exit(1);
    }
}

createDemoTender();