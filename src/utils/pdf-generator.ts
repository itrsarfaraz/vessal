import * as fs from "fs";
import * as path from "path";
import * as ejs from "ejs";
import * as puppeteer from "puppeteer";
import getVersionedFileName from "./versioned-file-name";
import { serverUrl } from "src/constent";
import { PDFDocument } from "pdf-lib";   
import { Injectable } from "@nestjs/common";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { Worker } from "worker_threads";
@Injectable()
export class PdfGenerator {
  // without worker thread
  // static async generatePdf(
  //   templateName: string,
  //   data: any,
  //   outputDir: string,
  //   options: any = {},
  //   extra?: any,
  // ): Promise<void> {
  //   try {
  //     // Launch Puppeteer
  //     const browser = await puppeteer.launch({
  //       headless: true,
  //       args: ["--no-sandbox"],
  //     });
  //     const [page, coverPage] = await Promise.all([
  //       browser.newPage(),
  //       browser.newPage(),
  //     ]);
  //     await Promise.all([
  //       page.setDefaultNavigationTimeout(0),
  //       coverPage.setDefaultNavigationTimeout(0),
  //     ]);

  //     data.serverUrl = serverUrl;

  //     // Set content for the main page and cover page
  //     const mainContent = this.renderTemplate(templateName, data);
  //     const coverTemplate = extra?.actionPlan ? "actionPlanCover" : "cover";
  //     const coverContent = this.renderTemplate(coverTemplate, data);

  //     await Promise.all([
  //       page.setContent(await mainContent, { waitUntil: "load" }),
  //       coverPage.setContent(await coverContent, { waitUntil: "load" }),
  //     ]);

  //     const baseFileName = templateName.replace(/\s+/g, "_").toLowerCase();
  //     const outputFileName = getVersionedFileName(
  //       baseFileName,
  //       outputDir,
  //       "pdf",
  //     );

  //     const defaultPdfOptions: any = {
  //       format: "A4",
  //       timeout: 0,
  //       preferCSSPageSize: true,
  //       printBackground: true,
  //       quality: 50,
  //     };

  //     const coverPdfOptions = {
  //       ...defaultPdfOptions,
  //     };

  //     const allPagePdfOptions = {
  //       ...defaultPdfOptions,
  //       ...options,
  //       margin: { top: "110px", bottom: "50px" },
  //     };

  //     // Add CSS to increase body margin-top for all pages
  //     // await page.addStyleTag({ content: `body { margin-top: 1cm; }` });
  //     // Generate PDFs
  //     const [coverPdf, allPagePdf] = await Promise.all([
  //       coverPage.pdf(coverPdfOptions),
  //       page.pdf(allPagePdfOptions),
  //     ]);

  //     // Merge PDFs
  //     const mergedPdfBytes = await this.mergePdfs(coverPdf, allPagePdf);

  //     // Write the merged PDF to a file

  //     await new FilesAzureService().uploadPdfFile(
  //       mergedPdfBytes,
  //       outputDir,
  //       outputFileName,
  //     );

  //     // Close the browser
  //     await browser.close();
  //   } catch (error) {
  //     console.error("Error generating PDF:", error);
  //     throw new Error("PDF generation failed");
  //   }
  // }


  //   // generate with worker thread
  static async generatePdf(
    templateName: string,
    data: any,
    outputDir: string,
    options: any = {},
    extra?: any,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'pdf-worker.js'), {
        workerData: {
          templateName, data,outputDir,options,extra
        }
      });



      worker.on('message', (message) => { 
        if (message.success) {
          resolve(message.buffer);
        } else {
          reject(new Error(message.error));
        }
      });

      worker.on('error', (err) => {
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  private static async mergePdfs(
    coverPdf: Buffer,
    allPagePdf: Buffer,
  ): Promise<Uint8Array> {
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

  private static async renderTemplate(
    templateName: string,
    data: any,
  ): Promise<string> {
    // Read the EJS template file
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
    const templete = ejs.render(templateContent, { ...data });
    // fs.writeFileSync(templatePath.replace(".ejs", ".html"),templete, "utf-8");
    return templete;
  }

  static async generateFullReportHeader(data: any): Promise<string> {
    const { vessel, uniqueId, inspectionDate } = data;
    // const pathName = path.join(
    //   __dirname, 
    //   "..",
    //   "..",
    //   "public/companyLogo/logo.svg",
    // );
    const pathName = path.join(__dirname, "..", "public/companyLogo/logo.svg");
    const bitmap = fs.readFileSync(pathName);
    // convert binary data to base64 encoded string
    const base64 = Buffer.from(bitmap).toString("base64");

    // Format inspection date if available
    const formattedInspectionDate = inspectionDate
      ? inspectionDate.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

    return await this.renderTemplate("full-reportHeader", {
      vessel,
      uniqueId,
      formattedInspectionDate,
      base64,
    });
  }

  static async generateFullReportFooter(q): Promise<string> {
    return await this.renderTemplate("fullReportFooter", { q });
  }
}
