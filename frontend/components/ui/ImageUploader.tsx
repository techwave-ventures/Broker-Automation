"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImagePlus, Loader2, AlertCircle, Star } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface UploadedImage {
  url: string;
  /** true while the PUT to S3 is in progress */
  uploading: boolean;
  /** error message if upload failed */
  error?: string;
  /** local blob URL for preview before upload finishes */
  preview: string;
}

interface ImageUploaderProps {
  /** Initial images to display (already-saved URLs from the DB) */
  initialImages?: string[];
  /** Max total images including cover. Default: 10 */
  maxImages?: number;
  /** Called whenever the image list changes. First element is the cover. */
  onImagesChange: (cover: string, gallery: string[]) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Helper ───────────────────────────────────────────────────────────────────

function buildInitialImages(urls: string[]): UploadedImage[] {
    return urls.filter(Boolean).map((url) => ({
        url,
        uploading: false,
        preview: url,
    }));
}

async function requestPresignedUrl(filename: string, contentType: string, fileSize: number) {
    const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType, fileSize }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Failed to get upload URL");
    }
    return res.json() as Promise<{ uploadUrl: string; publicUrl: string }>;
}

/**
 * Upload a file directly to S3 using the native XMLHttpRequest API.
 *
 * We intentionally avoid window.fetch here because browser extensions
 * (ad-blockers, VPNs, proxy tools) commonly monkey-patch window.fetch and
 * silently fail on cross-origin PUT requests to third-party origins like S3.
 * XMLHttpRequest is not patched by these extensions in the same way, making
 * it a reliable fallback for direct-to-S3 uploads.
 */
