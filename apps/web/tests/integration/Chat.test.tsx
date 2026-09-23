import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatBadge } from "@/features/chat/ChatBadge";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { MessagesInbox } from "@/features/chat/MessagesInbox";
import { CustomerBookings } from "@/features/customer/CustomerBookings";
import type { ChatRoom, ChatMessage } from "@/features/chat/api/chatClient";
import type { CustomerBooking } from "@/features/customer/api/customerBookingsClient";

const chatApi = vi.hoisted(() => ({
  createChatRoom: vi.fn(),
  fetchChatRooms: vi.fn(),
  fetchChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
  fetchChatUnreadCount: vi.fn(),
}));

const authApi = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "user-cust-1",
      email: "thabo@chefmate.co.za",
      displayName: "Thabo Ndlovu",
      roles: ["CUSTOMER"],
    },
    status: "authenticated",
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  })),
}));

const customerBookingsApi = vi.hoisted(() => ({
  fetchCustomerBookings: vi.fn(),
  modifyCustomerBooking: vi.fn(),
}));

const availabilityApi = vi.hoisted(() => ({
  fetchAvailabilityForDate: vi.fn(),
}));

vi.mock("@/features/chat/api/chatClient", () => chatApi);
vi.mock("@/features/auth/AuthContext", () => authApi);
vi.mock("@/features/customer/api/customerBookingsClient", () => customerBookingsApi);
vi.mock("@/features/order-flow/api/availabilityClient", () => availabilityApi);

const mockBooking: CustomerBooking = {
  id: "booking-101",
  reference: "CM99901",
  status: "CHEF_MATCHED",
  type: "STANDARD",
  mainMeal: { slug: "winter-oxtail-stew", name: "Winter Oxtail Stew" },
  meals: [{ kind: "main", slug: "winter-oxtail-stew", name: "Winter Oxtail Stew" }],
  customRequest: "Less salt please",
  address: {
    street: "10 Sandton Drive",
    unit: "Unit 2",
    estate: "Sandton Estate",
    serviceArea: "Sandton",
  },
  scheduledDate: "2026-09-25",
  timeSlot: "17:00",
  createdAt: "2026-09-21T10:00:00.000Z",
};

const mockChatRoom: ChatRoom = {
  id: "room-1",
  bookingRequestId: "booking-101",
  type: "BOOKING",
  isActive: true,
  createdAt: "2026-09-21T10:00:00.000Z",
  updatedAt: "2026-09-21T10:05:00.000Z",
  unreadCount: 2,
  booking: {
    id: "booking-101",
    reference: "CM99901",
    mainName: "Winter Oxtail Stew",
    scheduledDate: "2026-09-25",
    timeSlot: "17:00",
  },
  participants: [
    {
      id: "part-1",
      roomId: "room-1",
      userId: "user-cust-1",
      createdAt: "2026-09-21T10:00:00.000Z",
      user: {
        id: "user-cust-1",
        displayName: "Thabo Ndlovu",
        email: "thabo@chefmate.co.za",
        roles: ["CUSTOMER"],
      },
    },
    {
      id: "part-2",
      roomId: "room-1",
      userId: "user-chef-1",
      createdAt: "2026-09-21T10:00:00.000Z",
      user: {
        id: "user-chef-1",
        displayName: "Chef Sipho",
        email: "sipho@chefmate.co.za",
        roles: ["COOK"],
      },
    },
  ],
  messages: [
    {
      id: "msg-1",
      roomId: "room-1",
      senderId: "user-chef-1",
      content: "Hello Thabo! I will arrive 15 minutes before 17:00.",
      type: "TEXT",
      isRead: false,
      archived: false,
      createdAt: "2026-09-21T10:05:00.000Z",
      sender: {
        id: "user-chef-1",
        displayName: "Chef Sipho",
        email: "sipho@chefmate.co.za",
        roles: ["COOK"],
      },
    },
  ],
};

const mockMessages: ChatMessage[] = [
  {
    id: "msg-1",
    roomId: "room-1",
    senderId: "user-chef-1",
    content: "Hello Thabo! I will arrive 15 minutes before 17:00.",
    type: "TEXT",
    isRead: false,
    archived: false,
    createdAt: "2026-09-21T10:05:00.000Z",
    sender: {
      id: "user-chef-1",
      displayName: "Chef Sipho",
      email: "sipho@chefmate.co.za",
      roles: ["COOK"],
    },
  },
];


