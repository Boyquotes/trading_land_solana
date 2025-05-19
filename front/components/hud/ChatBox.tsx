import { useState, useRef, useEffect } from 'react';
import { SerializedMessageType } from '@shared/network/server/serialized';
import { MessageComponent } from '@shared/component/MessageComponent';

interface ChatBoxProps {
  messages: MessageComponent[];
  sendMessage: (message: string) => void;
}

export function ChatBox({ messages, sendMessage }: ChatBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const refContainer = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 pointer-events-auto">
      <div
        ref={refContainer}
        className="bg-gray-800 bg-opacity-50 rounded-lg p-4 shadow-lg max-h-96 flex flex-col"
      >
        <div className="flex-1 overflow-y-auto mb-4 max-h-64 custom-scrollbar">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-2 ${
                message.type === SerializedMessageType.PLAYER
                  ? 'text-right'
                  : ''
              }`}
            >
              <div
                className={`inline-block rounded-lg px-3 py-2 text-sm ${
                  message.type === SerializedMessageType.PLAYER
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                <p className="font-bold text-xs">
                  {message.type === SerializedMessageType.PLAYER
                    ? 'You'
                    : message.author}
                </p>
                <p>{message.content}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-gray-700 text-white rounded-l-lg px-3 py-2 focus:outline-none"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-r-lg px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
