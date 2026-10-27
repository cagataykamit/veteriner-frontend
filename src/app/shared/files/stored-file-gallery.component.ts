import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import type { StoredFileVm } from '@/app/shared/files/stored-file.model';
import { formatFileSize } from '@/app/shared/files/stored-file.utils';
import { StoredFilesService } from '@/app/shared/files/stored-files.service';
import { triggerBlobDownload } from '@/app/shared/utils/file-download.utils';

/** Açılan PDF sekmesindeki blob adresi bu süre sonra serbest bırakılır (bellekte tutulmaz). */
const PDF_URL_REVOKE_MS = 60_000;

/**
 * Sahip kaydın dosyaları (IMAGING_API_CONTRACT.md §5): görüntüler kısa ömürlü imzalı URL ile tembel yüklenir (`loading="lazy"`,
 * blob tutulmaz) ve büyütülerek (lightbox) incelenir; PDF Bearer ile alınıp tarayıcının görüntüleyicisinde açılır; her dosya indirilebilir.
 * İmzalı URL süresi dolarsa (görüntü yüklenemezse) bir kez yenilenir. Alt metin: `altBase` (tür + tarih) ve sıra.
 */
@Component({
    selector: 'app-stored-file-gallery',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, DialogModule],
    template: `
        @if (files().length === 0) {
            <p class="text-sm text-muted-color m-0" data-testid="file-gallery-empty">{{ emptyText() }}</p>
        } @else {
            <ul class="list-none m-0 p-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="file-gallery">
                @for (file of files(); track file.id; let i = $index) {
                    <li class="rounded-border border border-surface-200 dark:border-surface-700 p-2 flex flex-col gap-2 min-w-0">
                        @if (file.kind === 'Image') {
                            <button
                                type="button"
                                class="stored-file-thumb"
                                [attr.aria-label]="altText(i) + ' — büyüt'"
                                (click)="openLightbox(i)"
                                data-testid="file-thumb"
                            >
                                @if (urls()[file.id]; as url) {
                                    <img [src]="url" [alt]="altText(i)" loading="lazy" decoding="async" (error)="onImageError(file)" />
                                } @else {
                                    <i class="pi pi-image text-3xl text-muted-color" aria-hidden="true"></i>
                                }
                            </button>
                        } @else {
                            <button type="button" class="stored-file-thumb" [attr.aria-label]="file.fileName + ' — PDF aç'" (click)="openPdf(file)" data-testid="file-pdf">
                                <i class="pi pi-file-pdf text-3xl text-red-500" aria-hidden="true"></i>
                            </button>
                        }
                        <div class="text-xs min-w-0">
                            <div class="font-medium break-all">{{ file.fileName }}</div>
                            <div class="text-muted-color">{{ size(file.sizeBytes) }}</div>
                        </div>
                        <div class="flex gap-1">
                            @if (file.kind === 'Pdf') {
                                <button pButton type="button" size="small" [text]="true" (click)="openPdf(file)"><i class="p-button-icon pi pi-external-link"></i>Aç</button>
                            }
                            <button
                                pButton
                                type="button"
                                size="small"
                                [text]="true"
                                [attr.aria-label]="file.fileName + ' indir'"
                                (click)="download(file)"
                            ><i class="p-button-icon pi pi-download"></i>İndir</button>
                        </div>
                    </li>
                }
            </ul>
        }
        @if (error()) {
            <p class="text-red-500 text-sm mt-2 mb-0" role="alert">{{ error() }}</p>
        }

        <p-dialog
            [(visible)]="lightboxOpen"
            [modal]="true"
            [dismissableMask]="true"
            [header]="lightboxTitle()"
            [style]="{ width: 'min(1100px, 96vw)' }"
            (onHide)="lightboxIndex.set(null)"
        >
            @if (lightboxFile(); as f) {
                <div class="flex flex-col items-center gap-3">
                    @if (urls()[f.id]; as url) {
                        <img [src]="url" [alt]="altText(lightboxImageIndex())" class="stored-file-lightbox-img" (error)="onImageError(f)" />
                    }
                    @if (images().length > 1) {
                        <div class="flex gap-2">
                            <button pButton type="button" severity="secondary" [text]="true" (click)="step(-1)"><i class="p-button-icon pi pi-chevron-left"></i>Önceki</button>
                            <span class="text-sm text-muted-color self-center">{{ lightboxImageIndex() + 1 }} / {{ images().length }}</span>
                            <button pButton type="button" severity="secondary" [text]="true" (click)="step(1)">Sonraki<i class="p-button-icon pi pi-chevron-right"></i></button>
                        </div>
                    }
                </div>
            }
        </p-dialog>
    `,
    styles: `
        .stored-file-thumb {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 8rem;
            width: 100%;
            overflow: hidden;
            border: 0;
            border-radius: var(--p-content-border-radius);
            background: var(--p-content-hover-background);
            cursor: pointer;
        }

        .stored-file-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .stored-file-lightbox-img {
            max-width: 100%;
            max-height: 75vh;
            object-fit: contain;
        }
    `
})
export class StoredFileGalleryComponent {
    readonly ownerPath = input.required<string>();
    readonly files = input<readonly StoredFileVm[]>([]);
    /** Erişilebilir ad tabanı (ör. "Röntgen, 22.10.2026"). */
    readonly altBase = input('Görüntü');
    readonly emptyText = input('Dosya yok.');