describe("Messaging Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatApi.fetchChatUnreadCount.mockResolvedValue({ unread: 3 });
    chatApi.fetchChatRooms.mockResolvedValue([mockChatRoom]);
    chatApi.fetchChatMessages.mockResolvedValue({
      items: mockMessages,
      meta: { total: 1, page: 1, limit: 100 },
    });
    chatApi.createChatRoom.mockResolvedValue(mockChatRoom);
    chatApi.sendChatMessage.mockImplementation(async (roomId: string, content: string) => ({
      id: "msg-2",
      roomId,
      senderId: "user-cust-1",
      content,
      type: "TEXT",
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: "user-cust-1",
        displayName: "Thabo Ndlovu",
        email: "thabo@chefmate.co.za",
        roles: ["CUSTOMER"],
      },
    }));
    customerBookingsApi.fetchCustomerBookings.mockResolvedValue([mockBooking]);
  });

  describe("ChatBadge", () => {
    it("renders unread badge when unread count > 0", async () => {
      render(<ChatBadge />);
      const badge = await screen.findByTestId("chat-unread-badge");
      expect(badge).toHaveTextContent("3");
    });

    it("renders nothing when unread count is 0", async () => {
      chatApi.fetchChatUnreadCount.mockResolvedValueOnce({ unread: 0 });
      const { container } = render(<ChatBadge />);
      await waitFor(() => {
        expect(container.firstChild).toBeNull();
      });
    });

    it("caps count display at 9+ when unread > 9", async () => {
      chatApi.fetchChatUnreadCount.mockResolvedValueOnce({ unread: 15 });
      render(<ChatBadge />);
      const badge = await screen.findByTestId("chat-unread-badge");
      expect(badge).toHaveTextContent("9+");
    });
  });

  describe("ChatPanel", () => {
    it("creates/loads room and displays messages", async () => {
      const handleClose = vi.fn();
      render(
        <ChatPanel
          bookingRequestId="booking-101"
          bookingRef="CM99901"
          mealName="Winter Oxtail Stew"
          recipientName="Chef Sipho"
          onClose={handleClose}
        />,
      );

      await expect(screen.findByText(/Chef Sipho/i)).resolves.toBeInTheDocument();
      await expect(
        screen.findByText("Hello Thabo! I will arrive 15 minutes before 17:00."),
      ).resolves.toBeInTheDocument();
    });


    it("allows user to type and send a chat message", async () => {
      const handleClose = vi.fn();
      render(
        <ChatPanel
          initialRoomId="room-1"
          bookingRef="CM99901"
          mealName="Winter Oxtail Stew"
          recipientName="Chef Sipho"
          onClose={handleClose}
        />,
      );

      await expect(
        screen.findByText("Hello Thabo! I will arrive 15 minutes before 17:00."),
      ).resolves.toBeInTheDocument();

      const input = screen.getByPlaceholderText("Type a message...");
      fireEvent.change(input, { target: { value: "Sounds great, thank you Chef!" } });

      const sendBtn = screen.getByRole("button", { name: "Send" });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(chatApi.sendChatMessage).toHaveBeenCalledWith(
          "room-1",
          "Sounds great, thank you Chef!",
        );
      });

      expect(screen.getByText("Sounds great, thank you Chef!")).toBeInTheDocument();
    });
  });

  describe("MessagesInbox", () => {
    it("renders conversation list and active thread", async () => {
      render(<MessagesInbox initialRoomId="room-1" />);

      await expect(screen.findByText("Conversations")).resolves.toBeInTheDocument();
      await expect(screen.findAllByText("Chef Sipho")).resolves.not.toHaveLength(0);
      await expect(
        screen.findAllByText("Hello Thabo! I will arrive 15 minutes before 17:00."),
      ).resolves.not.toHaveLength(0);
    });

    it("filters conversation list via search input", async () => {
      render(<MessagesInbox />);

      await expect(screen.findByText("Chef Sipho")).resolves.toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText("Search messages...");
      fireEvent.change(searchInput, { target: { value: "NonExistentName" } });

      await expect(screen.findByText("No matching conversations")).resolves.toBeInTheDocument();
    });

    it("sends message from MessagesInbox composer", async () => {
      render(<MessagesInbox initialRoomId="room-1" />);

      await expect(
        screen.findAllByText("Hello Thabo! I will arrive 15 minutes before 17:00."),
      ).resolves.not.toHaveLength(0);

      const input = await screen.findByPlaceholderText("Type a message...");
      fireEvent.change(input, { target: { value: "Looking forward to dinner." } });

      const sendBtn = screen.getByRole("button", { name: "Send" });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(chatApi.sendChatMessage).toHaveBeenCalledWith(
          "room-1",
          "Looking forward to dinner.",
        );
      });
    });
  });

  describe("Customer Bookings Integration", () => {
    it("clicking 'Chat with Chef' opens ChatPanel drawer", async () => {
      render(<CustomerBookings />);

      await expect(screen.findByText(/CM99901/)).resolves.toBeInTheDocument();
      const chatBtn = screen.getByRole("button", { name: /Chat with Chef/i });
      expect(chatBtn).toBeInTheDocument();

      fireEvent.click(chatBtn);

      await waitFor(() => {
        expect(chatApi.createChatRoom).toHaveBeenCalledWith("booking-101");
      });

      await expect(
        screen.findByText("Hello Thabo! I will arrive 15 minutes before 17:00."),
      ).resolves.toBeInTheDocument();
    });
  });
});

