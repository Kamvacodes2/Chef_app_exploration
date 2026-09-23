import { z } from "zod";
import { readApiErrorMessage } from "@/lib/apiError";
import { getChefmateApiUrl } from "@/lib/env";

export interface PlatformRequestOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

export const chatUserSummarySchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  roles: z.array(z.string()),
});

export const chatParticipantSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  userId: z.string().min(1),
  lastRead: z.string().nullable().optional(),
  createdAt: z.string(),
  user: chatUserSummarySchema.nullable().optional(),
});

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  senderId: z.string().min(1),
  content: z.string(),
  type: z.enum(["TEXT", "SYSTEM"]),
  isRead: z.boolean(),
  archived: z.boolean().optional().default(false),
  createdAt: z.string(),
  sender: chatUserSummarySchema.nullable().optional(),
});

export const chatRoomBookingSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  mainName: z.string().min(1),
  scheduledDate: z.string().min(1),
  timeSlot: z.string().min(1),
  customerId: z.string().nullable().optional(),
  cookId: z.string().nullable().optional(),
});

export const chatRoomSchema = z.object({
  id: z.string().min(1),
  bookingRequestId: z.string().nullable().optional(),
  type: z.enum(["BOOKING", "SUPPORT"]),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  booking: chatRoomBookingSchema.nullable().optional(),
  participants: z.array(chatParticipantSchema).default([]),
  messages: z.array(chatMessageSchema).optional().default([]),
  unreadCount: z.number().int().nonnegative().optional().default(0),
});

export const chatUnreadCountSchema = z.object({
  unread: z.number().int().nonnegative(),
});

const paginatedMessagesResponseSchema = z.object({
  data: z.array(chatMessageSchema),
  meta: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  }),
});

export type ChatUserSummary = z.infer<typeof chatUserSummarySchema>;
export type ChatParticipant = z.infer<typeof chatParticipantSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRoomBooking = z.infer<typeof chatRoomBookingSchema>;
export type ChatRoom = z.infer<typeof chatRoomSchema>;
export type ChatUnreadCount = z.infer<typeof chatUnreadCountSchema>;

export async function createChatRoom(
  bookingRequestId: string,
  options: PlatformRequestOptions = {},
): Promise<ChatRoom> {
  const response = await send("/api/v1/chat/rooms", "POST", { bookingRequestId }, options);
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Failed to start chat (" + response.status + ")"),
    );
  }
  const json = await response.json();
  return chatRoomSchema.parse(json.data);
}

export async function fetchChatRooms(options: PlatformRequestOptions = {}): Promise<ChatRoom[]> {
  const response = await send("/api/v1/chat/rooms", "GET", undefined, options);
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Failed to load chats (" + response.status + ")"),
    );
  }
  const json = await response.json();
  return z.array(chatRoomSchema).parse(json.data);
}

export async function fetchChatMessages(
  roomId: string,
  options: PlatformRequestOptions & { page?: number; limit?: number } = {},
): Promise<{ items: ChatMessage[]; meta: { total: number; page: number; limit: number } }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const response = await send(
    `/api/v1/chat/rooms/${encodeURIComponent(roomId)}/messages?page=${page}&limit=${limit}`,
    "GET",
    undefined,
    options,
  );
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Failed to load messages (" + response.status + ")"),
    );
  }
  const json = await response.json();
  const parsed = paginatedMessagesResponseSchema.parse(json);
  return { items: parsed.data, meta: parsed.meta };
}

export async function sendChatMessage(
  roomId: string,
  content: string,
  options: PlatformRequestOptions = {},
): Promise<ChatMessage> {
  const response = await send(
    `/api/v1/chat/rooms/${encodeURIComponent(roomId)}/messages`,
    "POST",
    { content },
    options,
  );
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Failed to send message (" + response.status + ")"),
    );
  }
  const json = await response.json();
  return chatMessageSchema.parse(json.data);
}

export async function fetchChatUnreadCount(
  options: PlatformRequestOptions = {},
): Promise<ChatUnreadCount> {
  const response = await send("/api/v1/chat/unread", "GET", undefined, options);
  if (!response.ok) {
    throw new Error(
      await readApiErrorMessage(response, "Failed to load unread count (" + response.status + ")"),
    );
  }
  const json = await response.json();
  return chatUnreadCountSchema.parse(json.data);
}

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function send(
  path: string,
  method: RequestMethod,
  body: unknown,
  options: PlatformRequestOptions,
): Promise<Response> {
  const init: RequestInit = {
    method,
    credentials: "include",
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  };

  return (options.fetchImpl ?? fetch)(apiUrl(options.baseUrl ?? getChefmateApiUrl(), path), init);
}

function apiUrl(baseUrl: string, path: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("Chefmate API URL is not configured.");
  return trimmed + path;
}
