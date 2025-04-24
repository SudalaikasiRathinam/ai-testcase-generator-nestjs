import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as util from 'util';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface TestCase {
  id: number;
  title: string;
  description: string;
  expectedResult: string;
}

@Injectable()
export class AppService {
  private readonly geminiAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;
  private readonly logger = new Logger(AppService.name);

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not set');
    }
    this.geminiAI = new GoogleGenerativeAI(apiKey);
    this.model = this.geminiAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
  }

  /**
   * Generates content using Gemini AI based on the provided prompt.
   * @param prompt The prompt to send to Gemini AI.
   * @returns Parsed JSON content from the AI response.
   */
  private async generateContentFromAI(prompt: string): Promise<any> {
    try {
      const result = await this.model.generateContent([{ text: prompt }]);
      const response = await result.response;
      const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('No content returned from Gemini AI');
      }

      const cleaned = content.replace(/```json|```/g, '').trim();
      if (!cleaned) {
        throw new Error('No valid content from Gemini AI');
      }

      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error('Failed to generate content using Gemini AI', error);
      throw error;
    }
  }

  /**
   * Generates test cases based on the provided user story.
   * @param userStory The user story to generate test cases for.
   * @returns An array of generated test cases.
   */
  async generateTestCases(userStory: string): Promise<any[]> {
    const prompt = `
    You are a QA engineer. Given the following user story, generate all possible relevant test cases in JSON array format.
    Each test case should include edge cases, negative scenarios, and boundary conditions where applicable.
    
    Each test case should have the following fields:
    - id (number)
    - title (string)
    - description (string)
    - expectedResult (string)
    
    User Story:
    "${userStory}"
    
    Respond only with the raw JSON array. Do not include any markdown, explanations, or formatting.
    `;
    return this.generateContentFromAI(prompt);
  }

  /**
   * Extracts user stories from a document file.
   * @param filePath The path to the document file.
   * @returns Extracted user stories in a structured JSON format.
   */
  async extractUserStories(filePath: string): Promise<any[]> {
    const ext = path.extname(filePath).toLowerCase();
    let fileContent = '';

    if (ext === '.pdf') {
      const dataBuffer = await fs.promises.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      fileContent = pdfData.text;
    } else if (ext === '.docx') {
      const dataBuffer = await fs.promises.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      fileContent = result.value;
    } else if (ext === '.txt') {
      fileContent = await fs.promises.readFile(filePath, 'utf8');
    } else {
      throw new UnsupportedMediaTypeException(
        'Unsupported file format. Only .pdf, .docx, and .txt are allowed.',
      );
    }

//     const prompt = `
// You are a business analyst assistant. Your task is to extract well-structured user stories from the provided text.

// Each user story must include:
// - **title**: a concise summary of the user story
// - **description**: detailed context of the requirement
// - **acceptance_criteria**: a list of clear and testable conditions that define when the story is complete
// - **product_details**: any additional information that is relevant to the user story
// - **filed_details**: any additional information that is relevant to the user story
// - **user_story**: the user story itself

// Input text:
// ${fileContent}

// Output requirements:
// - Respond **only** with a JSON array
// - Do **not** include any explanations, formatting, or markdown
// - Each item in the array must be an object with: "title", "description", "acceptance_criteria", "product_details", "field_details", "user_story" (as an array of strings)

// Begin:
// `;

const prompt = `
You are a QA test engineer.

Given a document with multiple user stories, generate functional test cases for each user story.

For each user story, output a JSON object that contains:
- "story_title": the title of the user story
- "test_cases": an array of test case objects

Each test case object must have:
- "id": a unique test case identifier (e.g., TC-001, TC-002, etc.)
- "title": a brief description of the test case
- "steps": an ordered list of instructions to execute the test
- "expected_result": the outcome that should be observed

Input Document:
${fileContent}

Output Format:
Respond only with a JSON array where each item corresponds to a user story and includes its test cases.

Example:
[
  {
    "story_title": "User can login",
    "test_cases": [
      {
        "id": "TC-001",
        "title": "Successful login with valid credentials",
        "steps": ["Go to login page", "Enter valid username", "Enter valid password", "Click login"],
        "expected_result": "User is redirected to the dashboard"
      },
      ...
    ]
  },
  ...
]

Do not include any markdown, explanation, or additional formatting.

Begin:
`;

    return this.generateContentFromAI(prompt);
  }


}
