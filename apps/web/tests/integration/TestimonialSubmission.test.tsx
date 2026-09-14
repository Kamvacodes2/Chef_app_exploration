import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestimonialSubmissionForm } from "../../src/features/testimonials/TestimonialSubmissionForm";
import * as client from "../../src/features/testimonials/api/testimonialClient";

describe("TestimonialSubmissionForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders form fields and validation requirements", () => {
    render(<TestimonialSubmissionForm />);

    expect(
      screen.getByRole("heading", { name: /share your chefmate experience/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/review title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your story/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit testimonial/i })).toBeInTheDocument();
  });

  it("submits the form successfully with valid inputs and consent", async () => {
    const user = userEvent.setup();
    const submitSpy = vi.spyOn(client, "submitTestimonialWithProgress").mockResolvedValue({
      id: "test-id-123",
      title: "Effortless weekend dinner",
      narrative: "Chef cooked an extraordinary meal and cleaned the kitchen thoroughly.",
      rating: 5,
      reviewerName: "Lindiwe Ndlovu",
      reviewerRole: "Host",
      reviewerLocation: "Camps Bay",
      socialConsent: true,
      status: "PENDING",
      featuredOrder: null,
      adminNotes: null,
      moderatedAt: null,
      moderatedByUserId: null,
      media: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<TestimonialSubmissionForm />);

    await user.type(screen.getByLabelText(/review title/i), "Effortless weekend dinner");
    await user.type(
      screen.getByLabelText(/your story/i),
      "Chef cooked an extraordinary meal and cleaned the kitchen thoroughly.",
    );
    await user.type(screen.getByLabelText(/your name/i), "Lindiwe Ndlovu");
    await user.click(screen.getByRole("checkbox"));

    await user.click(screen.getByRole("button", { name: /submit testimonial/i }));

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalled();
      expect(screen.getByText(/thank you for sharing/i)).toBeInTheDocument();
    });
  });
});
