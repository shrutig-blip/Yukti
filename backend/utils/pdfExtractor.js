const fs = require("fs");
const { PDFParse } = require("pdf-parse");
const { extractTextFromImage, extractPANFromImage,extractPANNameFromImage,extractGSTINFromImage ,extractGSTBusinessNameFromImage,extractGSTStateFromImage,extractGSTValidityDatesFromImage,extractUdyamNumberFromImage,
extractUdyamEnterpriseNameFromImage,extractUdyamStateFromImage,
extractUdyamNICFromImage,extractEPFOCodeNumberFromImage,extractEPFOEstablishmentNameFromImage,
extractEPFOPANFromImage} = require("./ocrExtractor");
const pdfPoppler = require("pdf-poppler");
async function extractTextFromPDF(filePath, documentType) {
    const data = new Uint8Array(fs.readFileSync(filePath));

    const parser = new PDFParse({ data });

    const result = await parser.getText();

    await parser.destroy();

    let text = result.text.trim();

    if (text.length > 20) {
        return text;
    }

    console.log("Little or no text found. Starting OCR...");

const outputDir = "./uploads/ocr";
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPrefix = `ocr-${Date.now()}`;

await pdfPoppler.convert(filePath, {
    format: "png",
    out_dir: outputDir,
    out_prefix: outputPrefix,
    page: null
});

const imageFiles = fs.readdirSync(outputDir)
    .filter(file => file.startsWith(outputPrefix) && file.endsWith(".png"))
    .sort();

let ocrText = "";
let panOCRText = "";
let panNameOCRText = "";
let gstOCRText = "";
let gstBusinessNameOCRText = "";
let gstStateOCRText = "";
let gstValidityDatesOCRText = "";
let udyamNumberOCRText = "";
let udyamEnterpriseNameOCRText = "";
let udyamStateOCRText = "";
let udyamNICOCRText = "";
let epfoCodeNumberOCRText = "";
let epfoEstablishmentNameOCRText = "";
let epfoPANOCRText = "";
for (const imageFile of imageFiles) {
    const imagePath = `${outputDir}/${imageFile}`;

    const pageText = await extractTextFromImage(imagePath);

    if (documentType === "PAN") {
    const panText = await extractPANFromImage(imagePath);
    console.log("PAN-specific OCR:", panText);
    panOCRText = panText;

    const panNameText = await extractPANNameFromImage(imagePath);
    console.log("PAN name OCR:", panNameText);

    const nameMatch = panNameText.match(
        /Name\s+([A-Z][A-Z ]{2,})/
    );

    panNameOCRText = nameMatch
        ? nameMatch[1].trim()
        : null;
}

    if (documentType === "GST") {
    const gstText = await extractGSTINFromImage(imagePath);
    console.log("GSTIN-specific OCR:", gstText);
    gstOCRText = gstText;

    const gstBusinessNameText =
        await extractGSTBusinessNameFromImage(imagePath);

    console.log(
        "GST business name OCR:",
        gstBusinessNameText
    );

    gstBusinessNameOCRText = gstBusinessNameText;

    const gstStateText =
        await extractGSTStateFromImage(imagePath);

    console.log("GST state OCR:", gstStateText);
    gstStateOCRText = gstStateText;

    const gstValidityDatesText =
        await extractGSTValidityDatesFromImage(imagePath);

    console.log(
        "GST Validity dates OCR:",
        gstValidityDatesText
    );

    gstValidityDatesOCRText = gstValidityDatesText;
}

    if (documentType === "UDYAM") {
    const udyamNumberText =
        await extractUdyamNumberFromImage(imagePath);

    console.log("Udyam number OCR:", udyamNumberText);
    udyamNumberOCRText = udyamNumberText;

    const udyamEnterpriseNameText =
        await extractUdyamEnterpriseNameFromImage(imagePath);

    console.log(
        "Udyam enterprise name OCR:",
        udyamEnterpriseNameText
    );

    udyamEnterpriseNameOCRText =
        udyamEnterpriseNameText;

    const udyamStateText =
        await extractUdyamStateFromImage(imagePath);

    console.log("Udyam state OCR:", udyamStateText);
    udyamStateOCRText = udyamStateText;

    const udyamNICText =
        await extractUdyamNICFromImage(imagePath);

    console.log("Udyam NIC OCR:", udyamNICText);
    udyamNICOCRText = udyamNICText;
}

if (documentType === "EPFO") {
    const epfoCodeNumberText =
        await extractEPFOCodeNumberFromImage(imagePath);

    console.log(
        "EPFO code number OCR:",
        epfoCodeNumberText
    );

    epfoCodeNumberOCRText =
        epfoCodeNumberText;

    const epfoEstablishmentNameText =
        await extractEPFOEstablishmentNameFromImage(imagePath);

    console.log(
        "EPFO establishment name OCR:",
        epfoEstablishmentNameText
    );

    epfoEstablishmentNameOCRText =
        epfoEstablishmentNameText;

    const epfoPANText =
        await extractEPFOPANFromImage(imagePath);

    console.log("EPFO PAN OCR:", epfoPANText);
    epfoPANOCRText = epfoPANText;
}
    ocrText += pageText + "\n";

    fs.unlinkSync(imagePath);
}

return {
    text: ocrText ? ocrText.trim() : "",
    panText: panOCRText ? panOCRText.trim() : "",
    panNameText: panNameOCRText ? panNameOCRText.trim() : "",
    gstText: gstOCRText ? gstOCRText.trim() : "",
    gstBusinessNameText: gstBusinessNameOCRText
        ? gstBusinessNameOCRText.trim()
        : "",
    gstStateText: gstStateOCRText
        ? gstStateOCRText.trim()
        : "",
    gstValidityDatesText: gstValidityDatesOCRText
        ? gstValidityDatesOCRText.trim()
        : "",
    udyamNumberText: udyamNumberOCRText
    ? udyamNumberOCRText.trim()
    : "",

udyamEnterpriseNameText: udyamEnterpriseNameOCRText
    ? udyamEnterpriseNameOCRText.trim()
    : "",

udyamStateText: udyamStateOCRText
    ? udyamStateOCRText.trim()
    : "",

udyamNICText: udyamNICOCRText
    ? udyamNICOCRText.trim()
    : "",
    epfoCodeNumberText: epfoCodeNumberOCRText
    ? epfoCodeNumberOCRText.trim()
    : "",

epfoEstablishmentNameText: epfoEstablishmentNameOCRText
    ? epfoEstablishmentNameOCRText.trim()
    : "",

epfoPANText: epfoPANOCRText
    ? epfoPANOCRText.trim()
    : ""
};
}
function extractPAN(text) {
    const cleanedText = text
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]/;
    const match = cleanedText.match(panRegex);

    return match ? match[0] : null;
}
function extractGSTIN(text) {
    const cleanedText = text
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

    const gstinRegex = /\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9][Z]\d/;
    const match = cleanedText.match(gstinRegex);

    return match ? match[0] : null;
}
module.exports = {
    extractTextFromPDF,
    extractPAN,
    extractGSTIN
};
