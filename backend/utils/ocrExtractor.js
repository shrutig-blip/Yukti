const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const fs = require("fs");
async function extractTextFromImage(imagePath) {
    const result = await Tesseract.recognize(
        imagePath,
        "eng",
        {
            logger: (info) => {
                if (info.status === "recognizing text") {
                    console.log(`OCR progress: ${Math.round(info.progress * 100)}%`);
                }
            }
        }
    );

    return result.data.text;
}
async function extractPANFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/pan-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.20);
    const cropTop = Math.round(imageHeight * 0.35);
    const cropWidth = Math.round(imageWidth * 0.55);
    const cropHeight = Math.round(imageHeight * 0.22);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2200
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text.trim();
}
async function extractPANNameFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/pan-name-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.02);
    const cropTop = Math.round(imageHeight * 0.52);
    const cropWidth = Math.round(imageWidth * 0.48);
    const cropHeight = Math.round(imageHeight * 0.12);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2200
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist:
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ ",
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}
async function extractGSTINFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/gstin-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.07);
    const cropTop = Math.round(imageHeight * 0.23);
    const cropWidth = Math.round(imageWidth * 0.50);
    const cropHeight = Math.round(imageHeight * 0.10);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2400
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text.trim();
}
async function extractGSTBusinessNameFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/gst-name-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.25);
    const cropTop = Math.round(imageHeight * 0.30);
    const cropWidth = Math.round(imageWidth * 0.60);
    const cropHeight = Math.round(imageHeight * 0.10);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2400
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_pageseg_mode: "6"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}
async function extractGSTStateFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/gst-state-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.05);
    const cropTop = Math.round(imageHeight * 0.55);
    const cropWidth = Math.round(imageWidth * 0.85);
    const cropHeight = Math.round(imageHeight * 0.18);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2400
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_pageseg_mode: "6"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}
async function extractGSTValidityDatesFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/gst-liability-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.58);
const cropTop = Math.round(imageHeight * 0.415);
const cropWidth = Math.round(imageWidth * 0.35);
const cropHeight = Math.round(imageHeight * 0.065);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2600
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist: "0123456789/",
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}
async function extractUdyamNumberFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/udyam-number-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.48);
    const cropTop = Math.round(imageHeight * 0.20);
    const cropWidth = Math.round(imageWidth * 0.40);
    const cropHeight = Math.round(imageHeight * 0.07);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2400
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist:
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}


async function extractUdyamEnterpriseNameFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/udyam-name-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.35);
const cropTop = Math.round(imageHeight * 0.18);
const cropWidth = Math.round(imageWidth * 0.55);
const cropHeight = Math.round(imageHeight * 0.12);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2400
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}


async function extractUdyamStateFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/udyam-state-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.05);
    const cropTop = Math.round(imageHeight * 0.42);
    const cropWidth = Math.round(imageWidth * 0.45);
    const cropHeight = Math.round(imageHeight * 0.08);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2200
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}


async function extractUdyamNICFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/udyam-nic-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

   const cropLeft = Math.round(imageWidth * 0.62);
const cropTop = Math.round(imageHeight * 0.855);
const cropWidth = Math.round(imageWidth * 0.27);
const cropHeight = Math.round(imageHeight * 0.09);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2600
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist: "0123456789-",
                tessedit_pageseg_mode: "6"
}
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}
async function extractEPFOCodeNumberFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/epfo-code-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.15);
    const cropTop = Math.round(imageHeight * 0.55);
    const cropWidth = Math.round(imageWidth * 0.50);
    const cropHeight = Math.round(imageHeight * 0.08);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2400
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist:
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}


async function extractEPFOEstablishmentNameFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/epfo-name-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.28);
    const cropTop = Math.round(imageHeight * 0.60);
    const cropWidth = Math.round(imageWidth * 0.62);
    const cropHeight = Math.round(imageHeight * 0.08);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2400
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}


async function extractEPFOPANFromImage(imagePath) {
    const croppedPath = "./uploads/ocr/epfo-pan-crop.png";

    const metadata = await sharp(imagePath).metadata();

    const imageWidth = metadata.width;
    const imageHeight = metadata.height;

    const cropLeft = Math.round(imageWidth * 0.28);
    const cropTop = Math.round(imageHeight * 0.64);
    const cropWidth = Math.round(imageWidth * 0.40);
    const cropHeight = Math.round(imageHeight * 0.06);

    await sharp(imagePath)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: cropWidth,
            height: cropHeight
        })
        .resize({
            width: 2200
        })
        .grayscale()
        .normalize()
        .sharpen()
        .png()
        .toFile(croppedPath);

    const result = await Tesseract.recognize(
        croppedPath,
        "eng",
        {
            config: {
                tessedit_char_whitelist:
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
                tessedit_pageseg_mode: "7"
            }
        }
    );

    fs.unlinkSync(croppedPath);

    return result.data.text
        .replace(/\s+/g, " ")
        .trim();
}
module.exports = {
    extractTextFromImage,
    extractPANFromImage,
    extractPANNameFromImage,
    extractGSTINFromImage,
    extractGSTBusinessNameFromImage,
    extractGSTStateFromImage,
    extractGSTValidityDatesFromImage,
    extractUdyamNumberFromImage,
    extractUdyamEnterpriseNameFromImage,
    extractUdyamStateFromImage,
    extractUdyamNICFromImage,
    extractEPFOCodeNumberFromImage,
    extractEPFOEstablishmentNameFromImage,
    extractEPFOPANFromImage
};