import AIChat from '../components/AIChat';
import QuickBooksConnection from '../components/QuickBooksConnection';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Invoice Manager</h1>
          <p className="text-gray-300">Manage your QuickBooks invoices with AI assistance</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
          {/* Left Pane - AI Chat */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">AI Assistant</h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIChat />
            </div>
          </div>

          {/* Right Pane - QuickBooks Integration */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">QuickBooks Integration</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <QuickBooksConnection />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
