import { Test, TestingModule } from '@nestjs/testing';
import { InspectionAdditionalInfoService } from './inspection_additional_info.service';

describe('InspectionAdditionalInfoService', () => {
  let service: InspectionAdditionalInfoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InspectionAdditionalInfoService],
    }).compile();

    service = module.get<InspectionAdditionalInfoService>(InspectionAdditionalInfoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
