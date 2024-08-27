import { KeyVaultService } from './../kayvault/KeyVaultService ';
import {
  BlobServiceClient,
  BlockBlobClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { createWriteStream, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import * as path from "path";
import { PDFDocument } from "pdf-lib";

@Injectable()
export class FilesAzureService {
  // constructor(private KeyVaultService: KeyVaultService) { }
  private containerName: string;

  private async getBlobServiceInstance() {
    const connectionString = process.env["AZURE_STORAGE_CONNECTION_STRING"];
    const blobClientService =
      await BlobServiceClient.fromConnectionString(connectionString);
    return blobClientService;
  }

  private async getBlobClient(imageName: string): Promise<BlockBlobClient> {
    const blobService = await this.getBlobServiceInstance();
    const containerName = this.containerName;
    const containerClient = blobService.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(imageName);
    return blockBlobClient;
  }

  public async uploadFile(file: Express.Multer.File, folderName: string) {
    this.containerName =
      (process.env.AZURE_CONTAINER_NAME || "public") + "/" + folderName;
    const extension = file.originalname.split(".").pop();
    const file_name = Date.now() + "." + extension;
    const blockBlobClient = await this.getBlobClient(file_name);
    const contentType = file.mimetype || "application/octet-stream";

    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobContentDisposition: "inline", // or 'attachment' if you want the file to be downloaded
      },
    };
    await blockBlobClient.uploadData(file.buffer, options);
    return file_name;
  }
  public async uploadPdfFile(buffer: any, folderName: string, fileName, isReport = false) {
    this.containerName = (process.env.AZURE_CONTAINER_NAME || "public") + "/" + folderName;
    const extension = fileName.split(".").pop();
    const name = Date.now();
    const file_name = isReport ? fileName : name + "." + extension;
    const blockBlobClient = await this.getBlobClient(file_name);
    const contentType = "application/pdf";

    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobContentDisposition: "inline", // or 'attachment' if you want the file to be downloaded
      },
    };
    await blockBlobClient.uploadData(buffer, options);
    return file_name;
  }

  public async uploadExcelFile(buffer: any, fileName: string): Promise<string> {
    this.containerName = "public/report/fleetReport";
    const blockBlobClient = await this.getBlobClient(fileName);
    const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobContentDisposition: "inline", // or 'attachment' if you want the file to be downloaded
      },
    };

    await blockBlobClient.uploadData(buffer, options);
    return fileName;
  }

  async deleteFile(file_name: string, containerName: string) {
    try {
      this.containerName = containerName;
      const blockBlobClient = await this.getBlobClient(file_name);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      console.log(error, "deleted record");
    }
  }

  // New method to generate SAS URL
  private async getSasUrl(fileName: string): Promise<string> {
    const blobService = await this.getBlobServiceInstance();
    const containerClient = blobService.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    const expiresOn = new Date(new Date().valueOf() + 3600 * 1000); // 1 hour expiration
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: fileName,
        permissions: BlobSASPermissions.parse("r"), // Read permission
        startsOn: new Date(),
        expiresOn,
      },
      blobService.credential as StorageSharedKeyCredential,
    ).toString();
    return `${blockBlobClient.url}?${sasToken}`;
  }

  public async getFileUrl(
    fileName: string,
    containerName: string,
  ): Promise<string> {
    this.containerName = (process.env.AZURE_CONTAINER_NAME || "public") + "/" + containerName;
    const blobService = await this.getBlobServiceInstance();
    const containerClient = blobService.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    // Set the SAS token to expire in 1 hour
    const expiresOn = new Date(new Date().valueOf() + 86400 * 1000); // 1 day expiration


    // Include both read ("r") and delete ("d") permissions
    const permissions = BlobSASPermissions.parse("rd");

    // Generate the SAS token
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: fileName,
        permissions: permissions,
        startsOn: new Date(),
        expiresOn,
        protocol: SASProtocol.HttpsAndHttp, // Allows both HTTPS and HTTP
      },
      blobService.credential as StorageSharedKeyCredential,
    ).toString();

    // Return the URL with the SAS token
    return `${blockBlobClient.url}?${sasToken}`;
  }


  async getBlobAndCompress(containerName: string, blobName: string): Promise<Buffer> {
    this.containerName = containerName;
    const blobClient = await this.getBlobClient(blobName);

    if (!(await blobClient.exists())) {
      throw new HttpException('File not found in Azure Storage', HttpStatus.NOT_FOUND);
    }

    // Download the blob content to a local file
    const downloadBlockBlobResponse = await blobClient.download();
    const tempFilePath = path.join(__dirname, `../../temp/${blobName}`);

    // Ensure the directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    const fileStream = createWriteStream(tempFilePath);

    await new Promise((resolve, reject) => {
      downloadBlockBlobResponse.readableStreamBody.pipe(fileStream);
      downloadBlockBlobResponse.readableStreamBody.on('end', resolve);
      downloadBlockBlobResponse.readableStreamBody.on('error', reject);
    });

    // Compress the PDF
    const compressedPdf = await this.compressPdf(tempFilePath);

    // Clean up the temp file
    // unlinkSync(tempFilePath);

    return compressedPdf;
  }

  async compressPdf(filePath: string): Promise<Buffer> {
    const existingPdfBytes = readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });

    // Define the path for the compressed PDF file
    const compressedFilePath = filePath.replace('.pdf', '-compressed.pdf');

    // Save the compressed PDF to the filesystem
    writeFileSync(compressedFilePath, compressedPdfBytes);

    return Buffer.from(compressedPdfBytes);
  }
}


