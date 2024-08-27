import { PartialType } from '@nestjs/mapped-types';
import { CreateInspectionAdditionalInfoDto } from './create-inspection_additional_info.dto';

export class UpdateInspectionAdditionalInfoDto extends PartialType(CreateInspectionAdditionalInfoDto) {}
