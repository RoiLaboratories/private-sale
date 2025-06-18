import { useEffect, useState } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  type: NotificationType;
  message: string;
  isVisible: boolean;
  onClose: () => void;
  autoClose?: boolean;
}

const Notification = ({ 
  type, 
  message, 
  isVisible, 
  onClose, 
  autoClose = true 
}: NotificationProps) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        setIsClosing(true);
        const closeTimer = setTimeout(() => {
          onClose();
          setIsClosing(false);
        }, 300);
        return () => clearTimeout(closeTimer);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, autoClose]);

  if (!isVisible) return null;

  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div 
      className={`fixed top-4 right-4 max-w-md px-4 py-3 rounded-lg shadow-lg text-white 
      ${getBgColor()} 
      ${isClosing ? 'opacity-0 transition-opacity duration-300' : 'opacity-100 transition-opacity duration-300'}`}
    >
      <div className="flex justify-between items-center">
        <div className="font-medium">{message}</div>
        <button 
          onClick={() => {
            setIsClosing(true);
            setTimeout(() => {
              onClose();
              setIsClosing(false);
            }, 300);
          }}
          className="ml-4 text-white hover:text-gray-200"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default Notification;
