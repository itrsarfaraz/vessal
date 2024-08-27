import { PartialType } from '@nestjs/swagger';
import { CreateInspectionActionPlanDto } from './create-inspection-action-plan.dto';

export class UpdateInspectionActionPlanDto extends PartialType(CreateInspectionActionPlanDto) {}
