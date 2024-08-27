import { KeyVaultService } from '../kayvault/KeyVaultService '; // Adjust the path as necessary
import {  DataSource, DataSourceOptions} from "typeorm";
import * as dotenv from 'dotenv';
dotenv.config();
export const dataSourceOptions: DataSourceOptions = {
      type: "mysql",
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      name: "default",
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      synchronize: false, // Set to false for production
      timezone: 'Z',
      ssl: true,
      migrationsTableName: 'migrations_done',
};


const dataSource = new DataSource(dataSourceOptions);

export default dataSource;


// we are enable keyvalut in production after configure keyvalut on azure

// export const createDataSourceOptions = async (): Promise<DataSourceOptions> => {
//   const keyVaultService = new KeyVaultService();

//   const host = await keyVaultService.getSecret('PROD-DB-HOST');
//   const port = parseInt(await keyVaultService.getSecret('DATABASE_PORT'), 10);
//   const username = await keyVaultService.getSecret('DATABASE_USERNAME');
//   const password = await keyVaultService.getSecret('DATABASE_PASSWORD');
//   const database = await keyVaultService.getSecret('DATABASE_NAME');

//   return {
//     type: 'mysql',
//     host,
//     port,
//     name: 'default',
//     username,
//     password,
//     database,
//     entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//     migrations: [__dirname + '/../migrations/*{.ts,.js}'],
//     synchronize: false, // Set to false for production
//     timezone: 'Z',
//     ssl: true,
//     migrationsTableName: 'migrations_done',
//   };
// };

// const initializeDataSource = async (): Promise<DataSource> => {
//   const dataSourceOptions = await createDataSourceOptions();
//   const dataSource = new DataSource(dataSourceOptions);
//   return dataSource.initialize(); // Ensure the data source is initialized before use
// };

// export default initializeDataSource;


