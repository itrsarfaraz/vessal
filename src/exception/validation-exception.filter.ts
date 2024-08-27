import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';

export const ValidationFilter = (error) => {
  let errors = '';
  error.forEach((i) => {
    if (i.children.length) {
      i.children.forEach((d) => {
        if (d.constraints) {
          errors = Object.values(d.constraints).join(',');
        }
      });
    }
    if (i.constraints) {
      errors = Object.values(i.constraints).join(',');
    }
  });
  throw new HttpException({
    statusCode: HttpStatus.BAD_REQUEST,
    message: Array.isArray(errors) ? errors.join(', ') : errors,
}, HttpStatus.OK);
};
