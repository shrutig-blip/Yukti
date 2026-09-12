const mongoose = require("mongoose");

const complianceCheckSchema = new mongoose.Schema(
    {
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bidder",
            required: true
        },

        document: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Document"
        },

        checkType: {
            type: String,
            enum: [
                "UDYAM",
                "GST",
                "GST_RETURN",
                "PAN",
                "INCOME_TAX",
                "MAKE_IN_INDIA",
                "EPFO",
                "ESIC",
                "STARTUP_INDIA",
                "NSIC",
                "OEM_AUTHORIZATION",
                "DIGILOCKER",
                "BLACKLIST",
                "TENDER_SPECIFIC"
            ],
            required: true
        },

        documentData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        portalData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        result: {
            type: String,
            enum: [
                "MATCH",
                "MISMATCH",
                "MISSING",
                "EXPIRED",
                "INVALID",
                "NON_COMPLIANT",
                "VERIFIED"
            ],
            required: true
        },

        message: {
            type: String,
            default: ""
        },

        severity: {
            type: String,
            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ],
            default: "LOW"
        },

        checkedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ComplianceCheck",
    complianceCheckSchema
);