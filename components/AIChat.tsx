'use client';

import { useEffect } from 'react';
import { Send } from 'lucide-react';

export default function AIChat() {
  useEffect(() => {
    // Add submit handler
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input') as HTMLInputElement;

    const addMessage = (role: 'user' | 'assistant', content: string) => {
      const messagesContainer = document.getElementById('messages-container');
      if (!messagesContainer) return;

      const messageDiv = document.createElement('div');
      messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
      messageDiv.innerHTML = `
        <div class="max-w-[80%] rounded-lg p-3 ${
          role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
        }">
          <p class="text-sm whitespace-pre-wrap">${content}</p>
        </div>
      `;
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const showLoading = () => {
      const messagesContainer = document.getElementById('messages-container');
      if (!messagesContainer) return;

      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'flex justify-start';
      loadingDiv.id = 'loading-indicator';
      loadingDiv.innerHTML = `
        <div class="bg-gray-700 rounded-lg p-3">
          <div class="flex space-x-2">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      `;
      messagesContainer.appendChild(loadingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const hideLoading = () => {
      const loadingDiv = document.getElementById('loading-indicator');
      if (loadingDiv) loadingDiv.remove();
    };

    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      if (!input || !input.value.trim()) return;

      const userMessage = input.value.trim();
      addMessage('user', userMessage);
      input.value = '';
      showLoading();

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMessage }],
          }),
        });

        if (!response.ok) throw new Error('Failed to get response');

        const data = await response.json();
        console.log('Received response:', data);
        addMessage('assistant', data.content);

      } catch (error) {
        console.error('Chat error:', error);
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      } finally {
        hideLoading();
      }
    };

    form?.addEventListener('submit', handleSubmit);

    // Cleanup
    return () => {
      form?.removeEventListener('submit', handleSubmit);
    };
  }, []); // Empty dependency array means this runs once on mount

  return (
    <div className="flex flex-col h-full">
      {/* Messages Container */}
      <div 
        id="messages-container"
        className="flex-1 overflow-y-auto p-4 space-y-4"
      />

      {/* Input Form */}
      <form id="chat-form" className="p-4 border-t border-white/10">
        <div className="flex space-x-4">
          <input
            id="chat-input"
            type="text"
            placeholder="Ask about your invoices..."
            className="flex-1 p-2 rounded-lg bg-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
} 