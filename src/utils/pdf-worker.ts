const sharp = require("sharp");
const { parentPort, workerData } = require("worker_threads");
const puppeteer = require("puppeteer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const ejsEngine = require("ejs");
const { FilesAzureService } = require("../blob-storage/blob-storage.service");
const { serverUrl } = require("../constent");
import axios from "axios";

async function mergePdfs(coverPdf, allPagePdf) {
  const [coverPdfDoc, allPagePdfDoc] = await Promise.all([
    PDFDocument.load(coverPdf),
    PDFDocument.load(allPagePdf),
  ]);

  const mergedPdfDoc = await PDFDocument.create();

  const coverPages = await mergedPdfDoc.copyPages(
    coverPdfDoc,
    coverPdfDoc.getPageIndices(),
  );
  coverPages.forEach((page) => mergedPdfDoc.addPage(page));

  const allPages = await mergedPdfDoc.copyPages(
    allPagePdfDoc,
    allPagePdfDoc.getPageIndices(),
  );
  allPages.forEach((page) => mergedPdfDoc.addPage(page));

  return mergedPdfDoc.save();
}

async function renderTemplate(templateName, data) {
  try {
    // const templatePath = path.resolve(
    //   __dirname,
    //   "..",
    //   "..",
    //   "src/templates",
    //   `${templateName}.ejs`,
    // );
    const templatePath = path.resolve(
      __dirname,
      "..",
      "templates",
      `${templateName}.ejs`,
    );
    const templateContent = fs.readFileSync(templatePath, "utf8");
    const renderedContent = ejsEngine.render(templateContent, { ...data });

    // Optional: Save the rendered template as an HTML file
    // const htmlPath = templatePath.replace(".ejs", ".html");
    // fs.writeFileSync(htmlPath, renderedContent, "utf-8");

    return renderedContent;
  } catch (error) {
    throw new Error(`Error rendering template: ${error.message}`);
  }
}

async function generatePdfPage(browser, content, options) {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  // all pages images compress
  // await page.setContent(content, { waitUntil: "load" });
  // const imageElements = await page.$$("img");
  // for (const imageElement of imageElements) {
  //   const imageUrl = await page.evaluate((el) => el.src, imageElement);
  //   const compressedImageBuffer = await compressImage(imageUrl);
  //   const dataUrl = `data:image/jpeg;base64,${compressedImageBuffer.toString("base64")}`;
  //   await page.evaluate(
  //     (dataUrl, selector) => {
  //       const img = document.querySelector(selector);
  //       img.src = dataUrl;
  //     },
  //     dataUrl,
  //     `img[src="${imageUrl}"]`,
  //   );
  // }

  // exclude cover page images to compress

  await page.setContent(content, { waitUntil: "load" });

  // Check if the cover page exists
  const coverElement = await page.$("#cover");

  // Get all image elements
  const imageElements = await page.$$("img");

  for (const imageElement of imageElements) {
    // Get the image's src attribute
    const imageUrl = await page.evaluate((el) => el.src, imageElement);

    // Check if the image is on the cover page (skip compression if it is)
    const isCoverImage = coverElement
      ? await page.evaluate((el) => el.contains(el), coverElement)
      : false;

    if (!isCoverImage) {
      // Compress the image if it is not on the cover page
      const compressedImageBuffer = await compressImage(imageUrl);
      const dataUrl = `data:image/jpeg;base64,${compressedImageBuffer.toString("base64")}`;

      // Update the image source with the compressed data URL
      await page.evaluate(
        (dataUrl, selector) => {
          const img = document.querySelector(selector);
          if (img) {
            img.src = dataUrl;
          }
        },
        dataUrl,
        `img[src="${imageUrl}"]`,
      );
    }
  }

  return page.pdf(options);
}

// Function to compress an image
const compressImage = async (imageUrl) => {
  const response = await axios(imageUrl, { responseType: "arraybuffer" });
  const imageBuffer = await response.data;
  const metadata = await sharp(imageBuffer).metadata();
  const compressedImage = await sharp(imageBuffer)
    .resize({
      fit: "cover",
      withoutEnlargement: true,
      width: 300,
      height: 300,
      // width: metadata?.width > metadata?.height ? 300 : null, // If width is greater than height, set width to 500 and auto adjust height
      // height: metadata?.height > metadata?.width ? 300 : null, // If height is greater than width, set height to 500 and auto adjust width
    })
    .png({ quality: 80 }) // effort: 6, lossless: false
    .jpeg({ quality: 80 }) // Progressive JPEGs
    .webp({ quality: 80 }) // Convert to WebP format
    .toBuffer();

  // writeFileSync(path.join(__dirname,"..", "..", "/temp/" + new Date().getMilliseconds()) + ".jpeg", compressedImage);
  return compressedImage;
};

async function uploadMergedPdf(mergedPdfBytes, outputDir, outputFileName) {
  try {
    // Upload the optimized PDF
    const filesAzureService = new FilesAzureService();
    await filesAzureService.uploadPdfFile(
      mergedPdfBytes,
      outputDir,
      outputFileName,
      true,
    );
  } catch (error) {
    throw new Error(`Error processing and uploading PDF: ${error.message}`);
  }
}

(async () => {
  try {
    console.log("worker thread start");
    const { templateName, data, outputDir, options, extra } = workerData;
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    data.serverUrl = serverUrl;

    // Render the templates
    const mainContent = await renderTemplate(templateName, data);
    const coverTemplate = extra?.actionPlan ? "actionPlanCover" : "cover";
    const coverContent = await renderTemplate(coverTemplate, data);
    const baseFileName = templateName.replace(/\s+/g, "_").toLowerCase();
    const outputFileName = baseFileName + ".pdf";

    const defaultPdfOptions = {
      format: "A4",
      timeout: 0,
      preferCSSPageSize: true,
      printBackground: true,
      quality: 10,
    };

    // Generate PDFs concurrently
    const [coverPdf, allPagePdf] = await Promise.all([
      generatePdfPage(browser, coverContent, defaultPdfOptions),
      generatePdfPage(browser, mainContent, {
        ...defaultPdfOptions,
        ...options,
        margin: { top: "110px", bottom: "50px" },
      }),
    ]);

    // Merge PDFs
    const mergedPdfBytes = await mergePdfs(coverPdf, allPagePdf);

    // Upload the merged PDF
    await uploadMergedPdf(mergedPdfBytes, outputDir, outputFileName);

    // Close the browser
    await browser.close();

    // Notify the parent thread that the work is done
    parentPort.postMessage({ success: true });
  } catch (error) {
    console.error("Error generating PDF:", error);
    parentPort.postMessage({ success: false, error: error.message });
  }
})();