    private readonly filesService = inject(StoredFilesService);
    private readonly destroyRef = inject(DestroyRef);

    readonly urls = signal<Record<string, string>>({});
    readonly error = signal<string | null>(null);
    readonly lightboxIndex = signal<number | null>(null);
    lightboxOpen = false;

    readonly images = computed(() => this.files().filter((f) => f.kind === 'Image'));
    readonly lightboxFile = computed(() => {
        const i = this.lightboxIndex();

        return i === null ? null : (this.files()[i] ?? null);
    });
    readonly lightboxImageIndex = computed(() => {
        const f = this.lightboxFile();

        return f ? this.images().findIndex((x) => x.id === f.id) : 0;
    });
    readonly lightboxTitle = computed(() => this.lightboxFile()?.fileName ?? '');

    protected readonly size = formatFileSize;
    private readonly refreshed = new Set<string>();
    private readonly inflight = new Set<string>();

    constructor() {
        effect(() => {
            const owner = this.ownerPath();
            const images = this.images();

            untracked(() => images.filter((f) => !this.urls()[f.id]).forEach((f) => this.loadUrl(owner, f.id)));
        });
    }

    altText(imageIndex: number): string {
        const total = this.images().length;

        return total > 1 ? `${this.altBase()} — görüntü ${imageIndex + 1}/${total}` : this.altBase();
    }

    openLightbox(fileIndex: number): void {
        this.lightboxIndex.set(fileIndex);
        this.lightboxOpen = true;
    }

    step(delta: number): void {
        const images = this.images();
        const next = images[(this.lightboxImageIndex() + delta + images.length) % images.length];

        this.lightboxIndex.set(this.files().findIndex((f) => f.id === next.id));
    }

    /** Süresi dolmuş imzalı URL: bir kez yenilenir, yine olmazsa simge kalır. */
    onImageError(file: StoredFileVm): void {
        if (this.refreshed.has(file.id)) {
            return;
        }

        this.refreshed.add(file.id);
        this.urls.update((u) => {
            const copy = { ...u };

            delete copy[file.id];

            return copy;
        });
        this.loadUrl(this.ownerPath(), file.id);
    }

    openPdf(file: StoredFileVm): void {
        // Açılır pencere engelleyicisine takılmamak için sekme tıklama anında açılır, içerik gelince yönlendirilir.
        const tab = window.open('', '_blank');

        this.error.set(null);
        this.filesService
            .content(this.ownerPath(), file.id, false)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ blob }) => {
                    const url = URL.createObjectURL(blob);

                    if (tab) {
                        tab.location.href = url;
                    } else {
                        triggerBlobDownload(blob, file.fileName);
                    }

                    setTimeout(() => URL.revokeObjectURL(url), PDF_URL_REVOKE_MS);
                },
                error: (e: Error) => {
                    tab?.close();
                    this.error.set(e.message);
                }
            });
    }

    download(file: StoredFileVm): void {
        this.error.set(null);
        this.filesService
            .content(this.ownerPath(), file.id, true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ blob, fileName }) => triggerBlobDownload(blob, fileName ?? file.fileName),
                error: (e: Error) => this.error.set(e.message)
            });
    }

    private loadUrl(ownerPath: string, fileId: string): void {
        if (this.inflight.has(fileId)) {
            return;
        }

        this.inflight.add(fileId);
        this.filesService
            .accessUrl(ownerPath, fileId)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => this.inflight.delete(fileId))
            )
            .subscribe({
                next: (url) => this.urls.update((u) => ({ ...u, [fileId]: url })),
                error: (e: Error) => this.error.set(e.message)
            });
    }
}
