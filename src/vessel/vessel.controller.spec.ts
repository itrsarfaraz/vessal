import { Test, TestingModule } from '@nestjs/testing';
import { VesselController } from './vessel.controller';
import { VesselService } from './vessel.service';

describe('VesselController', () => {
  let controller: VesselController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VesselController],
      providers: [VesselService],
    }).compile();

    controller = module.get<VesselController>(VesselController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
