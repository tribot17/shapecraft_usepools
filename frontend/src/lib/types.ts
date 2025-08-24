import { Prisma } from "@prisma/client";

// User types
export type User = Prisma.UserGetPayload<{}>;
export type UserWithSessions = Prisma.UserGetPayload<{
  include: {
    chatSessions: true;
    preferences: true;
  };
}>;

// Chat types
export type ChatSession = Prisma.ChatSessionGetPayload<{}>;
export type ChatSessionWithMessages = Prisma.ChatSessionGetPayload<{
  include: {
    messages: true;
    user: true;
  };
}>;

export type Message = Prisma.MessageGetPayload<{}>;
export type MessageWithUser = Prisma.MessageGetPayload<{
  include: {
    user: true;
  };
}>;

// Trading types
export type Trade = Prisma.TradeGetPayload<{}>;
export type TradeWithUser = Prisma.TradeGetPayload<{
  include: {
    user: true;
  };
}>;

// Market data types
export type MarketData = Prisma.MarketDataGetPayload<{}>;

// Preferences types
export type UserPreferences = Prisma.UserPreferencesGetPayload<{}>;

// Enums
export { MessageRole, TradeStatus, TradeType } from "@prisma/client";
