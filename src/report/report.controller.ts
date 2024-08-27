import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import { ReportService } from './report.service';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { IPagination, IPaginationSwagger } from 'src/shared/paginationEum';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { FleetService } from './fleet.service';
import { GetFleetStatusDto } from './dto/create-report.dto';
import { ReqUser } from 'src/decorators/user.decorator';
import { join } from 'path';
import { serverUrl, storageUrl } from 'src/constent';
import axios from 'axios';
import { FilesAzureService } from 'src/blob-storage/blob-storage.service';




@Controller('report')
@ApiTags("report")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService,
    private readonly fleetService: FleetService,
    private fileService: FilesAzureService
  ) { }

  @Get('generateFullReport/:id')
  findOne(@Param('id') id: string, @ReqUser() user) {
    return this.reportService.findById(id, user);
  }


  @Get('consolidated-report/:id')
  find(@Param('id') id: string, @ReqUser() user) {
    return this.reportService.findByInspectionId(id, user);
  }

  @Get('actionPlanReport/:id')
  geneerateActionPlanReport(@Param('id') id: string, @ReqUser() user) {
    return this.reportService.generateActionPlanReport(id, user);
  }


  private async downloadPdfFromUrl(url: string, filename: string, res: Response) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const pdfBuffer = Buffer.from(response.data);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record not found',
      });
    }
  }


  @Get('downloadFullReport/:id/pdf')
  async downloadFullReport(@Param('id') id: string, @Res() res: Response) {
    const url = await this.fileService.getFileUrl('full-report.pdf', `report/${id}`);
    const filename = `${id}-full-report.pdf`;
    return await this.downloadPdfFromUrl(url, filename, res);
  }

  @Get('downloadConsolidateReport/:id/pdf')
  async downloadConsolidateReport(@Param('id') id: string, @Res() res: Response) {
    const url = await this.fileService.getFileUrl('consolidate-report.pdf', `report/${id}`);
    const filename = `${id}-consolidate.pdf`;
    return await this.downloadPdfFromUrl(url, filename, res);
  }
  @Get('download-ActionPlanReport/:id/pdf')
  async downloadActionPlanReport(@Param('id') id: string, @Res() res: Response) {
    const url = await this.fileService.getFileUrl('action-plan-report.pdf', `report/${id}`);
    const filename = `${id}-action-plan-report.pdf`;
    return await this.downloadPdfFromUrl(url, filename, res);
  }

  @Get('downloadFleetStatusReport/:id')
  async downloadFleetStatusReport(@Param('id') id: string, @Res() res: Response) {
    try {
      // Get the SAS URL for the file
      const excelBuffer = await this.fileService.getFileUrl(`${id}_vessel_fleet.xlsx`, `report/fleetReport`);
      
      // Fetch the file as a stream using Axios
      const axiosRes = await axios.get(excelBuffer, { responseType: 'stream' });
  
      // Get the current date to use in the filename
      const currentDate = new Date().toISOString().split('T')[0];
  
      // Set response headers
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="vessel-condition-${currentDate}.xlsx"`,
      });
  
      // Pipe the stream directly to the response object
      axiosRes.data.pipe(res);
  
    } catch (error) {
      console.error(error);
      // Handle errors, such as if the file is not found
      res.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Record not found',
      });
    }
  }

  @Post("paginationReport")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  paginationReport(@Body() pagination: IPagination) {
    return this.reportService.pagination(pagination);
  }


  @Get("generateFleetReport")
  @ApiQuery({ name: 'type', enum: ['all', 'fleet', 'vessel'], required: true })
  @ApiQuery({ name: 'fleetId', required: false, type: Number })
  @ApiQuery({ name: 'vesselId', required: false, type: [String] })
  async getFleetStatus(@Query() getFleetStatusDto: GetFleetStatusDto) {
    return this.fleetService.getFleetStatus(getFleetStatusDto);
  }

  @Get("/downloadByPath/:path")
  async downloadByPath(@Param('path') path: string, @Res() res: Response){
    // const filePath = join(__dirname, '..', '..',"public", path);
    // const filePath = join(__dirname, '..',"public", path);
    const filePath = `${storageUrl}${path}`;
    return res.redirect(filePath);
  }


  @Post('compress')
  async compressPdfFromAzure(
    @Query('containerName') containerName: string,
    @Query('blobName') blobName: string,
  ) {
    if (!containerName || !blobName) {
      throw new HttpException('Container name and Blob name are required', HttpStatus.BAD_REQUEST);
    }

    try {
      const compressedPdf = await this.reportService.getBlobAndCompress(containerName, blobName);
      return {statusCode:200,message: "done"}
    } catch (error) { 
      console.log(error);
      throw new HttpException(
        error.message || 'Failed to compress PDF from Azure',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
