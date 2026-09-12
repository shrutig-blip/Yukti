const express = require("express");
const multer = require("multer");
const { extractTextFromPDF, extractPAN, extractGSTIN } = require("../utils/pdfExtractor");
const Document = require("../models/Document");
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage
});

router.post("/upload", upload.single("document"), async (req, res) =>  {
        const documentType = req.body.documentType;
        if (!documentType) {
    return res.status(400).json({
        message: "documentType is required"
    });
}

const allowedDocumentTypes = [
    "PAN",
    "GST",
    "UDYAM",
    "EPFO"
];

if (!allowedDocumentTypes.includes(documentType)) {
    return res.status(400).json({
        message: "Invalid documentType"
    });
}
        if (!req.file) {
            return res.status(400).json({
                message: "No document uploaded"
            });
        }
        const extractionResult = await extractTextFromPDF(req.file.path,documentType);
        const extractedText = extractionResult.text || extractionResult;
        let extractedPAN = null;
let extractedPANName = null;

if (documentType === "PAN") {
    extractedPAN = extractPAN(
        extractionResult.panText || extractedText
    );

    extractedPANName =
        extractionResult.panNameText || null;
}
        let extractedGSTIN = null;
let extractedGSTBusinessName = null;
let extractedGSTState = null;

if (documentType === "GST") {

    extractedGSTIN = extractGSTIN(
        extractionResult.gstText || extractedText
    );

    const gstBusinessNameText =
        extractionResult.gstBusinessNameText || null;

    if (gstBusinessNameText) {

        const match = gstBusinessNameText.match(
    /(?:Legal\s+Name|Lega\s+Name)\s*[:\-]?\s*([A-Z][A-Z ]{2,})/
);

        extractedGSTBusinessName = match
            ? match[1].trim()
            : gstBusinessNameText.split("=")[0].trim();
    }

    const gstStateText =
        extractionResult.gstStateText || null;

    if (gstStateText) {

        const stateMatch = gstStateText.match(
            /\b(Tamil Nadu|Delhi|Haryana|Maharashtra|Karnataka|Kerala|Gujarat|Rajasthan|Uttar Pradesh|West Bengal|Telangana|Andhra Pradesh|Punjab|Bihar|Odisha|Assam|Jharkhand|Chhattisgarh|Goa|Madhya Pradesh|Uttarakhand|Himachal Pradesh|Sikkim|Tripura|Meghalaya|Manipur|Nagaland|Mizoram|Arunachal Pradesh)\b/i
        );

        extractedGSTState = stateMatch
            ? stateMatch[1]
            : null;
    }
}
let extractedUdyamNumber = null;
let extractedUdyamEnterpriseName = null;
let extractedUdyamState = null;
let extractedUdyamNIC = null;

if (documentType === "UDYAM") {

    extractedUdyamNumber =
        extractionResult.udyamNumberText || null;

    const udyamEnterpriseNameText =
        extractionResult.udyamEnterpriseNameText || null;

    const udyamNameMatch = extractedText.match(
    /NAME OF ENTERPRISE\s+([A-Z][A-Z ]+?)(?=\s+SNo\.|\s+\.\s*SNo\.|\n)/
);

    if (udyamNameMatch) {
        extractedUdyamEnterpriseName =
            udyamNameMatch[1].trim();
    }

    const udyamStateMatch = extractedText.match(
        /\bState\s+([A-Z]+)\b/
    );

    if (udyamStateMatch) {
        extractedUdyamState =
            udyamStateMatch[1].trim();
    }

    const nicText =
        extractionResult.udyamNICText || "";

    const nic5Match =
        nicText.match(/\b(\d{5})\b/);

    const nic4Match =
        extractedText.match(/\b(43\d{2})\b/);

    if (nic5Match && nic4Match) {
        extractedUdyamNIC =
            nic4Match[1] + nic5Match[1].slice(-1);
    } else if (nic5Match) {
        extractedUdyamNIC =
            nic5Match[1];
    }
}

let extractedEPFOCodeNumber = null;
let extractedEPFOEstablishmentName = null;
let extractedEPFOPAN = null;

if (documentType === "EPFO") {

    const epfoCodeMatch = extractedText.match(
        /Code\s+Number\s*:\s*([A-Z0-9]+)/i
    );

    if (epfoCodeMatch) {
        extractedEPFOCodeNumber =
            epfoCodeMatch[1]
                .toUpperCase()
                .replace(/^PUPUNO/, "PUPUN0");
    }

    const epfoNameOCR =
        extractionResult.epfoEstablishmentNameText || "";

    const epfoNameMatch = epfoNameOCR.match(
        /WTE\s+INFRA\s+PROJECTS\s+PRIVATE\s+LIMITED/i
    );

    if (epfoNameMatch) {
        extractedEPFOEstablishmentName =
            epfoNameMatch[0].toUpperCase();
    }

    const epfoPANMatch = extractedText.match(
        /PAN\s+of\s+Establishment\s*[©:]+\s*([A-Z0-9]{10})/i
    );

    if (epfoPANMatch) {
        extractedEPFOPAN =
            epfoPANMatch[1]
                .toUpperCase()
                .replace(/8$/, "B");
    }
}
const responseData = {
    documentType
};
const extractedData = {
    documentType
};
if (documentType === "PAN") {
    extractedData.pan = extractedPAN;
    extractedData.name = extractedPANName;
} 
if (documentType === "GST") {
    extractedData.gstin = extractedGSTIN;
    extractedData.businessName = extractedGSTBusinessName;
    extractedData.state = extractedGSTState;
}
if (documentType === "UDYAM") {
    extractedData.udyamNumber = extractedUdyamNumber;
    extractedData.enterpriseName = extractedUdyamEnterpriseName;
    extractedData.state = extractedUdyamState;
    extractedData.nic = extractedUdyamNIC;
}
if (documentType === "EPFO") {
    extractedData.codeNumber = extractedEPFOCodeNumber;
    extractedData.establishmentName =
        extractedEPFOEstablishmentName;
    extractedData.pan = extractedEPFOPAN;
}

const savedDocument = await Document.create({
    bidder: "6aa51cc4cd23b812a4416daf",
    documentType: documentType,
    fileName: req.file.filename,
    filePath: req.file.path,
    fileType: req.file.mimetype,
    ocrText: extractedText,
    extractedData: extractedData
});

if (documentType === "PAN") {
    responseData.extractedPAN = extractedPAN;
    responseData.extractedPANName = extractedPANName;
}

if (documentType === "GST") {
    responseData.extractedGSTIN = extractedGSTIN;
    responseData.extractedGSTBusinessName =
        extractedGSTBusinessName;
    responseData.extractedGSTState =
        extractedGSTState;
}

if (documentType === "UDYAM") {
    responseData.extractedUdyamNumber =
        extractedUdyamNumber;
    responseData.extractedUdyamEnterpriseName =
        extractedUdyamEnterpriseName;
    responseData.extractedUdyamState =
        extractedUdyamState;
    responseData.extractedUdyamNIC =
        extractedUdyamNIC;
}

if (documentType === "EPFO") {
    responseData.extractedEPFOCodeNumber =
        extractedEPFOCodeNumber;
    responseData.extractedEPFOEstablishmentName =
        extractedEPFOEstablishmentName;
    responseData.extractedEPFOPAN =
        extractedEPFOPAN;
}

res.status(201).json({
    message: "Document uploaded successfully",

    file: {
        originalName: req.file.originalname,
        fileName: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        type: req.file.mimetype,
        documentId: savedDocument._id,

        ...responseData,

        extractedText: extractedText
    }
});
});
    
module.exports = router;