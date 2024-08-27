import { PartialType } from '@nestjs/mapped-types';
import { CreateOverviewDto } from './create-overview.dto';

export class UpdateOverviewDto extends PartialType(CreateOverviewDto) {}
