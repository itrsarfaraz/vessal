import { Test, TestingModule } from '@nestjs/testing';
import { PortsAdministrationService } from './ports_administration.service';

describe('PortsAdministrationService', () => {
  let service: PortsAdministrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortsAdministrationService],
    }).compile();

    service = module.get<PortsAdministrationService>(PortsAdministrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
