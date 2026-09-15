"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  fetchOperationsTestimonials,
  moderateTestimonial,
  deleteOperationsTestimonial,
  getTestimonialMediaUrl,
  type Testimonial,
} from "@/features/testimonials/api/testimonialClient";

type TabType = "ALL" | "PENDING" | "APPROVED" | "FEATURED" | "REJECTED";

export default function AdminTestimonialsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("PENDING");
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);

  // Moderation form state in modal
  const [modalStatus, setModalStatus] = useState<"PENDING" | "APPROVED" | "FEATURED" | "REJECTED">(
    "APPROVED",
  );
  const [modalNotes, setModalNotes] = useState("");
  const [modalFeaturedOrder, setModalFeaturedOrder] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchOperationsTestimonials({
        status: activeTab === "ALL" ? undefined : activeTab,
        search: searchQuery.trim() || undefined,
      });
      setTestimonials(res.items);
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load testimonials.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const openModerationModal = (item: Testimonial) => {
    setSelectedTestimonial(item);
    setModalStatus(item.status);
    setModalNotes(item.adminNotes || "");
    setModalFeaturedOrder(item.featuredOrder != null ? item.featuredOrder : "");
  };

  const handleSaveModeration = async (statusOverride?: "APPROVED" | "FEATURED" | "REJECTED") => {
    if (!selectedTestimonial) return;
    const targetStatus = statusOverride || modalStatus;

    try {
      setIsSaving(true);
      await moderateTestimonial(selectedTestimonial.id, {
        status: targetStatus,
        featuredOrder:
          targetStatus === "FEATURED" && modalFeaturedOrder !== ""
            ? Number(modalFeaturedOrder)
            : null,
        adminNotes: modalNotes.trim() || null,
      });

      setActionMessage({ type: "success", text: `Testimonial updated to ${targetStatus}.` });
      setSelectedTestimonial(null);
      await loadData();
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to moderate testimonial.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to permanently delete this testimonial and all attached media?",
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);
      await deleteOperationsTestimonial(id);
      setActionMessage({ type: "success", text: "Testimonial deleted successfully." });
      setSelectedTestimonial(null);
      await loadData();
    } catch (err: unknown) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to delete testimonial.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = (status: Testimonial["status"]) => {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
          status === "APPROVED"
            ? "bg-emerald-100 text-emerald-800"
            : status === "FEATURED"
              ? "bg-amber-100 text-amber-800 border border-amber-300"
              : status === "REJECTED"
                ? "bg-red-100 text-red-800"
                : "bg-stone-100 text-stone-800"
        }`}
      >
        {status === "FEATURED" ? "★ FEATURED" : status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-oxblood)]">
            Testimonials & Customer Reviews
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Moderate public multi-media submissions, verify authentic experiences, and curate
            homepage social proof. Tap any review to inspect and moderate.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Status Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-4">
        <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0 sm:flex-wrap">
          {(
            [
              { key: "PENDING", label: "Pending Review" },
              { key: "APPROVED", label: "Approved" },
              { key: "FEATURED", label: "Featured on Homepage" },
              { key: "REJECTED", label: "Rejected" },
              { key: "ALL", label: "All Reviews" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition shrink-0 ${
                activeTab === tab.key
                  ? "bg-[var(--color-oxblood)] text-white shadow-sm"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search reviewer or text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 sm:w-56 rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-900 placeholder-stone-400 focus:border-[var(--color-oxblood)] focus:ring-1 focus:ring-[var(--color-oxblood)] outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-stone-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-black transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Testimonials List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm font-medium text-stone-500">
          Loading testimonial queue...
        </div>
      ) : testimonials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
          No testimonials found in this view.
        </div>
      ) : (
        <>
          {/* Mobile Card List View (Phones & Small Tablets) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {testimonials.map((item) => {
              const photos = item.media.filter((m) => m.mediaType === "IMAGE");
              const video = item.media.find((m) => m.mediaType === "VIDEO");

              return (
                <article
                  key={item.id}
                  onClick={() => openModerationModal(item)}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-[var(--color-oxblood)]/40 hover:shadow-md cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">{item.reviewerName}</h3>
                      <p className="text-xs text-stone-500">
                        {[item.reviewerRole, item.reviewerLocation].filter(Boolean).join(" • ") ||
                          "Customer"}
                      </p>
                    </div>
                    {statusBadge(item.status)}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center text-amber-500 text-xs font-bold">
                      {"★".repeat(item.rating)}
                      <span className="text-stone-400 font-normal ml-1">({item.rating}/5)</span>
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {new Date(item.createdAt).toLocaleDateString("en-ZA")}
                    </span>
                  </div>

                  <h4 className="mt-2 text-xs font-bold text-stone-900">{item.title}</h4>
                  <p className="mt-1 text-xs text-stone-600 line-clamp-3 leading-relaxed">
                    {item.narrative}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      {photos.length > 0 && (
                        <span className="inline-flex items-center rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                          📷 {photos.length} photo{photos.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {video && (
                        <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                          🎬 1 video
                        </span>
                      )}
                      {photos.length === 0 && !video && (
                        <span className="text-[11px] text-stone-400">No media</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModerationModal(item);
                      }}
                      className="rounded-xl bg-[var(--color-oxblood)]/10 px-3 py-1 text-xs font-bold text-[var(--color-oxblood)] hover:bg-[var(--color-oxblood)] hover:text-white transition"
                    >
                      Review & Moderate →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop Table View (Scrollable with Clickable Rows) */}
          <div className="hidden md:block w-full overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-6 py-3.5">Reviewer</th>
                  <th className="px-6 py-3.5">Rating & Title</th>
                  <th className="px-6 py-3.5">Media</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {testimonials.map((item) => {
                  const photos = item.media.filter((m) => m.mediaType === "IMAGE");
                  const video = item.media.find((m) => m.mediaType === "VIDEO");

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openModerationModal(item)}
                      className="hover:bg-stone-50/90 transition cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-stone-900">{item.reviewerName}</div>
                        <div className="text-xs text-stone-500">
                          {[item.reviewerRole, item.reviewerLocation].filter(Boolean).join(" • ") ||
                            "Customer"}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-sm">
                        <div className="flex items-center text-amber-500 text-xs">
                          {"★".repeat(item.rating)}
                        </div>
                        <div className="font-medium text-stone-900 text-sm mt-0.5 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                          {item.narrative}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {photos.length > 0 && (
                            <span className="inline-flex items-center rounded-lg bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                              📷 {photos.length}
                            </span>
                          )}
                          {video && (
                            <span className="inline-flex items-center rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              🎬 1 video
                            </span>
                          )}
                          {photos.length === 0 && !video && (
                            <span className="text-xs text-stone-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{statusBadge(item.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-500">
                        {new Date(item.createdAt).toLocaleDateString("en-ZA")}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModerationModal(item);
                          }}
                          className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 hover:border-stone-400 transition"
                        >
                          Review / Moderate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Moderation Modal */}
      {selectedTestimonial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--color-oxblood)]">
                  Moderate Testimonial
                </h2>
                <p className="text-xs text-stone-500">
                  ID: {selectedTestimonial.id} • Submitted:{" "}
                  {new Date(selectedTestimonial.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTestimonial(null)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition text-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* Review Content */}
              <div className="rounded-2xl bg-stone-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-900">
                    {selectedTestimonial.reviewerName}
                  </span>
                  <span className="text-amber-500 font-bold">
                    {"★".repeat(selectedTestimonial.rating)} ({selectedTestimonial.rating}/5)
                  </span>
                </div>
                <div className="text-xs text-stone-500 mt-0.5">
                  {[selectedTestimonial.reviewerRole, selectedTestimonial.reviewerLocation]
                    .filter(Boolean)
                    .join(" • ") || "Customer"}
                </div>
                <h4 className="mt-3 font-semibold text-stone-900">{selectedTestimonial.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  {selectedTestimonial.narrative}
                </p>
              </div>

              {/* Media Previews */}
              {selectedTestimonial.media.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                    Attached Media ({selectedTestimonial.media.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedTestimonial.media.map((media) => {
                      const url = getTestimonialMediaUrl(media.storageKey);
                      if (media.mediaType === "IMAGE") {
                        return (
                          <div
                            key={media.id}
                            className="relative aspect-video overflow-hidden rounded-xl bg-stone-100 border border-stone-200"
                          >
                            <img
                              src={url}
                              alt={media.originalFilename}
                              className="h-full w-full object-cover"
                            />
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white hover:bg-black"
                            >
                              Zoom ↗
                            </a>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={media.id}
                          className="col-span-2 rounded-xl bg-stone-900 p-2 text-white"
                        >
                          <video src={url} controls className="max-h-48 w-full rounded-lg" />
                          <div className="mt-1 text-center text-xs text-stone-400">
                            {media.originalFilename} (
                            {Math.round(media.fileSizeBytes / (1024 * 1024))}MB)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Selector & Featured Order */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Status</label>
                  <select
                    value={modalStatus}
                    onChange={(e) =>
                      setModalStatus(
                        e.target.value as "PENDING" | "APPROVED" | "FEATURED" | "REJECTED",
                      )
                    }
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-sm outline-none focus:border-[var(--color-oxblood)]"
                  >
                    <option value="PENDING">PENDING (In Review)</option>
                    <option value="APPROVED">APPROVED (Public Wall)</option>
                    <option value="FEATURED">FEATURED (Hero / Homepage)</option>
                    <option value="REJECTED">REJECTED (Hidden)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Featured Display Priority{" "}
                    <span className="text-stone-400">(Lower = earlier)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1"
                    value={modalFeaturedOrder}
                    onChange={(e) =>
                      setModalFeaturedOrder(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-stone-300 p-2.5 text-sm outline-none focus:border-[var(--color-oxblood)]"
                  />
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Internal Operations Notes
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="e.g., Booking verified. High quality photography."
                  className="w-full rounded-xl border border-stone-300 p-2.5 text-sm outline-none focus:border-[var(--color-oxblood)]"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-stone-200 pt-4">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleDelete(selectedTestimonial.id)}
                  className="w-full sm:w-auto rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  Delete Testimonial
                </button>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveModeration("REJECTED")}
                    className="flex-1 sm:flex-none rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveModeration("APPROVED")}
                    className="flex-1 sm:flex-none rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveModeration("FEATURED")}
                    className="w-full sm:w-auto rounded-xl bg-[var(--color-oxblood)] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[var(--color-oxblood)]/90 disabled:opacity-50"
                  >
                    Feature on Homepage
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
