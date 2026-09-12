const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        bidder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bidder"
        },

        tender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tender"
        },

        action: {
            type: String,
            required: true,
            trim: true
        },

        entityType: {
            type: String,
            enum: [
                "USER",
                "TENDER",
                "BIDDER",
                "DOCUMENT",
                "COMPLIANCE_CHECK",
                "COMPLIANCE_SCORE",
                "DECISION"
            ],
            required: true
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId
        },

        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        ipAddress: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);