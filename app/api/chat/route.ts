import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';
import { executeTool } from '../../utils/invoiceTools';
import type { TotalInvoicesData } from '../../utils/invoiceTools';

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(config);

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Add system message to guide the AI
  const systemMessage = {
    role: 'system',
    content: `You are an AI assistant for an invoice management system. You can help users with invoice-related queries.
    When users ask about invoice statistics or totals, use the available tools to get accurate information.
    Always be concise and professional in your responses.`
  };

  // Add the system message to the beginning of the conversation
  const messagesWithSystem = [systemMessage, ...messages];

  // Check if the last message is asking about invoice totals
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user' && 
      (lastMessage.content.toLowerCase().includes('total invoices') || 
       lastMessage.content.toLowerCase().includes('how many invoices'))) {
    
    // Execute the getTotalInvoices tool
    const result = await executeTool<TotalInvoicesData>('getTotalInvoices');
    
    if (result.type === 'success' && result.data) {
      const { breakdown } = result.data;
      // Add the tool result as a system message
      messagesWithSystem.push({
        role: 'system',
        content: `Tool Result: ${result.message}\nBreakdown: Paid: ${breakdown.paid}, Unpaid: ${breakdown.unpaid}, Overdue: ${breakdown.overdue}`
      });
    }
  }

  // Create the chat completion
  const response = await openai.createChatCompletion({
    model: 'gpt-4',
     messages: messagesWithSystem,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Return a streaming response
  return new StreamingTextResponse(stream);
} 