import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';




export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  CLOSED = "CLOSED",
}
export enum UserInfoType {
  EMAIL = "EMAIL",
  PHONE = "PHONE",
}

export class EditEmailMobileDto {
  @ApiProperty()
  type: string 


  @ApiProperty()
  label: string;
  
  @ApiProperty()
  field_value: string;
  
  @ApiProperty()
  country_code: string;
}

export class CreateUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  @IsString()
  @Length(3, 50)
  @Matches(/^[A-Za-z_.-]+(?: [A-Za-z_.-]+)*$/, { message: 'Invalid full name format.' })
  fullName: string;


  @ApiProperty()
  @IsString()
  @Length(3, 255)
  address: string;

  @ApiProperty()
  @IsEmail()
  @Matches(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/, { message: 'Invalid email format.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  profilePicture: string;


  @ApiProperty()
  role: string;

  @ApiProperty({type: [EditEmailMobileDto]})
  user_info: EditEmailMobileDto[];

  @ApiProperty({example: ["550e8400-e29b-41d4-a716-446655440001", "6a72a3c0-7027-422c-a41e-c802f810362d"]})
  companies: string;

  @ApiProperty({example: ["550e8400-e29b-41d4-a716-446655440001", "6a72a3c0-7027-422c-a41e-c802f810362d"]})
  vessels: string;

  @ApiProperty()
  notes: string;
}

export class MobileLoginDto {
   @ApiProperty()
   email: string;
   @ApiProperty()
   name: string;
}




export class EditUserDto {
  @ApiProperty({ type: CreateUserDto })
  data: CreateUserDto;

  @ApiProperty({ type: 'string', format: 'binary' })
  image_file: any; // Include this field for file upload
}

export class UpdateUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  @IsString()
  @Length(3, 50)
  firstname: string;

  @ApiProperty()
  @IsString()
  @Length(3, 50)
  lastname: string;

  @ApiProperty()
  @IsNotEmpty()
  @Matches(/^[0-9]{8,14}$/, { message: 'Mobile number should be between 8 to 14 digits' })
  mobileNo: string;
}

export class SocialLoginDto {
  @ApiProperty()
  @IsString()
  firstname: string;

  @ApiProperty()
  @IsString()
  lastname: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  ssoId: string;

  @ApiProperty()
  @IsString()
  provider: string;
}

export class LoginDTO {
  @IsEmail()
  @ApiProperty()
  @Matches(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/, { message: 'Email must be an email address.' })
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @ApiProperty()
  password: string;

  @ApiProperty()
  organization_name: string;

  @ApiProperty()
  organization_code: string;
}

export class ResetPassDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Required a strong password (one upper, one special, one number)',
  })
  @Length(8)
  new_password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ type: 'string', description: 'Please enter old password.', required: true })
  oldPassword: string;

  @ApiProperty({ type: 'string', description: 'Please enter new password.', required: true })
  @Length(8)
  newPassword: string;
}

export class ForgetPassword {
  @IsEmail()
  @ApiProperty()
  @Matches(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/, { message: 'Email must be an email address.' })
  @IsNotEmpty()
  email: string;
}

export class VerifyDto {
  @IsEmail()
  @ApiProperty()
  @Matches(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/, { message: 'Email must be an email address.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  otp: string;
}


export class UpdateProfileImageDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  @IsNotEmpty()
  file: any; // Placeholder, actual validation will be on controller level
}
