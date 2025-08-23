'use client';

import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SendHorizontal, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (message.trim() && !isLoading) {
      await onSendMessage(message.trim());
      setMessage('');
      setRows(1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      const textArea = textareaRef.current;
      textArea.style.height = 'auto';
      const newHeight = Math.min(textArea.scrollHeight, 200);
      textArea.style.height = `${newHeight}px`;
      setRows(Math.ceil(newHeight / 24)); // Assuming line-height is 24px
    }
  }, [message]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-end gap-2 relative"
    >
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Scooby about stocks..."
          rows={rows}
          disabled={isLoading}
          className={cn(
            'w-full resize-none rounded-lg border bg-background px-4 py-3',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'placeholder:text-muted-foreground/70',
            'transition-all duration-200'
          )}
        />
        <div
          className={cn(
            'absolute right-3 bottom-3 text-xs text-muted-foreground/70',
            message.length > 0 ? 'opacity-100' : 'opacity-0',
            'transition-opacity duration-200'
          )}
        >
          Press Enter to send
        </div>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleSend}
        disabled={!message.trim() || isLoading}
        className={cn(
          'flex items-center justify-center rounded-lg p-3',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          'h-[46px] w-[46px]'
        )}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <SendHorizontal className="w-5 h-5" />
        )}
      </motion.button>
    </motion.div>
  );
} 