function xhrPutToS3(url: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);
        xhr.setRequestHeader("Content-Type", file.type);
        // Abort if S3 takes longer than 60 s (large files may need more time)
        xhr.timeout = 60_000;
        xhr.onload = () => {
            // S3 returns 200 on success; anything else is a failure
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`S3 upload failed (HTTP ${xhr.status})`));
            }
        };
        xhr.onerror = () => reject(new Error("S3 upload failed (network error)"));
        xhr.ontimeout = () => reject(new Error("S3 upload timed out"));
        xhr.send(file);
    });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ImageUploader({
    initialImages = [],
    maxImages = 10,
    onImagesChange,
}: ImageUploaderProps) {
    const [images, setImages] = useState<UploadedImage[]>(() =>
        buildInitialImages(initialImages)
    );
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Notify parent whenever the images array changes
    const notifyParent = useCallback((imgs: UploadedImage[]) => {
        const done = imgs.filter((i) => !i.uploading && !i.error && i.url);
        const [cover, ...gallery] = done.map((i) => i.url);
        onImagesChange(cover ?? "", gallery);
    }, [onImagesChange]);

    const uploadFile = useCallback(async (file: File, index: number) => {
        // Validate type
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setImages((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], uploading: false, error: "Unsupported file type. Use JPEG, PNG, WebP or HEIC." };
                return next;
            });
            return;
        }
        // Validate size
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setImages((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], uploading: false, error: `File too large. Max ${MAX_FILE_SIZE_MB} MB.` };
                return next;
            });
            return;
        }

        try {
            const { uploadUrl, publicUrl } = await requestPresignedUrl(file.name, file.type, file.size);

            // PUT directly to S3 via native XHR (not window.fetch) so that
            // browser extensions which monkey-patch fetch cannot interfere.
            await xhrPutToS3(uploadUrl, file);

            setImages((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], url: publicUrl, uploading: false };
                notifyParent(next);
                return next;
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Upload failed";
            setImages((prev) => {
                const next = [...prev];
                next[index] = { ...next[index], uploading: false, error: message };
                return next;
            });
        }
    }, [notifyParent]);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const arr = Array.from(files);
        setImages((prev) => {
            const slots = maxImages - prev.length;
            if (slots <= 0) return prev;
            const toAdd = arr.slice(0, slots);
            const next = [...prev];
            toAdd.forEach((file) => {
                const preview = URL.createObjectURL(file);
                const idx = next.length;
                next.push({ url: "", uploading: true, preview });
                // Upload asynchronously (sequential by index)
                uploadFile(file, idx);
            });
            return next;
        });
    }, [maxImages, uploadFile]);

    const removeImage = (idx: number) => {
        setImages((prev) => {
            // Revoke local blob URL if applicable
            const img = prev[idx];
            if (img.preview && img.preview.startsWith("blob:")) {
                URL.revokeObjectURL(img.preview);
            }
            const next = prev.filter((_, i) => i !== idx);
            notifyParent(next);
            return next;
        });
    };

    const moveToFirst = (idx: number) => {
        setImages((prev) => {
            const next = [...prev];
            const [item] = next.splice(idx, 1);
            next.unshift(item);
            notifyParent(next);
            return next;
        });
    };

    // Drag-and-drop handlers
    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    };

    const canAddMore = images.length < maxImages;

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            {canAddMore && (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`
                        relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                        transition-all duration-200 select-none
                        ${isDragging
                            ? "border-primary bg-primary/10 scale-[1.01]"
                            : "border-border bg-card hover:border-primary/60 hover:bg-muted/50"
                        }
                    `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept={ACCEPTED_TYPES.join(",")}
                        className="hidden"
                        onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                    <div className="flex flex-col items-center gap-3">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? "bg-primary/20" : "bg-muted"}`}>
                            {isDragging
                                ? <Upload className="h-7 w-7 text-primary animate-bounce" />
                                : <ImagePlus className="h-7 w-7 text-foreground/40" />
                            }
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground/80">
                                {isDragging ? "Drop images here" : "Drag & drop photos here"}
                            </p>
                            <p className="text-xs text-foreground/50 mt-1">
                                or <span className="text-primary font-medium">browse</span> · JPEG, PNG, WebP, HEIC · Max {MAX_FILE_SIZE_MB} MB each
                            </p>
                        </div>
                        <p className="text-xs text-foreground/40">
                            {images.length} / {maxImages} images · First image is the cover photo
                        </p>
                    </div>
                </div>
            )}

            {/* Thumbnail Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {images.map((img, idx) => (
                        <div
                            key={`${img.preview}-${idx}`}
                            className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border"
                        >
                            {/* Cover badge */}
                            {idx === 0 && !img.uploading && !img.error && (
                                <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                                    <Star className="h-2.5 w-2.5 fill-current" /> Cover
                                </div>
                            )}

                            {/* Preview image */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={img.preview || img.url}
                                alt={`Property image ${idx + 1}`}
                                className={`w-full h-full object-cover transition-all duration-300 ${img.uploading ? "opacity-40 blur-[2px]" : "opacity-100"}`}
                            />

                            {/* Uploading overlay */}
                            {img.uploading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-1" />
                                    <span className="text-[10px] font-semibold text-foreground/70">Uploading…</span>
                                </div>
                            )}

                            {/* Error overlay */}
                            {img.error && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/20 backdrop-blur-sm p-2">
                                    <AlertCircle className="h-5 w-5 text-destructive mb-1" />
                                    <span className="text-[10px] font-semibold text-destructive text-center leading-tight">{img.error}</span>
                                </div>
                            )}

                            {/* Hover actions */}
                            {!img.uploading && !img.error && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    {idx !== 0 && (
                                        <button
                                            type="button"
                                            onClick={() => moveToFirst(idx)}
                                            title="Set as cover"
                                            className="h-8 w-8 rounded-full bg-white/20 hover:bg-primary/80 text-white flex items-center justify-center transition-colors"
                                        >
                                            <Star className="h-3.5 w-3.5 fill-current" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        title="Remove image"
                                        className="h-8 w-8 rounded-full bg-white/20 hover:bg-destructive/80 text-white flex items-center justify-center transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Remove button always visible for error state */}
                            {img.error && (
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add more tile */}
                    {canAddMore && images.length > 0 && (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/60 hover:bg-muted/50 flex flex-col items-center justify-center gap-2 text-foreground/40 hover:text-primary transition-all"
                        >
                            <ImagePlus className="h-6 w-6" />
                            <span className="text-[10px] font-semibold">Add More</span>
                        </button>
                    )}
                </div>
            )}

            {!canAddMore && (
                <p className="text-xs text-foreground/50 text-center">
                    Maximum of {maxImages} images reached.
                </p>
            )}
        </div>
    );
}
