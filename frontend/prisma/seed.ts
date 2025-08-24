import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: "demo@scooby.ai" },
    update: {},
    create: {
      email: "demo@scooby.ai",
      username: "demo_user",
      walletAddress: "0x1234567890123456789012345678901234567890",
    },
  });

  console.log("👤 Created user:", user.email);

  // Create user preferences
  await prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      tradingExperience: "intermediate",
      riskTolerance: "medium",
      preferredAssets: ["BTC", "ETH", "AAPL", "TSLA"],
      notifications: true,
    },
  });

  console.log("⚙️ Created user preferences");

  // Create a chat session
  const chatSession = await prisma.chatSession.create({
    data: {
      title: "Welcome Chat",
      userId: user.id,
    },
  });

  console.log("💬 Created chat session:", chatSession.id);

  // Create sample messages
  await prisma.message.createMany({
    data: [
      {
        content: "Hello Scooby! I'm new to trading and would like some advice.",
        role: "USER",
        chatSessionId: chatSession.id,
        userId: user.id,
      },
      {
        content:
          "Woof! Welcome to Scooby AI! 🐕 I'm here to help you navigate the exciting world of trading. As a beginner, I recommend starting with understanding the basics of risk management and diversification. What specific area would you like to explore first?",
        role: "ASSISTANT",
        chatSessionId: chatSession.id,
        userId: user.id,
      },
      {
        content: "Can you tell me about Bitcoin?",
        role: "USER",
        chatSessionId: chatSession.id,
        userId: user.id,
      },
      {
        content:
          'Absolutely! Bitcoin (BTC) is the first and most well-known cryptocurrency. It\'s often called "digital gold" due to its store of value properties. Key points:\n\n• Limited supply of 21 million coins\n• Decentralized network\n• Volatile but historically trending upward\n• Good for long-term investment strategies\n\nRemember: never invest more than you can afford to lose! 🚀',
        role: "ASSISTANT",
        chatSessionId: chatSession.id,
        userId: user.id,
      },
    ],
  });

  console.log("📝 Created sample messages");

  // Create sample market data
  await prisma.marketData.createMany({
    data: [
      {
        symbol: "BTC",
        currentPrice: 45000.0,
        change24h: 2.5,
        volume24h: 15000000000,
        marketCap: 850000000000,
      },
      {
        symbol: "ETH",
        currentPrice: 3200.0,
        change24h: -1.2,
        volume24h: 8000000000,
        marketCap: 380000000000,
      },
      {
        symbol: "AAPL",
        currentPrice: 190.5,
        change24h: 0.8,
        volume24h: 500000000,
        marketCap: 2900000000000,
      },
    ],
  });

  console.log("📊 Created sample market data");

  // Create a sample trade
  await prisma.trade.create({
    data: {
      userId: user.id,
      symbol: "BTC",
      type: "BUY",
      quantity: 0.01,
      price: 44000.0,
      totalValue: 440.0,
      status: "EXECUTED",
    },
  });

  console.log("💰 Created sample trade");

  console.log("✅ Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
