import { KeyVaultService } from '../kayvault/KeyVaultService '; // Adjust the path as necessary
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

const env = process.env.NODE_ENV || 'dev';
const envFilePath = `.env.${env}`;

dotenv.config({
  debug: true,
  path: envFilePath
});


const typeOrmConfig: TypeOrmModuleOptions = {
    type: process.env.DATABASE_TYPE as any,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    name: "default",
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false, // Set to false for production
    timezone: 'Z',
    autoLoadEntities: true,
    ssl: true,
    // logger: 'simple-console',
    // // logging: true,
    // loggerLevel: "info",
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
   
  };

export default typeOrmConfig;


// we are enable keyvalut in production after configure keyvalut on azure

// export const getTypeOrmConfig = async (): Promise<TypeOrmModuleOptions> => {
//   const keyVaultService = new KeyVaultService();

//   const type = await keyVaultService.getSecret('PROD-DB-TYPE') as any;
//   const host = await keyVaultService.getSecret('PROD-DB-HOST');
//   const port = parseInt(await keyVaultService.getSecret('PROD-DB-PORT'), 10);
//   const username = await keyVaultService.getSecret('PROD-DB-USERNAME');
//   const password = await keyVaultService.getSecret('PROD-DB-PASSWORD');
//   const database = await keyVaultService.getSecret('PROD-DB-DATABASE_NAME');

//   return {
//     type,
//     host,
//     port,
//     name: "default",
//     username,
//     password,
//     database,
//     entities: [__dirname + '/**/*.entity{.ts,.js}'],
//     synchronize: false, // Set to false for production
//     timezone: 'Z',
//     autoLoadEntities: true,
//     ssl: true,
//     logger: 'simple-console',
//     loggerLevel: "info",
//     migrations: [__dirname + '/../migrations/*{.ts,.js}'],
//   };
// };


