import { Catch, Injectable, Req } from "@nestjs/common";
import { CreateInspectionAdditionalInfoDto } from "./dto/create-inspection_additional_info.dto";
import { UpdateInspectionAdditionalInfoDto } from "./dto/update-inspection_additional_info.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { InspectionAdditionalInfo } from "./entities/inspection_additional_info.entity";
import { Repository } from "typeorm";
import { WriteResponse } from "src/shared/response";
import { serverUrl } from "src/constent";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { error } from "console";
// import { existsSync, mkdirSync } from 'fs';
// import { extname } from 'path';
// import { rename, writeFile } from 'fs/promises';

@Injectable()
export class InspectionAdditionalInfoService {
  constructor(
    @InjectRepository(InspectionAdditionalInfo)
    private inspectionAdditionalInfoRepo: Repository<InspectionAdditionalInfo>,
    private readonly fileService: FilesAzureService,
  ) {}

  async createInsectionAdditionalnfo(
    createInspectionAdditionalInfoDto: CreateInspectionAdditionalInfoDto,
    file: Express.Multer.File,
    pdfFile: Express.Multer.File,
  ) {
    const additionalInfo = new InspectionAdditionalInfo();
    if(createInspectionAdditionalInfoDto.id && createInspectionAdditionalInfoDto.id !== "null"){
      additionalInfo.id = createInspectionAdditionalInfoDto.id;
    }
    additionalInfo.inspectionId =
      createInspectionAdditionalInfoDto.inspectionId;
    additionalInfo.psc = createInspectionAdditionalInfoDto.psc;

    if (file) {
      const fileName = await this.fileService.uploadFile(
        file,
        "additionalInfo",
      );
      additionalInfo.fileName = fileName;
      additionalInfo.originalFileName = file.originalname;
    }

    if (pdfFile) {
      const pdfFileName = await this.fileService.uploadPdfFile(
        pdfFile.buffer,
        "additionalInfo/conditionOfClass",
        pdfFile.originalname
      );
      additionalInfo.conditionOfClassName = pdfFileName;
      additionalInfo.classOriginalName = pdfFile.originalname;
    }

    try {
      await this.inspectionAdditionalInfoRepo.save(additionalInfo);
      return WriteResponse(
        200,
        additionalInfo,
        "Inspection additional info saved successfully",
      );
    } catch (error) {
      console.log(error)
      return WriteResponse(
        400,
        false,
        "Failed to save inspection additional info",
      );
    }
  }

  async findAll() {
    try {
      const data = await this.inspectionAdditionalInfoRepo.find({
        where: { isArchive: false },
        relations: ["inspection"],
      });
      if (data.length > 0) {
        data.map((i) => {
          i["pdf_file"] = `${serverUrl}public/additionalInfo/${i.fileName}`;
        });
        return WriteResponse(
          200,
          data,
          "Inspection Addition Info tpye retrieved successfully",
        );
      }
      return WriteResponse(404, false, " Record not found");
    } catch (err) {
      return WriteResponse(500, false, "something went wrong");
    }
  }
  async findOne(id: string) {
    try {
      const data = await this.inspectionAdditionalInfoRepo.findOne({
        where: { id: id, isArchive: false },
      });
      if (data) {
        data["pdf_file"] = `${serverUrl}public/additionalInfo/${data.fileName}`;
        return WriteResponse(200, data, "Record found successfully");
      } else {
        return WriteResponse(404, false, "Record not found");
      }
    } catch (error) {
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  update(
    id: number,
    updateInspectionAdditionalInfoDto: UpdateInspectionAdditionalInfoDto,
  ) {
    return `This action updates a #${id} inspectionAdditionalInfo`;
  }

  remove(id: number) {
    return `This action removes a #${id} inspectionAdditionalInfo`;
  }
}
