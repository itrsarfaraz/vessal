import { Test, TestingModule } from '@nestjs/testing';
import { InspectionActionPlanController } from './inspection-action-plan.controller';
import { InspectionActionPlanService } from './inspection-action-plan.service';
import { CreateInspectionActionPlanDto } from './dto/create-inspection-action-plan.dto';

describe('InspectionActionPlanController', () => {
  let controller: InspectionActionPlanController;
  let service: InspectionActionPlanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionActionPlanController],
      providers: [
        {
          provide: InspectionActionPlanService,
          useValue: {
            saveInspectionActionPlan: jest.fn(),
            getInspectionActionPlan: jest.fn(),
            getInspectionActionPlansByQuestionId: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InspectionActionPlanController>(InspectionActionPlanController);
    service = module.get<InspectionActionPlanService>(InspectionActionPlanService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('saveInspectionActionPlan', () => {
    it('should save an inspection action plan', async () => {
      const dto: CreateInspectionActionPlanDto = {
        inspectionQuestionId: 1,
        comment: 'Test comment',
        dueDate: new Date(),
        completionPercent: 0,
        tpManagerId: 1,
        images: [],
      };
      const files = { images: [] as any[] };
      const result = { statusCode: 200, message: 'Inspection Action Plan saved successfully', data: dto };

      jest.spyOn(service, 'saveInspectionActionPlan').mockResolvedValue(result);

      expect(await controller.saveInspectionActionPlan(dto, files)).toEqual(result);
      expect(service.saveInspectionActionPlan).toHaveBeenCalledWith(dto, files.images);
    });
  });

  describe('getInspectionActionPlan', () => {
    it('should return an inspection action plan', async () => {
      const id = 'uuid';
      const result = { statusCode: 200, message: 'Inspection Action Plan retrieved successfully', data: {} };

      jest.spyOn(service, 'getInspectionActionPlan').mockResolvedValue(result);

      expect(await controller.getInspectionActionPlan(id)).toEqual(result);
      expect(service.getInspectionActionPlan).toHaveBeenCalledWith(id);
    });
  });

  describe('getInspectionActionPlansByQuestionId', () => {
    it('should return inspection action plans', async () => {
      const inspectionQuestionId = 1;
      const result = { statusCode: 200, message: 'Inspection Action Plans retrieved successfully', data: [] };

      jest.spyOn(service, 'getInspectionActionPlansByQuestionId').mockResolvedValue(result);

      expect(await controller.getInspectionActionPlansByQuestionId(inspectionQuestionId)).toEqual(result);
      expect(service.getInspectionActionPlansByQuestionId).toHaveBeenCalledWith(inspectionQuestionId);
    });
  });
});
