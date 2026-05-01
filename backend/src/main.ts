import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('corsOrigin'),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });
  const port = config.get<number>('port') ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Warhammer 40k Backend running on http://localhost:${port}/api`);
}
bootstrap();
