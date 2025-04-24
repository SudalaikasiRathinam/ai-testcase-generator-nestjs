import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GenerateTestCasesDto {
  @ApiProperty({
    description: 'User story to generate test cases for',
    example: 'As a user, I want to reset my password so I can regain access to my account.',
  })
  @IsString()
  userStory: string;
}
