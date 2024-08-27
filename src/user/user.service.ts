import { Injectable } from "@nestjs/common";
import { CreateUserDto, EditUserDto } from "./dto/create-user.dto";
import { Not, Repository } from "typeorm";
import { User, User_Info, User_Vessel } from "./entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { WriteResponse, paginateResponse } from "src/shared/response";
import { IPagination } from "src/shared/paginationEum";
import { extname, join } from "node:path";
import { promises as fs } from "fs";
import { existsSync, unlinkSync } from "node:fs";
import { serverUrl } from "src/constent";
import multer, { Multer } from "multer";
import { FilesAzureService } from "src/blob-storage/blob-storage.service";
import { Inspection } from "src/inspection/entities/inspection.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(User)
    private readonly inspectionRepo: Repository<Inspection>,
    @InjectRepository(User_Info)
    private readonly user_info: Repository<User_Info>,
    @InjectRepository(User_Vessel)
    private readonly user_vessel: Repository<User_Vessel>,
    private readonly fileService: FilesAzureService,
  ) {}

  //GetAll
  async findAll(user) {
    const User = await this.userRepository.find({
      relations: ["userVessel"],
      where: { isDeleted: false, id: Not(user.id) },
      order: { fullName: "ASC" },
    });

    if (User.length) {
      return WriteResponse(200, User, "User Found Successfully.");
    }
    return WriteResponse(404, false, "User Not Found.");
  }

  //GetOne
  async findOne(field: string = "id", identifier: string) {
    const whereCondition = { [field]: identifier };
    const User: any = await this.userRepository.findOne({
      where: whereCondition,
      relations: ["user_info"],
    });
    if (!User) {
      return WriteResponse(404, false, "User Not Found.");
    }
    const [vessel] = await Promise.all([this.getVesselByUserId(User?.id)]);
    User.vessel = vessel;
    return WriteResponse(200, User, "User Found Successfully.");
  }

  async validateUserById(clientId: any) {
    return this.userRepository.findOne({
      where: { id: clientId },
      relations: ["userVessel"],
    });
  }

  async pagination(pagination: IPagination): Promise<any> {
    const { curPage, perPage, whereClause } = pagination;
    let lwhereClause = "";
    const fieldsToSearch = [
      "first_name",
      "user_name",
      "surname",
      "email",
      "job_title",
      "state",
    ];
    fieldsToSearch.forEach((field) => {
      const fieldValue = whereClause.find((p) => p.key === field)?.value;
      if (fieldValue) {
        lwhereClause += ` AND f.${field} LIKE '%${fieldValue}%'`;
      }
    });

    const name = pagination.whereClause.find(
      (p: any) => p.key === "name" && p.value,
    );

    if (name) {
      lwhereClause += ` and role like '${name.value}'`;
    }
    const allValue = whereClause.find((p) => p.key === "all")?.value;
    if (allValue) {
      const conditions = fieldsToSearch
        .map((field) => `f.${field} LIKE '%${allValue}%'`)
        .join(" OR ");
      lwhereClause += ` AND (${conditions})`;
    }
    const skip = (curPage - 1) * perPage;
    const [list, count] = await this.userRepository
      .createQueryBuilder("f")
      .where(lwhereClause)
      .skip(skip)
      .take(perPage)
      .orderBy("f.created_on", "DESC")
      .getManyAndCount();
    return paginateResponse(list, count);
  }

  async editUser(editUserDto: CreateUserDto) {
    try {
      if (editUserDto.id == null) {
        delete editUserDto.id;
      }

      const promises = [
        this.handleUserInfo(editUserDto),
        this.handleVesselAssignment(editUserDto),
      ];

      // Execute all promises concurrently
      await Promise.all(promises);
      const data = await this.userRepository.save(editUserDto);
      return WriteResponse(200, data, "User updated successfully.");
    } catch (error) {
      console.error(error);
      return WriteResponse(500, false, "Something went wrong");
    }
  }

  async getInspection(userId) {
    try {
      const inspect = await this.inspectionRepo.find({
        where: { InspectorId: userId },
      });
      if (inspect.length > 0) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private async handleUserInfo(data: any) {
    const userInfo = data.user_info ?? [];
    const savePromises = userInfo.map((info: any) => {
      info.userId = data.id;
      return this.user_info.save(info);
    });
    await Promise.all(savePromises);
  }

  async updateProfileImage(userId: string, file: Express.Multer.File) {
    if (file) {
      if (!this.validateImageFile(file.originalname)) {
        return WriteResponse(
          405,
          false,
          "Only image files (jpg, jpeg, png, gif) are allowed.",
        );
      }

      const validImageExtensions = [".jpg", ".jpeg", ".png", ".gif"];
      const fileExt = extname(file.originalname).toLowerCase();

      if (!validImageExtensions.includes(fileExt)) {
        return WriteResponse(
          405,
          false,
          "Only image files (jpg, jpeg, png, gif) are allowed.",
        );
      }
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return WriteResponse(404, false, "User Not Found.");
    }

    // Remove old image if it exists
    if (user.profilePicture) {
      // const oldImagePath = join(__dirname, '..', '..', 'uploads', user.profilePicture);
      // if (existsSync(oldImagePath)) {
      //   unlinkSync(oldImagePath);
      // }

      await this.fileService.deleteFile(
        "profile_images/" + user.profilePicture,
        "public",
      );
    }

    // Update user record with new image path
    user.profilePicture = await this.fileService.uploadFile(
      file,
      "profile_images",
    );
    await this.userRepository.save(user);
    return WriteResponse(200, true, "Profile updated successfully.");
  }

  private async handleVesselAssignment(data: any) {
    if (data.vessels) {
      await this.user_vessel.delete({ user_id: data.id });
      for (const vessel of data.vessels) {
        await this.user_vessel.save({
          user_id: data.id,
          vessel_id: vessel,
        });
      }
    }
  }

  private validateImageFile(filename: string): boolean {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif"];
    const fileExt = extname(filename).toLowerCase();
    return allowedExtensions.includes(fileExt);
  }

  private async getVesselByUserId(userId: string) {
    if (!userId) {
      return [];
    }
    const userVessel = await this.user_vessel.find({
      where: { user_id: userId, isDeleted: false },
      relations: ["vessel"],
    });
    return userVessel.map((v) => v.vessel);
  }

  async toggleArchiveUser(id: string, archive: boolean): Promise<any> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      return WriteResponse(400, false, "User not found.");
    }
    user.isDeleted = archive;
    await this.userRepository.save(user);
    return WriteResponse(200, true, "User archived successfully.");
  }

  async getUserByRole(role: string, vesselId?: string): Promise<any> {
    let user;

    if (vesselId) {
      user = await this.userRepository
        .createQueryBuilder("u")
        .leftJoinAndSelect("u.userVessel", "v")
        .where("u.role = :role", { role })
        .andWhere("u.isDeleted = :isDeleted", { isDeleted: false })
        .andWhere("v.vessel_id = :vesselId", { vesselId })
        .getMany();
    } else {
      user = await this.userRepository.find({
        where: { role: role, isDeleted: false },
      });
    }

    if (user && user.length > 0) {
      return WriteResponse(200, user, "Record found successfully.");
    } else {
      return WriteResponse(400, false, "Record not found.");
    }
  }

  async updateProfileImageToNull(userId: string): Promise<User> {
    const user: any = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (user) {
      user.profilePicture = null; // Set profileImage to null
      await this.fileService.deleteFile(
        "profile_images/" + user.profilePicture,
        "public",
      );
      return await this.userRepository.save(user);
    }
    return null; // User not found
  }
}
