export type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: number;
};

// idle: rảnh | waiting: đã gửi, chưa có chữ nào | streaming: AI đang trả lời
export type ChatStatus = "idle" | "waiting" | "streaming";