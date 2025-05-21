import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { tools, executeTool } from './tools';

// Create an OpenAI API client
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Add system message with tool descriptions
  const systemMessage = {
    role: 'system',
    content: `You are a helpful AI assistant that can access invoice data. You have access to the following tools:
    ${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}
    
    When the user asks about invoices, use the appropriate tool to get the information.`
  };

  // Add the system message to the beginning of the conversation
  const messagesWithSystem = [systemMessage, ...messages];

  // Check if the last message is asking about the total number of invoices
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.content.toLowerCase().includes('total number of invoices') ||
      lastMessage.content.toLowerCase().includes('how many invoices')) {
    const result = await executeTool('getTotalInvoices');
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If not a tool request, use OpenAI for general conversation
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages: messagesWithSystem,
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
} 