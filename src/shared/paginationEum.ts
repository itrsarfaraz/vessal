import { IsNotEmpty } from 'class-validator';

export class IPagination {
  @IsNotEmpty()
  curPage: number;
  @IsNotEmpty()
  perPage: number;
  search: string;
  group_type: string;
  sortBy: string;
  direction?: string;
  whereClause: any;
}
export class IPaginationReport {
  @IsNotEmpty()
  curPage: 1;
  @IsNotEmpty()
  perPage: 1000;
  search: string;
  sortBy: string;
  direction?: string;
  whereClause: any;
}

export const IPaginationSwagger = {
  curPage: { type: 'number', default: 1 },
  perPage: { type: 'number', default: 10 },
  sortBy: { type: 'string', default: 'created_on' },
  direction: { type: 'enum', enum: ['ASC', 'DESC'], default: 'desc' },
  whereClause: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
        operator: { type: 'string' },
      },
    },
  },
};
