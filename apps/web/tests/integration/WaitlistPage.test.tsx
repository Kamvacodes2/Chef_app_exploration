import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitlistPage } from "@/features/waitlist/WaitlistPage";

const api = vi.hoisted(() => ({
  joinWaitlist: vi.fn(),
}));

vi.mock("@/features/waitlist/api/waitlistClient", () => api);

beforeEach(() => {
  api.joinWaitlist.mockReset();
  api.joinWaitlist.mockResolvedValue(undefined);
});

describe("WaitlistPage", () => {
  it("submits name, contact details, city and cooking frequency", async () => {
    render(<WaitlistPage />);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Nomsa Dlamini" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nomsa@example.test" } });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "+27 82 123 4567" },
    });
    fireEvent.change(screen.getByLabelText("Your city or area"), {
      target: { value: "Port Elizabeth" },
    });
    fireEvent.click(screen.getByLabelText("Twice a week"));
    fireEvent.click(screen.getByRole("button", { name: "Join the waiting list" }));

    await waitFor(() => expect(api.joinWaitlist).toHaveBeenCalledTimes(1));
    expect(api.joinWaitlist).toHaveBeenCalledWith({
      displayName: "Nomsa Dlamini",
      email: "nomsa@example.test",
      phone: "+27 82 123 4567",
      city: "Port Elizabeth",
      serviceFrequency: "TWICE_A_WEEK",
    });
    expect(await screen.findByText("You're on the list!")).toBeInTheDocument();
  });

  it("stores a typed area when the person picks Other", async () => {
    render(<WaitlistPage />);

    fireEvent.change(screen.getByLabelText("Your city or area"), { target: { value: "Other" } });
    fireEvent.change(screen.getByLabelText("Tell us your area"), { target: { value: "George" } });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Thabo Mokoena" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "thabo@example.test" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "0821234567" } });
    fireEvent.click(screen.getByLabelText("4 times a week"));
    fireEvent.click(screen.getByRole("button", { name: "Join the waiting list" }));

    await waitFor(() => expect(api.joinWaitlist).toHaveBeenCalledTimes(1));
    expect(api.joinWaitlist).toHaveBeenCalledWith(
      expect.objectContaining({ city: "George", serviceFrequency: "FOUR_TIMES_A_WEEK" }),
    );
  });

  it("keeps the submit disabled until every field is filled in", () => {
    render(<WaitlistPage />);

    const submit = screen.getByRole("button", { name: "Join the waiting list" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Nomsa Dlamini" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nomsa@example.test" } });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "+27 82 123 4567" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Your city or area"), {
      target: { value: "Cape Town" },
    });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByLabelText("Once a week"));
    expect(submit).toBeEnabled();
  });

  it("surfaces an API error instead of pretending success", async () => {
    api.joinWaitlist.mockRejectedValue(new Error("Server unavailable"));

    render(<WaitlistPage />);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Nomsa Dlamini" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nomsa@example.test" } });
    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "+27 82 123 4567" },
    });
    fireEvent.change(screen.getByLabelText("Your city or area"), { target: { value: "Durban" } });
    fireEvent.click(screen.getByLabelText("Twice a week"));
    fireEvent.click(screen.getByRole("button", { name: "Join the waiting list" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server unavailable");
    expect(screen.queryByText("You're on the list!")).not.toBeInTheDocument();
  });
});
