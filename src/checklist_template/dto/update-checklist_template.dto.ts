import { PartialType } from '@nestjs/swagger';
import { CreateChecklistTemplateDto } from './create-checklist_template.dto';

export class UpdateChecklistTemplateDto extends PartialType(CreateChecklistTemplateDto) {}
