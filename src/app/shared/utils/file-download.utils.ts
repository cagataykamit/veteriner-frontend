/**
 * `Content-Disposition` başlığından dosya adı çıkarır (RFC 5987 basit eşleşme).
 */
export function fileNameFromContentDisposition(header: string | null | undefined): string | null {
    if (!header?.trim()) {
        return null;
    }
    const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(header.trim());
    const raw = m?.[1]?.trim();
    return raw ? decodeURIComponent(raw.replace(/["']/g, '')) : null;
}

/** Tarayıcı indirme diyaloğu — `HttpResponse<Blob>` veya ham `Blob`. */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
