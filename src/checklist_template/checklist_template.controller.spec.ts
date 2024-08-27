import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistTemplateController } from './checklist_template.controller';
import { ChecklistTemplateService } from './checklist_template.service';

describe('ChecklistTemplateController', () => {
  let controller: ChecklistTemplateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChecklistTemplateController],
      providers: [ChecklistTemplateService],
    }).compile();

    controller = module.get<ChecklistTemplateController>(ChecklistTemplateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
