declare module 'ai' {
  export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }

  export interface UseChatOptions {
    api?: string;
    id?: string;
    initialMessages?: Message[];
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    onResponse?: (response: Response) => void | Promise<void>;
    onFinish?: (message: Message) => void;
    onError?: (error: Error) => void;
  }

  export interface UseChatHelpers {
    messages: Message[];
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    error: Error | undefined;
  }

  export function useChat(options?: UseChatOptions): UseChatHelpers;
  export function OpenAIStream(response: AsyncIterable<any>): ReadableStream;
  export class StreamingTextResponse extends Response {
    constructor(stream: ReadableStream);
  }
} 