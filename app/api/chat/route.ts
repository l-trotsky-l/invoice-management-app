import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { readFileSync } from 'fs';
import path from 'path';

// Define request schema to match useChat hook format
const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
});

// Define processInvoicesTool
const processInvoicesTool = {
  description: 'Read invoices.txt, count the total number of invoices, and return their details in a structured format',
  parameters: z.object({
    action: z.enum(['count', 'list']).describe('The action to perform: count invoices or list details'),
  }),
  execute: async ({ action }: { action: 'count' | 'list' }) => {
    const filePath = path.join(process.cwd(), 'data', 'invoices.txt');
    const fileContent = readFileSync(filePath, 'utf-8');
    const invoices = fileContent.split('===========================================').filter(section => section.includes('INVOICE DETAILS')).map(section => {
      const lines = section.trim().split('\n');
      const idMatch = lines.find(line => line.includes('Invoice ID:'));
      const numberMatch = lines.find(line => line.includes('Invoice Number:'));
      const customerMatch = lines.find(line => line.includes('Customer Name:'));
      const totalMatch = lines.find(line => line.includes('Total Amount:'));
      return {
        id: idMatch ? idMatch.split(': ')[1] : 'Unknown',
        number: numberMatch ? numberMatch.split(': ')[1] : 'Unknown',
        customer: customerMatch ? customerMatch.split(': ')[1] : 'Unknown',
        total: totalMatch ? parseFloat(totalMatch.split(': ')[1]) : 0,
      };
    });

    if (action === 'count') {
      return { totalInvoices: invoices.length };
    } else {
      return {
        totalInvoices: invoices.length,
        invoices: invoices.map(invoice => ({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          customerName: invoice.customer,
          totalAmount: invoice.total,
        })),
      };
    }
  },
};

export async function POST(req: Request) {
  try {
    // Parse and validate request
    const body = await req.json();
    const { messages } = requestSchema.parse(body);

    // Get the last user message as the prompt
    const prompt = messages[messages.length - 1].content;

    // Generate response using generateText with OpenAI model
    const { text } = await generateText({
      model: openai('gpt-4'),
      prompt,
      system: 'You are a helpful AI assistant for an invoice management application. Use the processInvoices tool for queries about invoices or invoice counts. Provide clear, concise, and professional responses.',
      tools: {
        processInvoices: processInvoicesTool,
      },
      maxSteps: 2,
    });

    console.log('Generated text:', text);

    // Return the response
    const responseData = {
      role: 'assistant',
      content: text,
    };
    console.log('Sending response:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request format', details: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Failed to process chat request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}