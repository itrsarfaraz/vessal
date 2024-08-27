import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistTemplateService } from './checklist_template.service';

describe('ChecklistTemplateService', () => {
  let service: ChecklistTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChecklistTemplateService],
    }).compile();

    service = module.get<ChecklistTemplateService>(ChecklistTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
