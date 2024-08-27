import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategorySortCode } from './dto/create-category.dto';
import { ApiBearerAuth, ApiBody, ApiProperty, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

@Controller('category')
@ApiTags('category')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Post('create')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.createCategory(createCategoryDto);
  }

  @Post('updateCategorySortCode')
  @ApiBody({type: [UpdateCategorySortCode]})
  @ApiResponse({ status: 200, description: 'Categories sort codes updated successfully.' })
  updateCategorySortCode(@Body() updateCategorySortCode: UpdateCategorySortCode[]) {
    return this.categoryService.updateCategorySortCode(updateCategorySortCode);
  }

  @Get('getAll')
  @ApiQuery({
    name: "isCount",
    type: "boolean",
    description: "Set to true to fetch only categories with a questionCount greater than 0."
  })
  @ApiQuery({
    name: "isSub",
    type: "boolean",
    description: "Set to true to fetch only categories with a sub category more than 0."
  })
  findAll(@Query("isCount") isCount: boolean,@Query("isSub") isSub: boolean ) {
    return this.categoryService.findAll(isCount, isSub);
  }
  @Get('getAllSubCategory')
  findAllSubCategory(@Query("cateogryId") categoryId: string) {
    return this.categoryService.findAllSubCategory(categoryId);
  }

  @Get('getOne/:id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.categoryService.findOne("id", id);
  }


  @Get('delete/:id')
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  @Get('getSubcategoryByCategoryId/:id')
  getSubCategory(@Param('id') id: string) {
    return this.categoryService.getSubCategoryByCategoryId(id);
  }
}
