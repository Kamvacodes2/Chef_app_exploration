import type { Metadata } from "next";
import { TestimonialSubmissionForm } from "@/features/testimonials/TestimonialSubmissionForm";

export const metadata: Metadata = {
  title: "Share Your Experience | Chefmate",
  description: "Share your Chefmate private chef experience with photos and video reviews."
};

export default function ShareExperiencePage() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-cream)] py-12 px-4 sm:px-6 lg:px-8">
      <TestimonialSubmissionForm />
    </div>
  );
}
