import {  Module, NestModule } from "@nestjs/common";
import { UserModule } from "./user/user.module";
import { ConfigModule } from "./config.module";
import { FileUploadModule } from "./fileUpload.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "./config.service";
import { MailerModule } from "@nestjs-modules/mailer";
import { JwtModule } from "@nestjs/jwt";
import { AppController } from "./app.controller";
import { VesselModule } from "./vessel/vessel.module";
import { QuestionsModule } from "./questions/questions.module";
import { AuthModule } from "./auth/auth.module"; // Import AuthModule
import { CategoryModule } from "./category/category.module";
import { PortsAdministrationModule } from "./ports_administration/ports_administration.module";
import { ChecklistTemplateModule } from "./checklist_template/checklist_template.module";
import { ManagerModule } from "./manager/manager.module";
import { InspectionModule } from "./inspection/inspection.module";
import { NotificationSettingModule } from "./notification_setting/notification_setting.module";
import { NotificationModule } from "./notification/notification.module";
import { InspectionActionPlanModule } from "./inspection-action-plan/inspection-action-plan.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ReportModule } from "./report/report.module";
import { OverviewModule } from "./overview/overview.module";
import { InspectionAdditionalInfoModule } from "./inspection_additional_info/inspection_additional_info.module";
import { ImportDataModule } from "./import-data/import-data.module";
import { OfflineModule } from "./offline/offline.module";
import typeOrmConfig from "./config/database.config";
import { KeyVaultService } from "./kayvault/KeyVaultService ";
import { KeyVaultModule } from "./kayvault/KeyVaultModule";

@Module({
  imports: [
    ConfigModule, // Add ConfigModule to the imports
    FileUploadModule, // Add FileUploadModule to the imports.
    TypeOrmModule.forRoot(typeOrmConfig),
    KeyVaultModule,
    // TypeOrmModule.forRootAsync({
    //   imports: [KeyVaultModule],
    //   useFactory: async (keyVaultService: KeyVaultService) => {
    //     const username = await keyVaultService.getSecret("PROD-DB-USERNAME");
    //     console.log("username");
    //     const password = await keyVaultService.getSecret("PROD-DB-PASSWORD");
    //     const host = await keyVaultService.getSecret("PROD-DB-HOST");
    //     return {
    //       type: "mysql",
    //       host: host,//process.env.DATABASE_HOST,
    //       port: 3306,
    //       username,
    //       password,
    //       database: process.env.DATABASE_NAME,
    //       entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    //       synchronize: false, // Set to false in production
    //       timezone: "Z",
    //       autoLoadEntities: true,
    //       ssl: true,
    //       logger: "simple-console",
    //       migrations: [__dirname + "/../migrations/*{.ts,.js}"],
    //     };
    //   },
    //   inject: [KeyVaultService],
    // }),
    MailerModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule here as well
      useFactory: (configService: ConfigService) =>
        configService.getMailerConfig(),
      inject: [ConfigService], // Inject ConfigService
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Replace with your own secret key
    }),
    UserModule,
    VesselModule,
    CategoryModule,
    QuestionsModule,
    AuthModule, // Add AuthModule to the imports
    QuestionsModule,
    PortsAdministrationModule,
    ChecklistTemplateModule,
    ManagerModule,
    InspectionModule,
    NotificationSettingModule,
    NotificationModule,
    InspectionActionPlanModule,
    ScheduleModule.forRoot(),
    ReportModule,
    OverviewModule,
    InspectionAdditionalInfoModule,
    ImportDataModule,
    OfflineModule,
  ],
  controllers: [AppController],
})
export class AppModule  {
}
