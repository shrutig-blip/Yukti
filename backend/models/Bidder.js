const mongoose = require("mongoose");

const bidderSchema = new mongoose.Schema(
    {
        companyName: {
            type: String,
            required: true,
            trim: true
        },

        legalName: {
            type: String,
            trim: true
        },

        gstin: {
            type: String,
            trim: true,
            uppercase: true
        },

        pan: {
            type: String,
            trim: true,
            uppercase: true
        },

        udyamNumber: {
            type: String,
            trim: true,
            uppercase: true
        },

        epfoStatus: {
            type: String,
            default: "PENDING"
        },

        esicStatus: {
            type: String,
            default: "PENDING"
        },

        startupIndiaStatus: {
            type: String,
            default: "NOT_VERIFIED"
        },

        nsicStatus: {
            type: String,
            default: "NOT_VERIFIED"
        },

        tender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tender",
            required: true
        },

        verificationStatus: {
            type: String,
            enum: [
                "PENDING",
                "IN_PROGRESS",
                "COMPLETED",
                "FAILED"
            ],
            default: "PENDING"
        },

        finalDecision: {
            type: String,
            enum: [
                "PENDING",
                "QUALIFIED",
                "DISQUALIFIED",
                "CLARIFICATION_REQUESTED"
            ],
            default: "PENDING"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Bidder", bidderSchema);