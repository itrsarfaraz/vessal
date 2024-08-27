import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionActionPlanService } from './inspection-action-plan.service';
import { InspectionActionPlan } from './entities/inspection-action-plan.entity';
import { InspectionActionPlanImages } from './entities/inspection-action-plan.entity'; 
import { CreateInspectionActionPlanDto } from './dto/create-inspection-action-plan.dto';

describe('InspectionActionPlanService', () => {
  let service: InspectionActionPlanService;
  let inspectionActionPlanRepository: Repository<InspectionActionPlan>;
  let inspectionActionPlanImagesRepository: Repository<InspectionActionPlanImages>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionActionPlanService,
        {
          provide: getRepositoryToken(InspectionActionPlan),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(InspectionActionPlanImages),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<InspectionActionPlanService>(InspectionActionPlanService);
    inspectionActionPlanRepository = module.get<Repository<InspectionActionPlan>>(getRepositoryToken(InspectionActionPlan));
    inspectionActionPlanImagesRepository = module.get<Repository<InspectionActionPlanImages>>(getRepositoryToken(InspectionActionPlanImages));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveInspectionActionPlan', () => {
    it('should save a new inspection action plan', async () => {
      const dto: CreateInspectionActionPlanDto = {
        inspectionQuestionId: 1,
        comment: 'Test comment',
        dueDate: new Date(),
        completionPercent: 0,
        tpManagerId: 1,
        images: [],
      };

      const inspectionActionPlan = { 
        ...dto, 
        id: 'uuid',
        createdOn: new Date(),
        updatedOn: new Date()
      };
      
      jest.spyOn(inspectionActionPlanRepository, 'create').mockReturnValue(inspectionActionPlan as any);
      jest.spyOn(inspectionActionPlanRepository, 'save').mockResolvedValue(inspectionActionPlan as any);

      const result = await service.saveInspectionActionPlan(dto, []);
      expect(result.data).toEqual(inspectionActionPlan);
    });

    it('should update an existing inspection action plan', async () => {
      const dto: CreateInspectionActionPlanDto = {
        id: "0044f9a7-5120-4b20-87d9-e6fb944904e9",
        inspectionQuestionId: 1,
        comment: 'Updated comment',
        dueDate: new Date(),
        completionPercent: 50,
        tpManagerId: 1,
        images: [],
      };

      const existingInspectionActionPlan = { 
        ...dto,
        createdOn: new Date(),
        updatedOn: new Date()
      };

      jest.spyOn(inspectionActionPlanRepository, 'findOne').mockResolvedValue(existingInspectionActionPlan as any);
      jest.spyOn(inspectionActionPlanRepository, 'update').mockResolvedValue(existingInspectionActionPlan as any);

      const result = await service.saveInspectionActionPlan(dto, []);
      expect(result.data).toEqual(existingInspectionActionPlan);
    });
  });

  describe('getInspectionActionPlan', () => {
    it('should return an inspection action plan', async () => {
      const id = 'uuid';
      const inspectionActionPlan = { 
        id, 
        inspectionQuestionId: 1, 
        comment: 'Test comment', 
        dueDate: new Date(), 
        completionPercent: 0, 
        tpManagerId: 1, 
        createdOn: new Date(),
        updatedOn: new Date(),
        images: [] 
      };

      jest.spyOn(inspectionActionPlanRepository, 'findOne').mockResolvedValue(inspectionActionPlan as any);

      const result = await service.getInspectionActionPlan(id);
      expect(result.data).toEqual(inspectionActionPlan);
    });

    it('should return a 404 if the inspection action plan does not exist', async () => {
      const id = 'non-existent-uuid';

      jest.spyOn(inspectionActionPlanRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getInspectionActionPlan(id);
      expect(result.statusCode).toBe(404);
    });
  });

  describe('getInspectionActionPlansByQuestionId', () => {
    it('should return inspection action plans', async () => {
      const inspectionQuestionId = 1;
      const inspectionActionPlans = [{ 
        id: 'uuid', 
        inspectionQuestionId, 
        comment: 'Test comment', 
        dueDate: new Date(), 
        completionPercent: 0, 
        tpManagerId: 1, 
        createdOn: new Date(),
        updatedOn: new Date(),
        images: [] 
      }];

      jest.spyOn(inspectionActionPlanRepository, 'find').mockResolvedValue(inspectionActionPlans as any);

      const result = await service.getInspectionActionPlansByQuestionId(inspectionQuestionId);
      expect(result.data).toEqual(inspectionActionPlans);
    });

    it('should return a 404 if no inspection action plans are found', async () => {
      const inspectionQuestionId = 1;

      jest.spyOn(inspectionActionPlanRepository, 'find').mockResolvedValue([]);

      const result = await service.getInspectionActionPlansByQuestionId(inspectionQuestionId);
      expect(result.statusCode).toBe(404);
    });
  });
});
