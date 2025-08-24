'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn, formatDate } from '@/lib/utils';
import * as Avatar from '@radix-ui/react-avatar';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg',
        isAssistant ? 'bg-primary/5 hover:bg-primary/10' : 'bg-muted/50 hover:bg-muted/70',
        'transition-colors duration-200'
      )}
    >
      <Avatar.Root className="flex-shrink-0">
        <Avatar.Image
          src={isAssistant ? '/scooby-avatar.png' : '/user-avatar.png'}
          alt={isAssistant ? 'Scooby' : 'User'}
          className="w-8 h-8 rounded-full"
        />
        <Avatar.Fallback className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isAssistant ? 'bg-primary/20' : 'bg-muted-foreground/20'
        )}>
          <span className="text-lg">{isAssistant ? '🐕' : '👤'}</span>
        </Avatar.Fallback>
      </Avatar.Root>

      <div className="flex-1 space-y-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium',
            isAssistant ? 'text-primary' : 'text-foreground'
          )}>
            {isAssistant ? 'Scooby' : 'You'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(message.timestamp)}
          </span>
        </div>
        <div className={cn(
          'prose prose-sm max-w-none',
          'prose-p:leading-relaxed prose-pre:bg-muted/50',
          'prose-code:text-primary prose-code:bg-primary/5 prose-code:rounded-md prose-code:px-1',
          message.isLoading && 'animate-pulse'
        )}>
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            message.content
          )}
        </div>
      </div>
    </motion.div>
  );
} 