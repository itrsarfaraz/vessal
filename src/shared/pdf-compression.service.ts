import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

@Injectable()
export class PdfCompressionService {
  async compressPdf(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Ghostscript command for PDF compression
      const command = `"gswin64c.exe" -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH -sOutputFile=${outputPath} ${inputPath}`;
      await execPromise(command);
    } catch (error) {
      console.error('Error compressing PDF:', error);
      throw new Error('PDF compression failed');
    }
  }
}
