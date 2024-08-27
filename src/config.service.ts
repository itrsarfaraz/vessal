import { MailerOptions } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import typeOrmConfig from './config/database.config';
import { KeyVaultService } from './kayvault/KeyVaultService ';


@Injectable()
export class ConfigService {
  constructor(private readonly keyVaultService: KeyVaultService) {}

  getTypeOrmConfig(): TypeOrmModuleOptions {
    return typeOrmConfig
  }

  getMailerConfig(): MailerOptions {
    return {
      transport: {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT, 10),
        ignoreTLS: process.env.MAIL_IGNORE_TLS === 'true',
        secure: process.env.MAIL_SECURE === 'true',
        service: process.env.MAIL_SERVICE,
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD,
        },
      },
      defaults: {
        from: process.env.MAIL_FROM,
      },
    };
  }


  // we are enable keyvalut in production after configure keyvalut on azure service

  // async getMailerConfig(): Promise<MailerOptions> {
  //   return {
  //     transport: {
  //       host: await this.keyVaultService.getSecret('PROD-DB-MAIL_HOST'),
  //       port: parseInt(await this.keyVaultService.getSecret('PROD-DB-MAIL_PORT'), 10),
  //       ignoreTLS: (await this.keyVaultService.getSecret('PROD-DB-MAIL_IGNORE_TLS')) === 'true',
  //       secure: (await this.keyVaultService.getSecret('PROD-DB-MAIL_SECURE')) === 'true',
  //       service: await this.keyVaultService.getSecret('PROD-DB-MAIL_SERVICE'),
  //       auth: {
  //         user: await this.keyVaultService.getSecret('PROD-DB-MAIL_USERNAME'),
  //         pass: await this.keyVaultService.getSecret('PROD-DB-MAIL_PASSWORD'),
  //       },
  //     },
  //     defaults: {
  //       from: await this.keyVaultService.getSecret('PROD-DB-MAIL_FROM'),
  //     },
  //   };
  // }
}
