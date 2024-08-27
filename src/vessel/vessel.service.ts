import { Injectable } from "@nestjs/common";
import { ArchiveDto, CreateVesselDto } from "./dto/create-vessel.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Vessel, VesselTypes } from "./entities/vessel.entity";
import { In, Repository } from "typeorm";
import { WriteResponse, paginateResponse } from "src/shared/response";
import { IPagination } from "src/shared/paginationEum";
import { extname } from "path";
import { Inspection } from "src/inspection/entities/inspection.entity";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { Role } from "src/shared/enum/Role";
import { User, User_Vessel } from "src/user/entities/user.entity";
@Injectable()
export class VesselService {
  constructor(
    @InjectRepository(Vessel)
    private readonly vesselRepo: Repository<Vessel>,

    @InjectRepository(VesselTypes)
    private readonly vesselTypesRepo: Repository<VesselTypes>,

    @InjectRepository(Inspection)
    private readonly inspectionRepo: Repository<Inspection>,

    @InjectRepository(User_Vessel)
    private readonly vesselUserRepo: Repository<User_Vessel>,
    private readonly fileService: FilesAzureService,
  ) { }
  async create(createVesselDto: CreateVesselDto, user) {
    try {
      
      if (typeof createVesselDto.data === "string") {
        createVesselDto.data = JSON.parse(createVesselDto.data);
      }

      const vessel = await this.vesselRepo.findOne({
        where: {
          vesselName: createVesselDto.data.vesselName,
          isDeleted: false,
        },
      });

      if (createVesselDto.data.id === null) {
        delete createVesselDto.data.id;
      }

      if (!createVesselDto.data.id && vessel) {
        if (vessel.id !== createVesselDto.data.id) {
          return WriteResponse(400, false, "Vessel name already exist");
        }
      }

      let msg = createVesselDto.data.id
        ? "Vessel updated successfully"
        : "Vessel created successfully";

      if (!createVesselDto.data.id) {
        createVesselDto.data['createdBy'] = user.id;
      }
      createVesselDto.data['updatedBy'] = user.id;

      if (createVesselDto.image_file) {
        if (!this.validateImageFile(createVesselDto.image_file.originalname)) {
          return WriteResponse(
            405,
            false,
            "Only image files (jpg, jpeg, png, gif) are allowed.",
          );
        }
        const folderName = "vessel_images";
       await this.deleteOldVesselImage(createVesselDto.data.id)
       const vesselFileUrl = await this.fileService.uploadFile(createVesselDto.image_file,folderName);
        createVesselDto.data["vesselImageName"] =
          createVesselDto?.image_file?.originalname ?? null;
        createVesselDto.data["vesselImage"] = vesselFileUrl;
        const data = await this.vesselRepo.save(createVesselDto.data);
        delete createVesselDto.image_file;
        return WriteResponse(200, data, msg);
      } else {
        const data = await this.vesselRepo.save(createVesselDto.data);
        return WriteResponse(200, data, msg);
      }
    } catch (error) {
      console.error(error);
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  private validateImageFile(filename: string): boolean {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"];
    const fileExt = extname(filename).toLowerCase();
    return allowedExtensions.includes(fileExt);
  }

  async deleteOldVesselImage(id): Promise<void> {
    const vessel = await this.vesselRepo.findOne({ where: { id: id } });
    if (vessel) {
      await this.fileService.deleteFile("vessel_images/" + vessel.vesselImage, "public");
    }
  }

  async findAll(user: User) {
    try {
      const baseConditions = { isDeleted: false, isArchive: false };
      const relations = ["managers"];
      let whereConditions;

      if (user.role === Role.SuperAdmin) {
        whereConditions = baseConditions;
      } else {
        const vesselIds = user.userVessel.map((i) => i.vessel_id);
        if (vesselIds?.length == 0) {
          return WriteResponse(200, [], "Record not found.");
        }
        whereConditions = {
          ...baseConditions,
          id: In(vesselIds),
        };
      }


      const data = await this.vesselRepo.find({
        where: whereConditions,
        relations,
      });

      if (data.length > 0) {
        return WriteResponse(200, data, "Records found successfully");
      } else {
        return WriteResponse(404, false, "Records not found");
      }
    } catch (error) {
      console.error('Error fetching vessels:', error);
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async allVesselTypes(user: any) {
    try {
      const baseConditions = { isDeleted: false };
      let whereConditions;

      if (user.role === Role.SuperAdmin) {
        whereConditions = baseConditions;
      } else {
        const vesselIds = user.userVessel.map((i) => i.vessel_id);
        if (vesselIds?.length == 0) {
          return WriteResponse(200, [], "Record not found.");
        }
        whereConditions = {
          ...baseConditions,
          id: In(vesselIds),
        };
      }
      const vessel = await this.vesselRepo.find({ where: whereConditions });
      const vesselTypeID = vessel.map(i => i.vesselTypeId);
      const data = await this.vesselTypesRepo.find({
        where: { isDeleted: false, id: In(vesselTypeID) },
      });
      if (data.length > 0) {
        return WriteResponse(200, data, "Records found successfully");
      } else {
        return WriteResponse(404, false, "Records not found");
      }
    } catch (error) {
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async findOne(id: string) {
    try {
      const vessel = await this.vesselRepo.findOne({
        where: { id: id, isDeleted: false },
        relations: ['managers']
      });
      if (vessel) {
        return WriteResponse(200, vessel, "Record found successfully");
      } else {
        return WriteResponse(404, false, "Record not found");
      }
    } catch (error) {
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async remove(id: string) {
    try {
      const data = await this.vesselRepo.find({ where: { isDeleted: false } });
      if (!data) {
        return WriteResponse(404, false, "Record not found");
      } else {
        await this.vesselRepo.update(id, { isDeleted: true });
        return WriteResponse(200, true, "Vessel deleted successfully");
      }
    } catch (error) {
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async archive(archiveDto: ArchiveDto) {
    try {
      const msg =
        archiveDto.isArchive === true
          ? "Vessel archived successfully"
          : "Vessel unarchived successfully";
      const vessel = await this.vesselRepo.findOne({
        where: { id: archiveDto.vesselId, isDeleted: false },
      });
      if (!vessel) {
        return WriteResponse(404, false, "Record not found");
      }
      const inspection = await this.inspectionRepo.findOne({
        where: { vesselId: archiveDto.vesselId },
      });
      if (inspection) {
        return WriteResponse(
          404,
          false,
          "Vessel cannot be archived/unarchived due to associated inspections",
        );
      }
      await this.vesselRepo.update(archiveDto.vesselId, {
        isArchive: archiveDto.isArchive,
      });
      return WriteResponse(200, true, msg);
    } catch (error) {
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async pagination(pagination: IPagination): Promise<any> {
    try {
      const { curPage, perPage, whereClause } = pagination;
      let lwhereClause = "f.isDeleted = false";
      const fieldsToSearch = [
        "imoNo",
        "vesselName",
        "flag",
        "manager",
        "charterer",
      ];
      fieldsToSearch.forEach((field) => {
        const fieldValue = whereClause.find((p) => p.key === field)?.value;
        if (fieldValue) {
          lwhereClause += ` AND f.${field} LIKE '%${fieldValue}%'`;
        }
      });

      const allValue = whereClause.find((p) => p.key === "all")?.value;
      if (allValue) {
        const conditions = fieldsToSearch
          .map((field) => `f.${field} LIKE '%${allValue}%'`)
          .join(" OR ");
        lwhereClause += ` AND (${conditions})`;
      }
      const archived = whereClause.find((p) => p.key === "isArchive")?.value;
      if (archived) {
        lwhereClause += ` AND f.isArchive=${archived == "true" ? true : false}`;
      }
      const skip = (curPage - 1) * perPage;
      const [list, count] = await this.vesselRepo
        .createQueryBuilder("f")
        .where(lwhereClause)
        .skip(skip)
        .take(perPage)
        .leftJoinAndSelect('f.managers', 'managers')
        .orderBy("f.createdOn", "DESC")
        .getManyAndCount();

      return paginateResponse(list, count);
    } catch (err) {
      return WriteResponse(500, false, "Something Went Wrong");
    }
  }

  async findAllManagers() {
    try {
      // Assuming Vessel entity has a manager column

      // Query to get unique managers
      const managers = await this.vesselRepo
        .createQueryBuilder("vessel")
        .select("DISTINCT vessel.manager")
        .where("vessel.manager Is NOT NULL")
        .getRawMany();

      if (managers.length > 0) {
        return WriteResponse(200, managers, "Record Found Successfully.");
      }

      return WriteResponse(404, [], "Record Not Found");
    } catch (err) {
      return WriteResponse(500, false, "Something Went Wrong.");
    }
  }
}
