import { HttpException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Vessel } from "src/vessel/entities/vessel.entity";
import { In, Repository } from "typeorm";
import { GetFleetStatusDto } from "./dto/create-report.dto";
import { WriteResponse } from "src/shared/response";
import * as ExcelJS from "exceljs";
import * as XLSX from 'xlsx';
import * as path from "path";
import getVersionedFileName from "src/utils/versioned-file-name";
import { existsSync, read, readFileSync, unlinkSync } from "fs";
import {
  formatDate,
  getAverageColor,
  getAverageWithText,
  getAverageWithTextForExel,
  groupBy,
} from "src/utils/groupBy";
import { Category } from "src/category/entities/category.entity";
import { GradeEnum } from "src/shared/enum/gradeEnum";
import { PdfGateway } from "src/geteway/pdf.gateway";
import { Report } from "./entities/report.entity";
import { InspectionReportStatus } from "src/shared/enum/InspectionReportStatus";
import { inspectionStatus } from "src/shared/enum/inspectionStatus";
import { getQuarterFromDateISOString } from "src/helper";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Vessel)
    private vesselRepository: Repository<Vessel>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Report)
    private readonly inspectionReportRepo: Repository<Report>,
    private readonly pdfGateway: PdfGateway,
  ) { }

  async getFleetStatus(getFleetStatusDto: GetFleetStatusDto) {
    const { type, fleetId, vesselId } = getFleetStatusDto;
    let vessels: Vessel[] = [];
    const relations = [
      "managers",
      "inspection",
      "inspection.startPort",
      "inspection.additionalInfo",
      "inspection.questions",
      "inspection.questions.actionPlan",
      "inspection.generalComment",
    ];

    switch (type) {
      case "all":
        vessels = await this.vesselRepository.find({ relations });
        break;
      case "fleet":
        if (fleetId) {
          vessels = await this.vesselRepository.find({ where: {}, relations });
        }
        break;
      case "vessel":
        if (vesselId) {
          vessels = await this.vesselRepository.find({
            where: { id: In(vesselId.split(",")) },
            relations,
          });
        }
        break;
      default:
        return WriteResponse(400, null, "Invalid type parameter");
    }

    const allCategory = await this.categoryRepository.find({
      where: { isdeleted: false },
    });

    const vesselInspections = vessels.map((vessel) => {
      const inspections =
        vessel.inspection.filter(
          (inspection) =>
            inspection.status == inspectionStatus.Closed ||
            inspection.status == inspectionStatus.ClosedPA ||
            inspection.status == inspectionStatus.PA,
        ) || [];
      inspections.sort(
        (a, b) =>
          new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime(),
      );
      return {
        ...vessel,
        inspection: inspections[0] || null, // Get the latest inspection
        categories: groupBy(inspections[0]?.questions, "categoryName"),
      };
    });

    const saveReort = {
      id: null,
      reportGeneratedDate: new Date(),
      overviewType: type,
      type: "Overview",
      reportStatus: InspectionReportStatus.Progress,
      userId: null,
      reportUniqueId: null,
    };
    const report = await this.create(saveReort);

    this.generateExcel(
      { vessels: vesselInspections, allCategory, report },
      type,
    ).then(() => {
      this.inspectionReportRepo.update(report.id, {
        reportStatus: InspectionReportStatus.Completed,
      });
      this.pdfGateway.sendFleetProgressUpdate({
        type: type,
        message: "PDF generation complete.",
        report: report,
      });
    });

    return WriteResponse(
      200,
      vesselInspections,
      "Fleet status report generated successfully.",
    );
  }

  async generateExcel({ vessels, allCategory, report }, type) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Vessel Condition");

    // Add title in the first row
    const reportDate = new Date().toLocaleDateString();
    worksheet.mergeCells("A1:Q1");
    worksheet.getCell("A1").value =
      `OVERALL CONDITION RATING OF THE VESSELS Dated ${reportDate}`;
    worksheet.getCell("A1").font = { bold: true };
    worksheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFF00" }, // Yellow
    };
    worksheet.getCell("A1").alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    worksheet.getRow(1).height = 30;

    const nameOfCategory = allCategory
      ?.filter((c) => vessels.some((item) => item?.categories[c.categoryName]))
      .map((i) => i.categoryName);

      const quarter = getQuarterFromDateISOString(new Date().toISOString());
    // Add column headers in the third row
    const columns = [
      "Managers",
      "Vessel (Teus - Year Built - DD Dates)",
      "Last Inspection (Date - Place)",
      ...nameOfCategory,
      "PSC Rating",
      "Off-Hire",
      "Overall Rating",
      "Charterers and Vetting Score",
      `Budget Percentage on ${quarter}/${new Date().getFullYear()}`,
      "CII Rating",
    ];

    const headerRow = worksheet.addRow(columns);

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF808080" }, // Gray
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      cell.font = { bold: true };
    });
    // Add data from JSON array starting from the fourth row
    vessels.forEach((vessel) => {
      const categoryAverages = nameOfCategory.map((categoryName) => {
        const questions: any = vessel.categories[categoryName] || [];
        const totalWeight = questions.reduce(
          (sum, q) => sum + (q.weight || 0),
          0,
        );
        const weightedSum = questions.reduce((sum: number, q: any) => {
          const gradeValue: any = GradeEnum[q.grade] || 0; // Ensure grade exists in GradeEnum, default to 0 if not found
          return sum + (q.weight || 0) * gradeValue;
        }, 0);
        const average = totalWeight > 0 ? weightedSum / totalWeight : 0;
        // Determine color based on the average
        let color = getAverageColor(average);
        return {
          average: getAverageWithTextForExel(average),
          color,
          overallAvg: average,
        };
      });

      const totalAverageSum = categoryAverages.reduce(
        (sum, ca) => sum + ca.overallAvg,
        0,
      );

      const row = [
        "VS-" + (vessel?.managers?.name ?? ""),
        `${vessel.vesselName} (${vessel.teus || "N/A"} - Build ${vessel.yearBuilt || "N/A"} - Last DD: ${formatDate(vessel.lastDueDateDryDock)} - Next DD: ${formatDate(vessel.nextDueDateDryDock)})`,
        `${vessel?.inspection?.performedBy ?? ""} (${formatDate(vessel.inspection?.inspectionDate)}-${vessel.inspection?.startPort?.name ?? ""})`,
        ...categoryAverages.map((ca) => ca.average),
        vessel?.inspection?.additionalInfo?.psc ?? "-",
        "-",
        (totalAverageSum / categoryAverages.length).toFixed(2),
        vessel?.charterer ?? "-",
        "-",
        "-",
      ];

      const newRow = worksheet.addRow(row);

      // Apply colors based on conditions
      // Apply colors to category cells based on the averages
      categoryAverages.forEach((ca, index) => {
        if (ca.color) {
          newRow.getCell(4 + index).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: ca.color },
          };
          const color = ["8c151c"];
          if (color.includes(ca.color)) {
            newRow.getCell(4 + index).font = {
              color: { argb: "FFFFFFFF" },
            };
          }
        }
      });
      newRow.eachCell((cell, colNumber) => {
        if (colNumber == 1 || colNumber == 2) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "fcdc64" },
          };
        }
        if (colNumber == 3) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "bcd4ec" },
          };
        }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          wrapText: true,
          vertical: "middle",
          horizontal: "center",
        };
      });

      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.alignment = { wrapText: true };
        });
        if (rowNumber == 1) {
          row.height = 40;
        } else if (rowNumber == 2){
          row.height = 75;
        } else {
          row.height = 80; // Increase row height to 30 (default is 15)
        }
      });

      // Adjust column widths
      worksheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellLength = cell.value ? cell.value.toString().length : 0;
          if (cellLength > maxLength) {
            maxLength = cellLength;
          }
        });
        if (index == 0) {
          column.width = 28; // for manager cell
        } else if (index == 1) {
          column.width = 50; //for vessel cell
        } else if (index == 2) {
          column.width = 40; //for last inspection cell
        } else {
          column.width = 20; // for rest other cell.
        }
        // column.width = maxLength <= 10 ? 10 : 20;
        column.alignment = {
          wrapText: true,
          horizontal: "center",
          vertical: "middle",
        };
      });

    });

    const newFileName = getVersionedFileName(
      `${report.id}_vessel_fleet`,
      path.join(__dirname, "..", "public/report", "fleetReport"),
      "xlsx",
    );



    
    // const newFileName = getVersionedFileName(
    //   `${report.id}_vessel_fleet`,
    //   path.join(__dirname, "..", "..", "public/report", "fleetReport"),
    //   "xlsx",   
    // );  
    const locationWhereFileSave = path.join(
      __dirname,
      "..",
      "public/report",
      "fleetReport",
      newFileName,
    );
    // const locationWhereFileSave = path.join(
    //   __dirname,
    //   "..",
    //   "..",
    //   "public/report",
    //   "fleetReport",
    //   newFileName,
    // );

    // console.log(locationWhereFileSave);
    await workbook.xlsx.writeFile(locationWhereFileSave);
    const readBuffer = readFileSync(locationWhereFileSave);
    await new FilesAzureService().uploadExcelFile(readBuffer,newFileName);
    if(existsSync(locationWhereFileSave)){
      unlinkSync(locationWhereFileSave);
    }
    return newFileName;
  }


  async sortWorksheetByCell(inputPath: string, outputPath: string, column: string, sheetName: string): Promise<void> {
     // Read the input Excel file
     const workbook = XLSX.readFile(inputPath);
     const worksheet = workbook.Sheets[sheetName];
     
     if (!worksheet) {
       throw new Error(`Sheet ${sheetName} not found`);
     }
 
     // Convert the sheet to JSON
     const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
 
     // Extract the header
     const header:any = data[0];


     console.log(header);
     console.log(data)
 
     // Extract the rows to be sorted
     const rows = data.slice(1);
 
     // Get the index of the column to sort by
     const columnIndex = header.indexOf(column);
     if (columnIndex === -1) {
       throw new Error(`Column ${column} not found`);
     }
 
     // Sort the rows based on the specific cell in the specified column
     rows.sort((a, b) => {
       const cellA = a[columnIndex];
       const cellB = b[columnIndex];
 
       if (cellA < cellB) return -1;
       if (cellA > cellB) return 1;
       return 0;
     });
 
     // Combine the header and the sorted rows
     const sortedData = [header, ...rows];
 
     // Convert the sorted data back to a worksheet
     const sortedSheet = XLSX.utils.aoa_to_sheet(sortedData);
 
     // Replace the original sheet with the sorted sheet
     workbook.Sheets[sheetName] = sortedSheet;
 
     // Write the sorted workbook to the output file
     XLSX.writeFile(workbook, outputPath);
  }

  async downloadFleetStatusReport(id: string) {
    try {
      const filePath = path.join(
        __dirname,
        "..",
        `public/report/fleetReport/${id}_vessel_fleet.xlsx`,
      );
      if (!existsSync(filePath)) {
        throw new HttpException("PDF file not found", 404);
      }
      return readFileSync(filePath);
    } catch (error) {
      throw new HttpException(`Error downloading PDF: ${error.message}`, 500);
    }
  }

  async create(CreateReportDto: any) {
    const inspectionId = await this.inspectionReportRepo.findOne({
      where: { type: CreateReportDto.type },
      order: { reportUniqueId: "DESC" },
    });
    if (CreateReportDto.id) {
      const r = await this.inspectionReportRepo.save(CreateReportDto);
      return r;
    } else {
      if (inspectionId) {
        CreateReportDto.reportUniqueId = inspectionId.reportUniqueId + 1;
      } else {
        CreateReportDto.reportUniqueId = 1;
      }
      delete CreateReportDto.id;
      const report = await this.inspectionReportRepo.save(CreateReportDto);
      return report;
    }
  }
}
