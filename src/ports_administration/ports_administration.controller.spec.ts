import { Test, TestingModule } from '@nestjs/testing';
import { PortsAdministrationController } from './ports_administration.controller';
import { PortsAdministrationService } from './ports_administration.service';

describe('PortsAdministrationController', () => {
  let controller: PortsAdministrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortsAdministrationController],
      providers: [PortsAdministrationService],
    }).compile();

    controller = module.get<PortsAdministrationController>(PortsAdministrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
