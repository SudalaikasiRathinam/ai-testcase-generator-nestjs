import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

   // Enable CORS for all origins (not recommended for production without restriction)
   app.enableCors({
    origin: '*', // You can replace '*' with specific domains like 'http://localhost:3000'
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Test Case Generator')
    .setDescription('API that generates test cases from user stories using AI')
    .setVersion('1.0')
    .addTag('AI')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // Swagger at /api

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
