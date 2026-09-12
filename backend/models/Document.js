const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bidder",
            required: true
        },

        documentType: {
            type: String,
            enum: [
                "UDYAM",
                "GST",
                "PAN",
                "ITR",
                "EPFO",
                "ESIC",
                "STARTUP_INDIA",
                "NSIC",
                "OEM_AUTHORIZATION",
                "MAKE_IN_INDIA",
                "DIGILOCKER",
                "OTHER"
            ],
            required: true
        },

        fileName: {
            type: String,
            required: true
        },

        filePath: {
            type: String,
            required: true
        },

        fileType: {
            type: String,
            default: ""
        },

        ocrText: {
            type: String,
            default: ""
        },

        extractedData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        verificationStatus: {
            type: String,
            enum: [
                "PENDING",
                "VERIFIED",
                "MISMATCH",
                "INVALID",
                "EXPIRED",
                "REJECTED"
            ],
            default: "PENDING"
        },

        uploadedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Document", documentSchema);