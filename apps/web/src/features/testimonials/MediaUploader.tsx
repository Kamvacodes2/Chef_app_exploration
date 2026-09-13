"use client";

import React, { useRef, useState, useEffect } from "react";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_PHOTOS = 5;

export interface AttachedMedia {
  id: string;
  file: File;
  type: "IMAGE" | "VIDEO";
  previewUrl: string;
  sizeFormatted: string;
}

interface MediaUploaderProps {
  photos: AttachedMedia[];
  video: AttachedMedia | null;
  onPhotosChange: (photos: AttachedMedia[]) => void;
  onVideoChange: (video: AttachedMedia | null) => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaUploader({
  photos,
  video,
  onPhotosChange,
  onVideoChange,
  disabled = false
}: MediaUploaderProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const newPhotos: AttachedMedia[] = [...photos];
    let newVideo: AttachedMedia | null = video;

    const files = Array.from(fileList);
    for (const file of files) {
      if (!file) continue;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (isImage) {
        if (newPhotos.length >= MAX_PHOTOS) {
          setErrorMessage(`You can upload a maximum of ${MAX_PHOTOS} photos.`);
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setErrorMessage(`Photo "${file.name}" exceeds the 15MB limit.`);
          continue;
        }
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(previewUrl);
        newPhotos.push({
          id: Math.random().toString(36).substring(2),
          file,
          type: "IMAGE",
          previewUrl,
          sizeFormatted: formatBytes(file.size)
        });
      } else if (isVideo) {
        if (file.size > MAX_VIDEO_BYTES) {
          setErrorMessage(`Video "${file.name}" exceeds the 100MB limit.`);
          continue;
        }
        if (newVideo) {
          URL.revokeObjectURL(newVideo.previewUrl);
        }
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.push(previewUrl);
        newVideo = {
          id: Math.random().toString(36).substring(2),
          file,
          type: "VIDEO",
          previewUrl,
          sizeFormatted: formatBytes(file.size)
        };
      } else {
        setErrorMessage(`Unsupported file format for "${file.name}". Please upload JPG, PNG, WEBP, MP4, MOV, or WEBM.`);
      }
    }

    onPhotosChange(newPhotos);
    onVideoChange(newVideo);
  };

  const removePhoto = (id: string) => {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onPhotosChange(photos.filter((p) => p.id !== id));
  };

  const removeVideo = () => {
    if (video) URL.revokeObjectURL(video.previewUrl);
    onVideoChange(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-[var(--color-oxblood)]">
          Photos & Video Review <span className="text-xs font-normal text-stone-500">(Optional)</span>
        </label>
        <span className="text-xs text-stone-500">
          Photos (up to 5, max 15MB) • Video (1 max, up to 100MB)
        </span>
      </div>

      {/* Hidden inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          isDragOver
            ? "border-[var(--color-oxblood)] bg-[var(--color-warm-cream)]/80 scale-[1.01]"
            : "border-stone-300 bg-stone-50/70 hover:border-stone-400 hover:bg-stone-50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="mb-3 flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warm-cream)] text-2xl text-[var(--color-oxblood)] shadow-sm">
            📷
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warm-cream)] text-2xl text-[var(--color-oxblood)] shadow-sm">
            🎬
          </span>
        </div>

        <p className="text-sm font-medium text-stone-800">
          Drag & drop your dishes and video review here, or
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={disabled || photos.length >= MAX_PHOTOS}
            onClick={() => photoInputRef.current?.click()}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            + Add Photos ({photos.length}/{MAX_PHOTOS})
          </button>
          <button
            type="button"
            disabled={disabled || video !== null}
            onClick={() => videoInputRef.current?.click()}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
          >
            {video ? "✓ Video Attached" : "+ Add Video (up to 100MB)"}
          </button>
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Preview Cards */}
      {(photos.length > 0 || video) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {/* Photos */}
          {photos.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-sm"
            >
              <img
                src={item.previewUrl}
                alt="Upload preview"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removePhoto(item.id)}
                  className="rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700"
                  aria-label="Remove photo"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                {item.sizeFormatted}
              </span>
            </div>
          ))}

          {/* Video Preview */}
          {video && (
            <div className="group relative aspect-square overflow-hidden rounded-xl border-2 border-[var(--color-oxblood)] bg-stone-900 shadow-sm">
              <video
                src={video.previewUrl}
                className="h-full w-full object-cover"
                controls={false}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 p-2 text-center text-white">
                <span className="text-2xl">🎬</span>
                <span className="mt-1 text-xs font-semibold">Video Review</span>
                <span className="text-[10px] text-stone-200">{video.sizeFormatted}</span>
              </div>
              <button
                type="button"
                onClick={removeVideo}
                className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700 z-10"
                aria-label="Remove video"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
