import { HttpException } from '@nestjs/common';

export const WriteResponse = (
  statusCode: number,
  data: any = {},
  message: string = null,
) => {
  if (statusCode == 200) {
    return { statusCode, message: message ? message : 'Success', data };
  } else if (statusCode == 400) {
    return {
      statusCode,
      message: message ? message : "Record Not Found.",
      data,
    };
  } else if (statusCode == 500) {
    return { statusCode, message: message ? message: 'Internal server error' };
  } else if (statusCode == 404) {
    return { statusCode, message: message ? message : "Record Not Found." };
  } else if (statusCode == 403) {
    return {
      statusCode,
      message: message ? message : "Already Exists.",
      data,
    };
  } else {
    return { statusCode, message };
  }
};

export const paginateResponse = (list: any, count: number,total?:number): any => {
  return {
    statusCode: list.length ? 200 : 400,
    message: list.length ? 'Success' : 'Record not found.',
    data: list,total,
    count,
  }
};
