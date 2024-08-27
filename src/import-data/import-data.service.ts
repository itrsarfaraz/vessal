import { Injectable } from "@nestjs/common";
import * as reader from "xlsx";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "src/category/entities/category.entity";
import { Questions } from "src/questions/entities/question.entity";
import { WriteResponse } from "src/shared/response";
import { PortsAdministration } from "src/ports_administration/entities/ports_administration.entity";

@Injectable()
export class ImportDataService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Questions)
    private readonly questionRepository: Repository<Questions>,
    @InjectRepository(PortsAdministration)
    private readonly portRepo: Repository<PortsAdministration>,
  ) {}

  async importExcel(filePath: string): Promise<any> {
    try {
      const workbook = reader.readFile(filePath);
      const worksheet = workbook.Sheets["Template"]; // Replace with your sheet name
      const data = reader.utils.sheet_to_json(worksheet);
      const results: any[] = [];

      const rows = data.map((row: any) => ({
        category: row["Category"]?.trim() || "",
        categoryDescription: row["Category Description"]?.trim() || "",
        subCategory: row["Sub-Category"]?.trim() || "",
        subCategoryDescription: row["Sub-Cat Description"]?.trim() || "",
        question: row["Question"]?.trim() || "",
        weight: row["Wheight"] ?? null,
        grade: row["Grade"]?.trim().toLowerCase() === "yes",
        comment: row["Comment"]?.trim().toLowerCase() === "yes",
        guidelines: row["Guideline (Optional)"]?.trim() || null,
      }));

      for (const row of rows) {
        const {
          category,
          categoryDescription,
          subCategory,
          subCategoryDescription,
          question,
          weight,
          grade,
          comment,
          guidelines,
        } = row;

        const categoryEntity = await this.ensureCategory(
          category,
          categoryDescription,
        );
        const subCategoryEntity = await this.ensureCategory(
          subCategory,
          subCategoryDescription,
          categoryEntity.id,
        );

        if (categoryEntity?.id && subCategoryEntity?.id) {
          const lastRecord = await this.questionRepository.find({
            order: { uniqueId: 'DESC' },
            where:{subCategoryId:subCategoryEntity?.id, isArchive: false},
            take: 1
          });
          let newUniqueId = 1;
          if (lastRecord.length > 0 && lastRecord[0].uniqueId) {
            const lastUniqueIdNumber = lastRecord[0].uniqueId;
            newUniqueId = lastUniqueIdNumber + 1;
          }
          const payload = {
            question,
            weight,
            grade,
            comment,
            guidelines: guidelines,
            categoryId: categoryEntity.id,
            subCategoryId: subCategoryEntity.id,
            uniqueId:newUniqueId
          };
          const questionEntity = await this.questionRepository.save(payload);
          results.push({
            category: {
              name: categoryEntity.categoryName,
              description: categoryEntity.description,
              sortCode: categoryEntity.sortCode,
            },
            subCategory: {
              name: subCategoryEntity.categoryName,
              description: subCategoryEntity.description,
              sortCode: subCategoryEntity.sortCode,
            },
            question: questionEntity,
          });
        }
      }

      return WriteResponse(200, results);
    } catch (error) {
      console.error(`Error importing Excel file:`, error);
      throw error;
    }
  }

  async ensureCategory(
    categoryName: string,
    description: string,
    parentId?: string,
  ) {
    const lowerCategoryName = categoryName.toLowerCase().trim();

    if (lowerCategoryName) {
      let where = "category.parentCategoryId IS NULL";
      if (parentId) {
        where = `category.parentCategoryId = '${parentId}'`;
      }
      const categoryPromise = await this.categoryRepository
        .createQueryBuilder("category")
        .where("LOWER(category.categoryName) = :lowerCategoryName", {
          lowerCategoryName,
        })
        .andWhere("category.isdeleted = false")
        .andWhere(where)
        .getOne();

      if (categoryPromise) {
        return categoryPromise;
      }
      let query: any = { isdeleted: false, parentCategoryId: null };
      let parent = null;
      if (parentId) {
        query.parentCategoryId = parentId;
        parent = await this.categoryRepository.findOne({
          where: { id: parentId, isdeleted: false },
        });
      }
      let lastCategory = await this.categoryRepository.find({
        where: query,
        order: { sortCode: "DESC" },
        take: 1,
      });
      let nextSortCode = "";
      if (parentId) {
        nextSortCode =
          lastCategory.length > 0
            ? parent.sortCode +
              Number(Number(lastCategory[0]?.sortCode.split("")[1]) + 1)
            : parent.sortCode + "1";
      } else {
        nextSortCode = lastCategory?.[0]
          ? String.fromCharCode(lastCategory?.[0]?.sortCode?.charCodeAt(0) + 1)
          : "A";
      }

      const newCategory = await this.categoryRepository.save({
        categoryName: categoryName.trim(),
        description: description.trim(),
        sortCode: nextSortCode,
        parentCategoryId: parentId || null,
      });
      return newCategory;
    }
  }

  nextAlphabeticalSortCode(lastSortCode: string): string {
    let result = "";
    let carry = true;

    for (let i = lastSortCode.length - 1; i >= 0; i--) {
      let char = lastSortCode[i];
      if (carry) {
        if (char === "Z") {
          char = "A";
          carry = true;
        } else {
          char = String.fromCharCode(char.charCodeAt(0) + 1);
          carry = false;
        }
      }
      result = char + result;
    }

    if (carry) {
      result = "a" + result;
    }

    return result.padStart(3, "a");
  }

  async importPort(filePath: string) {
    try {
      const workbook = reader.readFile(filePath);
      const worksheet = workbook.Sheets["Sheet1"]; // Replace with your sheet name
      const data = reader.utils.sheet_to_json(worksheet);
      const rows = data.map((row: any) => ({
        name: row["portName"],
        latitude: row["latitude"],
        longitude: row["longitude"],
        countryCode: row["countryUNLoCode"],
        countryName: row["countryName"],
        portNo: row["portUNLoCode"],
      }));
      let result = [];

      for (let row of rows) {
        const lowerName = row.name?.toLowerCase();
        const port = await this.portRepo
          .createQueryBuilder("f")
          .where("lower(f.name) = :lowerName", { lowerName: lowerName }).getOne();
        if (!port) {
          const ports = await this.portRepo.save(rows);
          result.push(ports);
        }
      }

      return WriteResponse(200, result);
    } catch (error) {
      console.error(`Error importing Port data:`, error);
      throw error;
    }
  }
}


