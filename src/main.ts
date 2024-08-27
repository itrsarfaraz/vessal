
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ValidationFilter } from './exception/validation-exception.filter';
import * as express from 'express';
import * as path from 'path';
import * as passport from 'passport';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';
import { KeyVaultService } from './kayvault/KeyVaultService '; 


async function bootstrap() {
  const app = await NestFactory.create<any>(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization,Custom-Header,Organization_id,userModuleRole',
  });
  // app.use(helmet());
  app.use(compression());

  app.use(express.json({ limit: '1000mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1000mb' }));

  
  app.setGlobalPrefix('api');
  app.use("/api",express.static(join(__dirname, "public"))); //For Local
  
  app.use(express.static(path.join(__dirname, 'client')));
  app.use(
    session({
      secret: 'vessel',
      rolling: true,
      cookie: {
        maxAge: 60 * 60 * 60 * 1000,
        secure: true,
        sameSite: 'none',
      },
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.set('trust proxy', true);

  //create swagger ui
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      stopAtFirstError: true,
      skipMissingProperties: false,
      skipNullProperties: true,

      exceptionFactory: ValidationFilter,
    }),
  );

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('vesselInspection')
    .setDescription('The vesselInspection API')
    .setVersion('1.0')
    .addTag('vesselInspection')
    .build();


  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/swagger', app, document, {
    customSiteTitle: 'vesselInspection',
  });

  // Serve index.html if the URL does not contain '/api'
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'client', 'index.html'));
    } else {
      next();
    }
  });


  await app.listen(process.env.PORT || 3000);


  // we are enable keyvalut in production after configure keyvalut on azure

  // const keyVaultService = new KeyVaultService();
  // const port = parseInt(await keyVaultService.getSecret('PORT'), 10) || 3000;

  // await app.listen(port);
}
bootstrap();


