const mongoose = require("mongoose");

const complianceScoreSchema = new mongoose.Schema(
    {
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bidder",
            required: true,
            unique: true
        },

        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },

        riskLevel: {
            type: String,
            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ],
            required: true
        },

        breakdown: {
            udyam: {
                type: Number,
                default: 0
            },

            gst: {
                type: Number,
                default: 0
            },

            panIncomeTax: {
                type: Number,
                default: 0
            },

            epfoEsic: {
                type: Number,
                default: 0
            },

            makeInIndia: {
                type: Number,
                default: 0
            },

            startupNsic: {
                type: Number,
                default: 0
            },

            oemAuthorization: {
                type: Number,
                default: 0
            },

            documentVerification: {
                type: Number,
                default: 0
            },

            blacklist: {
                type: Number,
                default: 0
            }
        },

        aiRecommendation: {
            type: String,
            default: ""
        },

        generatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "ComplianceScore",
    complianceScoreSchema
);