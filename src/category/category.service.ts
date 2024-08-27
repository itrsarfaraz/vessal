import { Injectable } from "@nestjs/common";
import {
  CreateCategoryDto,
  UpdateCategorySortCode,
} from "./dto/create-category.dto";
import { Category } from "./entities/category.entity";
import { InjectRepository } from "@nestjs/typeorm";
import {  Repository } from "typeorm";
import { WriteResponse } from "src/shared/response";
import { Questions } from "src/questions/entities/question.entity";

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly CategoryRepository: Repository<Category>,
    @InjectRepository(Questions)
    private readonly questionRepo: Repository<Questions>,
  ) { }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    try {
      if (createCategoryDto.id == null) {
        delete createCategoryDto.id;
      }
      const categoryNameLowerCase =
        createCategoryDto.categoryName.toLowerCase();



      // Check if category already exists
      const existingCategory = await this.CategoryRepository.createQueryBuilder(
        "category",
      )
        .where("LOWER(category.categoryName) = :categoryName", {
          categoryName: categoryNameLowerCase,
        }).andWhere({ isdeleted: false })
        .getOne();



      if (existingCategory && existingCategory.id != createCategoryDto.id) {
        return WriteResponse(400, false, "Category already present");
      }

      // Generate sort code if not provided
      if (!createCategoryDto.id && !createCategoryDto.sortCode) {
        let query: any = { isdeleted: false, parentCategoryId: null};
        let parent = null;
        if (createCategoryDto.parentCategoryId) {
          query.parentCategoryId = createCategoryDto.parentCategoryId;
          parent = await this.CategoryRepository.findOne({
            where: { id: createCategoryDto.parentCategoryId },
          });
        }
        let lastCategory = await this.CategoryRepository.find({
          where: query,
          order: { sortCode: "DESC" },
          take: 1,
        });
        let nextSortCode = "";
        if (createCategoryDto.parentCategoryId) {
          nextSortCode =
            lastCategory.length > 0
              ? parent.sortCode +
              Number(Number(lastCategory[0]?.sortCode.split("")[1]) + 1)
              : parent.sortCode + "1";
        } else {
          nextSortCode = lastCategory?.[0]
            ? String.fromCharCode(
              lastCategory?.[0]?.sortCode?.charCodeAt(0) + 1,
            )
            : "A";
        }
        createCategoryDto.sortCode = nextSortCode;
      } else {
        var exist = await this.CategoryRepository.findOne({
          where: { id: createCategoryDto.id },
        });

        if (createCategoryDto.sortCode !== exist.sortCode) {
          await this.reorderSubcategory(
            createCategoryDto.parentCategoryId,
            exist.sortCode,
            createCategoryDto.sortCode,
          );
        }
      }

      const data = await this.CategoryRepository.save(createCategoryDto);

      return WriteResponse(200, data, "Category created");
    } catch (error) {
     

      return WriteResponse(500, error, "Internal Server Error.");
    }
  }

  async reorderSubcategory(
    parentId: string,
    currentSortCode: string,
    newSortCode: string,
  ): Promise<void> {
    const subcategories = await this.CategoryRepository.find({
      where: { parentCategoryId: parentId },
      order: { sortCode: "ASC" },
    });

    const currentNumber = this.extractNumber(currentSortCode).code;
    const newNumber = this.extractNumber(newSortCode).code;

    const updatedSubcategories = subcategories.map((subcategory) => {
      const subcategoryNumber = this.extractNumber(subcategory.sortCode).code;
      if (subcategory.sortCode === currentSortCode) {
        subcategory.sortCode = newSortCode;
      } else if (
        currentNumber < newNumber &&
        subcategoryNumber > currentNumber &&
        subcategoryNumber <= newNumber
      ) {
        subcategory.sortCode = `${this.extractNumber(subcategory.sortCode).label}${subcategoryNumber - 1}`;
      } else if (
        currentNumber > newNumber &&
        subcategoryNumber < currentNumber &&
        subcategoryNumber >= newNumber
      ) {
        subcategory.sortCode = `${this.extractNumber(subcategory.sortCode).label}${subcategoryNumber + 1}`;
      }
      return subcategory;
    });
    await this.CategoryRepository.save(updatedSubcategories);
  }

  extractNumber(sortCode: string): any {
    return {
      label: sortCode.split("")[0],
      code: Number(sortCode.split("")[1]),
    };
  }

  async updateCategorySortCode(
    updateCategorySortCode: UpdateCategorySortCode[],
  ) {
    if (updateCategorySortCode?.length > 0) {
      for (const category of updateCategorySortCode) {
        const updateSortCode = await this.CategoryRepository.update(
          { id: category.id },
          {
            sortCode: category.sortCode,
          },
        );
      }
      return WriteResponse(
        200,
        true,
        "Categories sort codes updated successfully.",
      );
    } else {
      return WriteResponse(400, null, "Record not found");
    }
  }

  //GetAll
  async findAll(isCount: any, isSub: any) {
    let categories = await this.CategoryRepository.createQueryBuilder(
      "category",
    ).where({ isdeleted: false })
      .andWhere("category.parentCategoryId IS NULL")
      .leftJoinAndSelect("category.subCategories", "subCategories","subCategories.isdeleted= false")
      .loadRelationCountAndMap("category.questionCount", "category.questions",
        "questions",
        (qb) => qb.andWhere("questions.isArchive = :isArchive", { isArchive: false })
      )
      .orderBy("category.sortCode", "ASC")
      .getMany();

    if (!categories.length) {
      return WriteResponse(404, false, "Categories Not Found.");
    }

    const sortCategories = (categories: Category[]) => {
      categories?.sort((a, b) => a.sortCode.localeCompare(b.sortCode));
      categories?.forEach((category) =>
        sortCategories(category?.subCategories),
      );
    };
    sortCategories(categories);

    if (isCount) {
      categories = categories.filter((i: any) => i.questionCount > 0);
    }
    if (isSub) {
      categories = categories.filter((i: any) => i.subCategories.length > 0);
    }
    return WriteResponse(200, categories, "Categories Found Successfully.");
  }

  async findAllSubCategory(categoryId: string) {
    let query: any = { isdeleted: false };
    if (categoryId) {
      query.parentCategoryId = categoryId;
    }
    const categories = await this.CategoryRepository.find({
      where: query,
    });

    if (categories.length) {
      // Build a map for quick access to categories by id
      return WriteResponse(200, categories, "Categories Found Successfully.");
    }

    return WriteResponse(404, false, "Categories Not Found.");
  }

  //GetOne
  async findOne(field: string = "id", identifier: string) {
     const whereCondition = { isdeleted: false, [field]: identifier };

    // Fetch the specified category
    const category = await this.CategoryRepository.findOne({
      where: whereCondition,
      relations: ['subCategories'],
      
    });

    if (!category) {
      return WriteResponse(404, false, "Category Not Found.");
    }

    // Fetch and nest subcategories recursively
    const nestedCategory = await this.getSubcategories(category);

    return WriteResponse(200, nestedCategory, "Category Found Successfully.");
  }

  // Helper function to fetch subcategories recursively
  private async getSubcategories(category: Category): Promise<Category> {
    // Initialize subCategories array
     category.subCategories = [];

    // Fetch subcategories
    const subcategories = await this.CategoryRepository.find({
      where: { parentCategoryId: category.id, isdeleted: false },
    });

    for (const subcategory of subcategories) {
      // Recursively fetch subcategories for each subcategory
      const nestedSubcategory = await this.getSubcategories(subcategory);
      category.subCategories.push(nestedSubcategory);
    }

    return category;
  }

  async remove(id: string) {
    try {
      const Category = await this.CategoryRepository.findOne({
        where: { id, isdeleted: false },
      });
      if (!Category) {
        return WriteResponse(400, false, "Category Not found.");
      }

      const subCategory = await this.CategoryRepository.findOne({
        where: { parentCategoryId: id, isdeleted: false },
      });
      if (subCategory) {
        return WriteResponse(
          400,
          false,
          "Sorry, you are unable to delete this category because it's attached with another category.",
        );
      }

      const questions = await this.questionRepo.createQueryBuilder("question").
      where("question.isArchive = :isarchive", { isarchive: false }).andWhere("question.categoryId = :catId", { catId: id }).orWhere("question.subCategoryId = :catId", { catId: id })
      .getMany();
      if (questions.length > 0) {
        return WriteResponse(
          400,
          false,
          "Sorry, you are unable to delete this category because it has associated questions.",
        );
      }

      await this.CategoryRepository.update(id, { isdeleted: true });
      return WriteResponse(200, true, "Category deleted successfully.");
    } catch (error) {
      console.error("Error removing category:", error);

      return WriteResponse(
        500,
        false,
        "An error occurred while trying to delete the category.",
      );
    }
  }

  async getSubCategoryByCategoryId(categoryId: string) {
    const categories = await this.CategoryRepository.createQueryBuilder("category")
      .leftJoinAndSelect("category.subquestions", "subquestion", "subquestion.isArchive = false")
      .where("category.isdeleted = :isdeleted", { isdeleted: false })
      .andWhere("category.parentCategoryId = :parentCategoryId", { parentCategoryId: categoryId })
      .andWhere("subquestion.isArchive = :isArchive", { isArchive: false })
      .orderBy("category.sortCode", "ASC")
      .getMany();

    if (categories.length > 0) {
      return WriteResponse(200, categories, "Record Fetched Successfully.");
    } else {
      return WriteResponse(404, true, "Record not found");
    }
  }

}
