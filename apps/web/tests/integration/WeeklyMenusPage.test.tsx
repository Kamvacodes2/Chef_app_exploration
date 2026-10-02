import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyMenusPage } from "@/features/weekly-menus/WeeklyMenusPage";
import type { MenuWorkspace } from "@/features/weekly-menus/weeklyMenusClient";

const api = vi.hoisted(() => ({ fetchMenuWorkspace: vi.fn(), menuApi: vi.fn() }));
vi.mock("@/features/weekly-menus/weeklyMenusClient", () => api);
const workspace: MenuWorkspace = {
  relationships: [
    {
      customerId: "customer",
      chefId: "chef",
      customer: { id: "customer", displayName: "Household One", email: "customer@example.test" },
      chef: { id: "chef", displayName: "Chef One", email: "chef@example.test" },
    },
  ],
  menus: [],
  preferences: [{ customerId: "customer", spices: ["Cumin"], version: 1 }],
  nextWeek: "2026-10-05",
  timezone: "Africa/Johannesburg",
};
const menu = {
  id: "menu",
  customerId: "customer",
  chefId: "chef",
  weekStart: "2026-10-05",
  status: "SENT" as const,
  version: 2,
  currentRevision: 1,
  submissionDeadline: "2026-10-02T21:59:59.999Z",
  approvalDeadline: "2026-10-03T21:59:59.999Z",
  submissionLate: false,
  approvalLate: false,
  revisions: [
    {
      number: 1,
      submitted: true,
      approvedAt: null,
      approvedSpices: ["Cumin"],
      items: [{ day: 1, forWhom: "Children", meal: "Chicken", spices: ["Cumin"] }],
    },
  ],
  comments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchMenuWorkspace.mockResolvedValue(workspace);
  api.menuApi.mockResolvedValue({});
});
describe("weekly menus", () => {
  it("expands weekdays and submits distinct meals for household members", async () => {
    render(<WeeklyMenusPage role="CHEF" />);
    const monday = await screen.findByRole("button", { name: /Monday \(0 meals\)/ });
    expect(monday).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(monday);
    expect(monday).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Add meal for Monday" }));
    fireEvent.change(screen.getByLabelText(/Who is this meal for/), {
      target: { value: "Children" },
    });
    fireEvent.change(screen.getByLabelText("Menu (Monday, meal 1)"), {
      target: { value: "Chicken" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Cumin" }));
    fireEvent.click(screen.getByRole("button", { name: "Add meal for Monday" }));
    fireEvent.change(screen.getByLabelText(/Who is this meal for.*meal 2/), {
      target: { value: "Dad" },
    });
    fireEvent.change(screen.getByLabelText("Menu (Monday, meal 2)"), { target: { value: "Fish" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    await waitFor(() =>
      expect(api.menuApi).toHaveBeenCalledWith("chef/weekly-menus", {
        customerId: "customer",
        weekStart: "2026-10-05",
        expectedVersion: 0,
        submit: true,
        items: [
          { day: 1, forWhom: "Children", meal: "Chicken", spices: ["Cumin"] },
          { day: 1, forWhom: "Dad", meal: "Fish", spices: [] },
        ],
      }),
    );
  });
  it("approves the displayed menu version", async () => {
    api.fetchMenuWorkspace.mockResolvedValue({ ...workspace, menus: [menu] });
    render(<WeeklyMenusPage role="CUSTOMER" />);
    fireEvent.click(await screen.findByRole("button", { name: "Approve this weekly menu" }));
    await waitFor(() =>
      expect(api.menuApi).toHaveBeenCalledWith("account/weekly-menus/menu/approve", {
        expectedVersion: 2,
      }),
    );
  });
  it("stores comments, alternatives, day/person context and explicit change requests", async () => {
    api.fetchMenuWorkspace.mockResolvedValue({ ...workspace, menus: [menu] });
    render(<WeeklyMenusPage role="CUSTOMER" />);
    fireEvent.change(await screen.findByLabelText("Comment"), {
      target: { value: "Please change Monday" },
    });
    fireEvent.change(screen.getByLabelText("Alternative suggestion (optional)"), {
      target: { value: "Fish" },
    });
    fireEvent.change(screen.getByLabelText("Day (optional)"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("For whom (optional)"), {
      target: { value: "Children" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Request chef changes/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send change request" }));
    await waitFor(() =>
      expect(api.menuApi).toHaveBeenCalledWith("account/weekly-menus/menu/comments", {
        expectedVersion: 2,
        body: "Please change Monday",
        alternative: "Fish",
        day: 1,
        forWhom: "Children",
        requestsChanges: true,
      }),
    );
  });
  it("does not offer approval until requested changes are resubmitted", async () => {
    api.fetchMenuWorkspace.mockResolvedValue({
      ...workspace,
      menus: [{ ...menu, status: "CHANGES_REQUESTED" }],
    });
    render(<WeeklyMenusPage role="CUSTOMER" />);
    expect(await screen.findByText(/needs to revise and resubmit/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve this weekly menu" }),
    ).not.toBeInTheDocument();
  });
  it("saves household-approved spices with version checking", async () => {
    render(<WeeklyMenusPage role="CUSTOMER" />);
    fireEvent.change(await screen.findByLabelText("Allowed spices, separated by commas"), {
      target: { value: "Cumin, Paprika" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save approved spices" }));
    await waitFor(() =>
      expect(api.menuApi).toHaveBeenCalledWith(
        "account/approved-spices",
        { spices: ["Cumin", "Paprika"], expectedVersion: 1 },
        "PUT",
      ),
    );
  });
  it("shows API failures instead of pretending a save succeeded", async () => {
    api.menuApi.mockRejectedValue(new Error("The menu changed. Reload."));
    api.fetchMenuWorkspace.mockResolvedValue({ ...workspace, menus: [menu] });
    render(<WeeklyMenusPage role="CUSTOMER" />);
    fireEvent.click(await screen.findByRole("button", { name: "Approve this weekly menu" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The menu changed. Reload.");
  });
});
