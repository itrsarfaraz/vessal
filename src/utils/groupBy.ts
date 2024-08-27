import { BadRequestException } from "@nestjs/common";
import { GradeEnum } from "src/shared/enum/gradeEnum";

export function groupBy(array: any[], key: string) {
    if(!Array.isArray(array))  {
         return []
    }
    return array.reduce((result, currentValue) => {
      const groupKey = currentValue[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(currentValue);
      return result;
    }, {});
}

export function formatDate(date: Date): string {
    // Check if date is invalid
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return ""; // Return empty string for invalid dates
    }
  
    // Format the date
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  
    return formattedDate; // Return formatted date
}


// Determine average and corresponding text based on rating scale
export function getAverageWithText(average) {
  let text = "N/A"; // Default text

  if (average == 1 || (average > 0 && average <= 1)) {
    text = "1 - Unacceptable";
  } else if (average == 2 || (average > 1 && average <= 2)) {
    text = "2 - Poor";
  } else if (average == 3 || (average > 2 && average <= 3)) {
    text = "3 - Average";
  } else if (average == 4 || (average > 3 && average <= 4)) {
    text = "4 - Fair";
  } else if (average == 5 || (average > 4 && average <= 5)) {
    text = "5 - Satisfactory";
  } else if (average == 6 || (average > 5 && average <= 6)) {
    text = "6 - Excellent";
  }

  return text;
}

export function getAverageWithTextForExel(average) {
  let text = "N/A"; // Default text

  if (average == 1 || (average > 0 && average <= 1)) {
    text = "Unacceptable - 1";
  } else if (average == 2 || (average > 1 && average <= 2)) {
    text = "Poor - 2";
  } else if (average == 3 || (average > 2 && average <= 3)) {
    text = "Average - 3";
  } else if (average == 4 || (average > 3 && average <= 4)) {
    text = "Fair - 4";
  } else if (average == 5 || (average > 4 && average <= 5)) {
    text = "Satisfactory - 5";
  } else if (average == 6 || (average > 5 && average <= 6)) {
    text = "Excellent - 6";
  }

  return text;
}
export function getAverageText(average) {
  let text = "N/A"; // Default text

  if (average === 1 || (average > 0 && average <= 1)) {
    text = "Unacceptable";
  } else if (average === 2 || (average > 1 && average <= 2)) {
    text = "Poor";
  } else if (average === 3 || (average > 2 && average <= 3)) {
    text = "Average";
  } else if (average === 4 || (average > 3 && average <= 4)) {
    text = "Fair";
  } else if (average === 5 || (average > 4 && average <= 5)) {
    text = "Satisfactory";
  } else if (average === 6 || (average > 5 && average <= 6)) {
    text = "Excellent";
  }

  return text;
}


export function getAverageColor(average) {
  let color = ""; // Default color

  if (average > 0 && average <= 1.4) {
    color = "8c151c"; // Red for Poor  
  } else if (average > 1.4 && average <= 2.4) {
    color = "f26c49"; // Red for Poor
  } else if (average > 2.4 && average <= 3.4) {
    color = "f4af1a"; // Haldi color for Average
  } else if (average > 3.4 && average <= 4.4) {
    color = "f5dd0b"; // Yellow for Satisfactory
  } else if (average > 4.4 && average <= 5.4) {
    color = "b6d993"; // Light green for Good
  } else if (average > 5.4) {
    color = "3f9744"; // Green for Excellent
  }
  
  return color;
}


export function getAverageFontColor(average: any): string {
  let fontColor = ""; // Default font color

  if (average > 0 && average <= 1.4) {
    fontColor = "#f9e4e4"; // Font color for Unacceptable
  } else if (average > 1.4 && average <= 2.4) {
    fontColor = "#66130b"; // Font color for Poor
  } else if (average > 2.4 && average <= 3.4) {
    fontColor = "#7e5722"; // Font color for Average
  } else if (average > 3.4 && average <= 4.4) {
    fontColor = "#80712c"; // Font color for Fair
  } else if (average > 4.4 && average <= 5.4) {
    fontColor = "#407c3a"; // Font color for Satisfactory
  } else if (average > 5.4) {
    fontColor = "#d9e9b3"; // Font color for Excellent
  }

  return fontColor;
}


export function imageFileFilter(req, file, cb) {
  // Check if the file is an image
  // if (!file.mimetype?.startsWith('image/')) {
  //   return cb(new BadRequestException('Only image files are allowed!'), false);
  // }

  // Check for specific image formats to exclude
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', "application/octet-stream"];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new BadRequestException('Only JPEG, PNG, and JPG files are allowed!'), false);
  }

  cb(null, true);
}

export function pdfFileFilter(req, file, cb) {
  // Check for specific PDF MIME type
  const allowedMimeTypes = ['application/pdf'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new BadRequestException('Only PDF files are allowed!'), false);
  }

  cb(null, true);
}


export const GradeColorMapping: { [key in keyof typeof GradeEnum]: string } = {
  Unacceptable: "8c151c",
  Poor: "f26c49",
  Average: "f4af1a",
  Fair: "f5dd0b",
  Satisfactory: "b6d993",
  Excellent: "3f9744"
};

export const GradeFontColor: { [key in keyof typeof GradeEnum]: string } = {
  Unacceptable: "#66130b",
  Poor: "#7e5722",
  Average: "#80712c",
  Fair: "#407c3a",
  Satisfactory: "#d9e9b3",
  Excellent: "#3f9744"
};

  
  
  