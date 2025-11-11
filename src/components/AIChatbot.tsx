import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
}

interface MarketPrice {
  price: number;
  city: string;
  date: string;
}

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m the FarmSight AI Assistant. I can help you with product prices, market trends, and agricultural information. Try asking me about product prices!',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSendMessage() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await processUserQuery(userMessage.content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  async function processUserQuery(query: string): Promise<string> {
    const lowerQuery = query.toLowerCase();

    const { data: products } = await supabase
      .from('products')
      .select('id, name, category, unit');

    if (!products) {
      return 'I\'m having trouble accessing the product database. Please try again later.';
    }

    const matchedProduct = products.find(p =>
      lowerQuery.includes(p.name.toLowerCase())
    );

    if (matchedProduct) {
      return await getProductPriceInfo(matchedProduct);
    }

    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('how much')) {
      const productNames = products.map(p => p.name).join(', ');
      return `I can provide price information for the following products: ${productNames}. Which product would you like to know about?`;
    }

    if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
      return 'Hello! How can I assist you with agricultural market information today?';
    }

    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
      return 'I can help you with:\n\n• Product price information (average price, price range)\n• Identifying regions with the lowest prices\n• Market trends and comparisons\n\nTry asking me "What\'s the price of tomatoes?" or "Show me chicken prices"';
    }

    return 'I\'m here to help with product prices and market information. Try asking me about specific products like tomatoes, rice, chicken, or pork!';
  }

  async function getProductPriceInfo(product: Product): Promise<string> {
    const { data: prices } = await supabase
      .from('market_prices')
      .select('price, city, date')
      .eq('product_id', product.id)
      .order('date', { ascending: false });

    if (!prices || prices.length === 0) {
      return `I don't have current price information for ${product.name}. Please check back later.`;
    }

    const recentPrices = prices.slice(0, 100);

    const priceValues = recentPrices.map(p => p.price);
    const avgPrice = (priceValues.reduce((a, b) => a + b, 0) / priceValues.length).toFixed(2);
    const minPrice = Math.min(...priceValues).toFixed(2);
    const maxPrice = Math.max(...priceValues).toFixed(2);

    const cityPrices = recentPrices.reduce((acc, price) => {
      if (!acc[price.city]) {
        acc[price.city] = [];
      }
      acc[price.city].push(price.price);
      return acc;
    }, {} as Record<string, number[]>);

    const cityAverages = Object.entries(cityPrices).map(([city, prices]) => ({
      city,
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
    }));

    cityAverages.sort((a, b) => a.avgPrice - b.avgPrice);
    const lowestPriceCity = cityAverages[0];

    return `📊 **${product.name}** Price Information:\n\n` +
      `💰 **Average Price:** ¥${avgPrice} per ${product.unit}\n\n` +
      `📈 **Price Range:** ¥${minPrice} - ¥${maxPrice} per ${product.unit}\n\n` +
      `🏆 **Lowest Price Region:** ${lowestPriceCity.city} (¥${lowestPriceCity.avgPrice.toFixed(2)} per ${product.unit})\n\n` +
      `📍 **Markets Tracked:** ${Object.keys(cityPrices).length} cities\n\n` +
      `This information is based on recent market data. Prices may vary by season and availability.`;
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50"
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">FarmSight AI Assistant</h3>
                <p className="text-xs text-green-100">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 rounded-bl-sm shadow-sm border border-gray-200">
                  <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about product prices..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
