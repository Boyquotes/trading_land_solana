import { useRef, useEffect } from 'react';

type NotificationType = {
  id: number;
  content: string;
  author: string;
  timestamp: number;
};

interface NotificationsProps {
  notifications: NotificationType[];
}

export function Notifications({ notifications }: NotificationsProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [notifications]);

  return (
    <div className="fixed top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-gray-800 bg-opacity-90 text-white px-4 py-2 rounded-lg shadow-lg max-w-md animate-fade-in"
        >
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {notification.author} • {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
