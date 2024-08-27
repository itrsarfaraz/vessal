import { PartialType } from '@nestjs/mapped-types';
import { CreatePortsAdministrationDto } from './create-ports_administration.dto';

export class UpdatePortsAdministrationDto extends PartialType(CreatePortsAdministrationDto) {}
