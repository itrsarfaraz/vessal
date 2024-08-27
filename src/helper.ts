import { extname, basename } from 'path';
import * as fs from 'fs';
import { uuid } from 'uuidv4';

let uploadedFilePath: string;
export const editFileName = (req, logo_file, callback) => {
  
  var extension = extname(logo_file.originalname);
  // uploadedFilePath = `${orgname}_${randomName}${extension}`;
    extension = ".jpg";
  callback(null, `${uuid()}${extension}`);
};
export const editFileNameEmployee = (req, file, callback) => {
  
  var extension = extname(file.originalname);
  

  

  extension = ".jpg";
  const organization_id = req.query.orgId;
  
  callback(null, `${organization_id}${extension}`);
};
export const editFileNameUser = (req, file, callback) => {

  var extension = extname(file.originalname);
 
  extension = ".jpg";
  // uploadedFilePath = `${orgname}_${randomName}${extension}`;
  callback(null, `${req.user.id}${extension}`);
  // callback(null, `${req.user.users?.[0].id}${extension}`); image name of user id
};
export const getUploadedFilePath = () => uploadedFilePath;
export const PaginationQuery = (field): any => {
  var filters = {};
  field.map((i) => {
    if (i.value != null && i.value != undefined) {
      switch (i.operator) {
        case 'IN':
          const lvalue = i.value.split(' ');

          filters[i.key] = lvalue;
          break;
        case 'LIKE':
          i.value = i.value != null ? `%${i.value}%` : '';
          filters[i.key] = i.value;
          break;
        default:
          filters[i.key] = i.value;
          break;
      }
    }
  });
  return filters;
};
export const checkFileSize = (size: number) => {
  return size > 5000000;
};
export function validateImageFile(file: Express.Multer.File): boolean {
  if (!file) {
    return false; // No file provided
  }
  const allowedExtensions = [
    'jpg',
    'jpeg',
    'png',
    'bmp',
    'tif',
    'tiff',
    'svg',
    'swf',
    'gif',
    'eps',
    'PSD',
    'RAW',
    'HEIF',
    'AVIF',

  ];
  const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return false; // Invalid file extension
  }
  return true;
}
export const deletefile = (path) => {
  let filepath = './upload/' + `${path}`;
  fs.unlink(filepath, (err) => {
    if (err) {
     
      return;
    }
   
  });
};


export function getQuarter(date) {
  if (!(date instanceof Date)) {
    throw new Error(
      "Invalid date format. Please provide a valid Date object.",
    );
  }

  const month = date.getMonth();

  if (month >= 0 && month <= 2) {
    return "Q1"; // January, February, March
  } else if (month >= 3 && month <= 5) {
    return "Q2"; // April, May, June
  } else if (month >= 6 && month <= 8) {
    return "Q3"; // July, August, September
  } else {
    return "Q4"; // October, November, December
  }
}

export function getQuarterFromDateISOString(isoString) {
  if (!isoString) {
    return "-";
  }
  const date = new Date(isoString);
  return getQuarter(date);
}


