import { Test, TestingModule } from '@nestjs/testing';
import { InspectionAdditionalInfoController } from './inspection_additional_info.controller';
import { InspectionAdditionalInfoService } from './inspection_additional_info.service';

describe('InspectionAdditionalInfoController', () => {
  let controller: InspectionAdditionalInfoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionAdditionalInfoController],
      providers: [InspectionAdditionalInfoService],
    }).compile();

    controller = module.get<InspectionAdditionalInfoController>(InspectionAdditionalInfoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
