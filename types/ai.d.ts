declare module 'ai' {
  import { z } from 'zod';

  export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  export type LanguageModelV1 = {
    temperature?: number;
    maxTokens?: number;
  };

  export interface ToolConfig<T extends z.ZodType> {
    description?: string;
    parameters: T;
    execute: (args: z.infer<T>) => Promise<string>;
  }

  export interface StreamTextConfig {
    model: LanguageModelV1;
    prompt: string;
    tools?: Record<string, ToolConfig<z.ZodObject<Record<string, never>>>>;
    maxSteps?: number;
    system?: string;
    toolChoice?: 'auto' | 'required';
  }

  export interface StreamTextResponse {
    textStream: AsyncIterable<string>;
    steps?: Array<{
      text: string;
      toolCalls?: Array<unknown>;
      toolResults?: Array<unknown>;
    }>;
  }

  export interface GenerateTextConfig {
    model: LanguageModelV1;
    prompt: string;
    system?: string;
  }

  export interface GenerateTextResponse {
    text: string;
  }

  export function tool<T extends z.ZodType>(config: ToolConfig<T>): ToolConfig<T>;

  export function streamText(config: StreamTextConfig): Promise<StreamTextResponse>;

  export function generateText(config: GenerateTextConfig): Promise<GenerateTextResponse>;
}
