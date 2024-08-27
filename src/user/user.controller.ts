import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Query,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { WriteResponse } from "src/shared/response";
import { JwtAuthGuard } from "src/jwt/jwt-auth.guard";
import { IPagination, IPaginationSwagger } from "src/shared/paginationEum";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { ApiFile } from "src/decorators/api-file.decorator";

@Controller("user")
@ApiTags("user")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("get-All")
  findAll(@Req() req: any) {
    return this.userService.findAll(req?.user);
  }

  @Get("getOne/:id")
  findOne(@Param("id") id: string, @Req() req) {
    return this.userService.findOne("id", id);
  }

  @Post("pagination")
  @ApiBody({
    schema: {
      type: "object",
      properties: IPaginationSwagger,
    },
  })
  pagination(@Body() pagination: IPagination) {
    return this.userService.pagination(pagination);
  }

  @Post("editUser")
  async editUser(@Body() editUserDto: CreateUserDto) {
    const hasInspection = await this.userService.getInspection(editUserDto.id);
    if (hasInspection) {
      return WriteResponse(
        400,
        false,
        `${editUserDto.fullName} has an assigned inspection. Remove it before updating the role.`,
      );
    }
    return this.userService.editUser(editUserDto);
  }

  @Post(":id/profile-image")
  @ApiOperation({ summary: "Update profile image" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({
    status: 200,
    description: "Profile image updated successfully.",
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
    }),
  )
  @ApiFile("file")
  async updateProfileImage(
    @Param("id") userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    return await this.userService.updateProfileImage(userId, file);
  }

  @Post(":id/archive")
  async toggleArchiveUser(
    @Param("id") id: string,
    @Body("archive") archive: boolean,
  ) {
    return this.userService.toggleArchiveUser(id, archive);
  }

  @Get("userByRole/:role")
  @ApiQuery({ name: "vesselId", required: false })
  async userByRole(
    @Param("role") role: string,
    @Query("vesselId") vesselId?: string,
  ) {
    return this.userService.getUserByRole(role, vesselId);
  }

  @Get("updateProfileImageToNull/:id")
  async updateProfileImageToNull(@Param("id") id: string): Promise<any> {
    await this.userService.updateProfileImageToNull(id);
    return WriteResponse(200, true, "User profile removed successfully.");
  }
}
