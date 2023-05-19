import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.use(json({ limit: '50mb' }));
  app.useGlobalPipes(new ValidationPipe());
  /**
   * https://fetch.spec.whatwg.org/#example-cors-with-credentials
   */
  app.enableCors({
    credentials: true,
    origin: ['http://127.0.0.1:8001', 'http://127.0.0.1:3001'],
  });
  await app.listen(8000);
}
bootstrap();
