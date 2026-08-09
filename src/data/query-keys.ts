export const queryKeys = {
  marketplace: {
    all: ["marketplace"] as const,
    services: (limit: number) => ["marketplace", "services", { limit }] as const,
  },
  companies: {
    all: ["companies"] as const,
    detail: (id: string) => ["companies", id] as const,
  },
  rfqs: {
    all: ["rfqs"] as const,
    detail: (id: string) => ["rfqs", id] as const,
  },
  messages: {
    conversations: ["messages", "conversations"] as const,
    conversation: (id: string) => ["messages", "conversation", id] as const,
  },
} as const;