// we are enable keyvalut in production after configure keyvalut on azure


/*@Injectable()
export class FilesAzureService {
  constructor(private keyVaultService: KeyVaultService) { }
  private containerName: string;

  private async getBlobServiceInstance() {
    // Retrieve AZURE_STORAGE_CONNECTION_STRING from Key Vault
    const connectionString = await this.keyVaultService.getSecret('AZURE_STORAGE_CONNECTION_STRING');
    const blobClientService = await BlobServiceClient.fromConnectionString(connectionString);
    return blobClientService;
  }

  private async getBlobClient(imageName: string): Promise<BlockBlobClient> {
    const blobService = await this.getBlobServiceInstance();
    const containerName = this.containerName;
    const containerClient = blobService.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(imageName);
    return blockBlobClient;
  }

  public async uploadFile(file: Express.Multer.File, folderName: string) {
    // Retrieve AZURE_CONTAINER_NAME from Key Vault
    const containerBaseName = await this.keyVaultService.getSecret('AZURE_CONTAINER_NAME');
    this.containerName = (containerBaseName || "public") + "/" + folderName;
    
    const extension = file.originalname.split(".").pop();
    const file_name = Date.now() + "." + extension;
    const blockBlobClient = await this.getBlobClient(file_name);
    const contentType = file.mimetype || "application/octet-stream";

    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobContentDisposition: "inline", // or 'attachment' if you want the file to be downloaded
      },
    };
    await blockBlobClient.uploadData(file.buffer, options);
    return file_name;
  }

  public async uploadPdfFile(buffer: any, folderName: string, fileName: string, isReport = false) {
    // Retrieve AZURE_CONTAINER_NAME from Key Vault
    const containerBaseName = await this.keyVaultService.getSecret('AZURE_CONTAINER_NAME');
    this.containerName = (containerBaseName || "public") + "/" + folderName;
    
    const extension = fileName.split(".").pop();
    const name = Date.now();
    const file_name = isReport ? fileName : name + "." + extension;
    const blockBlobClient = await this.getBlobClient(file_name);
    const contentType = "application/pdf";

    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobContentDisposition: "inline", // or 'attachment' if you want the file to be downloaded
      },
    };
    await blockBlobClient.uploadData(buffer, options);
    return file_name;
  }

  public async uploadExcelFile(buffer: any, fileName: string): Promise<string> {
    this.containerName = "public/report/fleetReport";
    const blockBlobClient = await this.getBlobClient(fileName);
    const contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const options = {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobContentDisposition: "inline", // or 'attachment' if you want the file to be downloaded
      },
    };

    await blockBlobClient.uploadData(buffer, options);
    return fileName;
  }

  async deleteFile(file_name: string, containerName: string) {
    try {
      this.containerName = containerName;
      const blockBlobClient = await this.getBlobClient(file_name);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      console.log(error, "deleted record");
    }
  }

  // New method to generate SAS URL
  private async getSasUrl(fileName: string): Promise<string> {
    const blobService = await this.getBlobServiceInstance();
    const containerClient = blobService.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    const expiresOn = new Date(new Date().valueOf() + 3600 * 1000); // 1 hour expiration
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: fileName,
        permissions: BlobSASPermissions.parse("r"), // Read permission
        startsOn: new Date(),
        expiresOn,
      },
      blobService.credential as StorageSharedKeyCredential,
    ).toString();
    return `${blockBlobClient.url}?${sasToken}`;
  }

  public async getFileUrl(
    fileName: string,
    containerName: string,
  ): Promise<string> {
    // Retrieve AZURE_CONTAINER_NAME from Key Vault
    const containerBaseName = await this.keyVaultService.getSecret('AZURE_CONTAINER_NAME');
    this.containerName = (containerBaseName || "public") + "/" + containerName;
    
    const blobService = await this.getBlobServiceInstance();
    const containerClient = blobService.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    // Set the SAS token to expire in 1 hour
    const expiresOn = new Date(new Date().valueOf() + 86400 * 1000); // 1 day expiration

    // Include both read ("r") and delete ("d") permissions
    const permissions = BlobSASPermissions.parse("rd");

    // Generate the SAS token
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName: fileName,
        permissions: permissions,
        startsOn: new Date(),
        expiresOn,
        protocol: SASProtocol.HttpsAndHttp, // Allows both HTTPS and HTTP
      },
      blobService.credential as StorageSharedKeyCredential,
    ).toString();

    // Return the URL with the SAS token
    return `${blockBlobClient.url}?${sasToken}`;
  }

  async getBlobAndCompress(containerName: string, blobName: string): Promise<Buffer> {
    this.containerName = containerName;
    const blobClient = await this.getBlobClient(blobName);

    if (!(await blobClient.exists())) {
      throw new HttpException('File not found in Azure Storage', HttpStatus.NOT_FOUND);
    }

    // Download the blob content to a local file
    const downloadBlockBlobResponse = await blobClient.download();
    const tempFilePath = path.join(__dirname, `../../temp/${blobName}`);

    // Ensure the directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    const fileStream = createWriteStream(tempFilePath);

    await new Promise((resolve, reject) => {
      downloadBlockBlobResponse.readableStreamBody.pipe(fileStream);
      downloadBlockBlobResponse.readableStreamBody.on('end', resolve);
      downloadBlockBlobResponse.readableStreamBody.on('error', reject);
    });

    // Compress the PDF
    const compressedPdf = await this.compressPdf(tempFilePath);

    // Clean up the temp file
    // unlinkSync(tempFilePath);

    return compressedPdf;
  }


}*/

