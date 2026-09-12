const mongoose = require("mongoose");

const tenderSchema = new mongoose.Schema(
    {
        tenderId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        department: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        requirements: [
            {
                name: {
                    type: String,
                    required: true
                },

                required: {
                    type: Boolean,
                    default: true
                },

                weight: {
                    type: Number,
                    default: 0
                }
            }
        ],

        status: {
            type: String,
            enum: [
                "DRAFT",
                "OPEN",
                "UNDER_EVALUATION",
                "CLOSED"
            ],
            default: "DRAFT"
        },

        deadline: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Tender", tenderSchema);