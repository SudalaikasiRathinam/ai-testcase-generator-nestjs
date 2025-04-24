import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService, TestCase } from './app.service';
import { GenerateTestCasesDto } from './dto/generate-testcases.dto';

@ApiTags('AI')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('testcases')
  @ApiOperation({ summary: 'Generate test cases from user story' })
  @ApiResponse({
    status: 200,
    description: 'List of generated test cases',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
          description: { type: 'string' },
          expectedResult: { type: 'string' },
        },
      },
    },
  })
  async generateTestCases(
    @Body() dto: GenerateTestCasesDto,
  ): Promise<TestCase[]> {
    return this.appService.generateTestCases(dto.userStory);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a document to extract user stories' })
  @ApiResponse({
    status: 200,
    description: 'Extracted user stories in a structured format',
    schema: {
      type: 'object',
      properties: {
        extracted: { type: 'string', description: 'Extracted user stories in JSON format' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const filename = `${Date.now()}-${file.originalname}`;
          cb(null, filename);
        },
      }),
    }),
  )
  async uploadAndExtract(@UploadedFile() file: Express.Multer.File) {
    return this.appService.extractUserStories(file.path);
  }
}
