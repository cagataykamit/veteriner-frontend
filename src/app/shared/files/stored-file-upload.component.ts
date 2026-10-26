import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import type { StoredFileVm } from '@/app/shared/files/stored-file.model';
import { formatFileSize, precheckStoredFile, STORED_FILE_ACCEPT, STORED_FILE_MAX_BYTES } from '@/app/shared/files/stored-file.utils';
import { StoredFilesService } from '@/app/shared/files/stored-files.service';

type QueueStatus = 'pending' | 'uploading' | 'done' | 'failed' | 'rejected';

interface QueueItem {
    readonly key: number;
    /** Yüklendikten sonra bırakılır (büyük dosya bellekte tutulmaz). */
    file: File | null;
    readonly name: string;
    readonly size: number;
    status: QueueStatus;
    progress: number;
    error: string | null;
}

let nextKey = 1;

/**
 * Dosya seçme / sürükle-bırak ve yükleme kuyruğu (IMAGING_API_CONTRACT.md §5, ASAMA6 L6). Seçilen dosyalar tür ve boyut ön kontrolünden
 * geçer; yükleme sırayla, ilerleme çubuğuyla yapılır. Başarısız dosya kuyrukta kalır ve "Yeniden dene" ile tekrar gönderilir; çağıranın
 * formu ve girilen metin etkilenmez. `ownerPath` verilip `autoUpload` açıksa seçim anında yüklenir (detay sayfası); değilse çağıran
 * kaydı oluşturduktan sonra `uploadPending(ownerPath)` çağırır (yeni kayıt formu).
 */
@Component({
    selector: 'app-stored-file-upload',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, ProgressBarModule],
    template: `
        <div
            class="stored-file-dropzone rounded-border border-2 border-dashed p-4 text-center"
            [class.stored-file-dropzone--active]="dragActive()"
            [class.opacity-60]="disabled()"
            data-testid="file-dropzone"
            (dragover)="onDragOver($event)"
            (dragleave)="dragActive.set(false)"
            (drop)="onDrop($event)"
        >
            <i class="pi pi-cloud-upload text-2xl text-muted-color" aria-hidden="true"></i>
            <p class="mt-2 mb-2 text-sm" [id]="hintId">
                Dosyaları buraya sürükleyin veya seçin. JPEG, PNG, WebP, PDF; en çok {{ maxSizeLabel }}.
            </p>
            <p-button
                type="button"
                label="Dosya seç"
                icon="pi pi-folder-open"
                severity="secondary"
                [outlined]="true"
                size="small"
                [disabled]="disabled()"
                [attr.aria-describedby]="hintId"
                (onClick)="picker.click()"
            />
            <input #picker type="file" class="hidden" multiple [accept]="accept" (change)="onPicked($event)" data-testid="file-input" />
        </div>

        @if (visibleItems().length > 0) {
            <ul class="list-none m-0 mt-3 p-0 flex flex-col gap-2" aria-label="Yüklenecek dosyalar" data-testid="file-queue">
                @for (item of visibleItems(); track item.key) {
                    <li class="rounded-border border border-surface-200 dark:border-surface-700 p-2" [attr.data-status]="item.status">
                        <div class="flex flex-wrap items-center gap-2">
                            <i [class]="item.status === 'done' ? 'pi pi-check-circle text-green-600' : item.status === 'failed' || item.status === 'rejected' ? 'pi pi-exclamation-circle text-red-500' : 'pi pi-file'" aria-hidden="true"></i>
                            <span class="font-medium break-all flex-1 min-w-0">{{ item.name }}</span>
                            <span class="text-xs text-muted-color">{{ size(item.size) }}</span>
                            @if (item.status === 'failed') {
                                <p-button type="button" label="Yeniden dene" icon="pi pi-refresh" size="small" [text]="true" [disabled]="busy() || !ownerPath()" (onClick)="retry(item)" />
                            }
                            @if (item.status !== 'uploading' && item.status !== 'done') {
                                <p-button
                                    type="button"
                                    icon="pi pi-times"
                                    size="small"
                                    [text]="true"
                                    severity="secondary"
                                    [attr.aria-label]="item.name + ' dosyasını listeden çıkar'"
                                    (onClick)="remove(item)"
                                />
                            }
                        </div>
                        @if (item.status === 'uploading') {
                            <p-progressbar [value]="item.progress" [showValue]="true" class="mt-2" [attr.aria-label]="item.name + ' yükleniyor'" />
                        }
                        @if (item.error) {
                            <small class="text-red-500 block mt-1" role="alert">{{ item.error }}</small>
                        }
                    </li>
                }
            </ul>
        }
    `,
    styles: `
        .stored-file-dropzone {
            border-color: var(--p-content-border-color);
        }

        .stored-file-dropzone--active {
            border-color: var(--p-primary-color);
            background: var(--p-highlight-background);
        }
    `
})
export class StoredFileUploadComponent {
    /** Sahip kaydın API kökü; yoksa dosyalar yalnız kuyruğa alınır. */
    readonly ownerPath = input<string | null>(null);
    readonly autoUpload = input(false);
    readonly disabled = input(false);
    readonly maxBytes = input(STORED_FILE_MAX_BYTES);
    /** Her başarılı yükleme. */
    readonly uploaded = output<StoredFileVm>();

    protected readonly accept = STORED_FILE_ACCEPT;
    protected readonly hintId = `file-hint-${nextKey++}`;
    protected readonly maxSizeLabel = formatFileSize(STORED_FILE_MAX_BYTES).replace(',0', '');
    protected readonly size = formatFileSize;

    readonly items = signal<QueueItem[]>([]);
    /** Otomatik yüklemede biten dosya sayfadaki dosya listesinde zaten görünür; kuyrukta tekrarlanmaz. */
    protected readonly visibleItems = computed(() => (this.autoUpload() ? this.items().filter((i) => i.status !== 'done') : this.items()));
    readonly dragActive = signal(false);
    readonly busy = signal(false);
    /** Yüklenmeyi bekleyen veya başarısız (yeniden denenebilir) dosya sayısı. */
    readonly pendingCount = computed(() => this.items().filter((i) => i.status === 'pending' || i.status === 'failed').length);
    readonly failedCount = computed(() => this.items().filter((i) => i.status === 'failed').length);

    private readonly filesService = inject(StoredFilesService);
    private readonly destroyRef = inject(DestroyRef);

    onDragOver(event: DragEvent): void {
        event.preventDefault();

        if (!this.disabled()) {
            this.dragActive.set(true);
        }
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        this.dragActive.set(false);

        if (!this.disabled()) {
            this.addFiles(Array.from(event.dataTransfer?.files ?? []));
        }
    }

    onPicked(event: Event): void {
        const inputEl = event.target as HTMLInputElement;

        this.addFiles(Array.from(inputEl.files ?? []));
        inputEl.value = '';
    }

    addFiles(files: readonly File[]): void {
        const added = files.map((file): QueueItem => {
            const error = precheckStoredFile(file, this.maxBytes());

            return { key: nextKey++, file: error ? null : file, name: file.name, size: file.size, status: error ? 'rejected' : 'pending', progress: 0, error };
        });

        this.items.update((list) => [...list, ...added]);

        const owner = this.ownerPath();

        if (this.autoUpload() && owner) {
            void this.uploadPending(owner);
        }
    }

    remove(item: QueueItem): void {
        this.items.update((list) => list.filter((i) => i.key !== item.key));
    }

    retry(item: QueueItem): void {
        const owner = this.ownerPath();

        if (owner) {
            this.patch(item.key, { status: 'pending', error: null });
            void this.uploadPending(owner);
        }
    }

    /** Bekleyen ve başarısız dosyaları sırayla yükler; başarısız kalan sayısını döner (0 = hepsi tamam). */
    async uploadPending(ownerPath: string): Promise<number> {
        if (this.busy()) {
            return this.failedCount();
        }

        this.busy.set(true);

        try {
            for (const item of this.items().filter((i) => (i.status === 'pending' || i.status === 'failed') && i.file)) {
                await this.uploadOne(ownerPath, item);
            }
        } finally {
            this.busy.set(false);
        }

        return this.failedCount();
    }

    private uploadOne(ownerPath: string, item: QueueItem): Promise<void> {
        this.patch(item.key, { status: 'uploading', progress: 0, error: null });

        return new Promise<void>((resolve) => {
            this.filesService
                .upload(ownerPath, item.file!)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                    next: (event) => {
                        if (event.type === 'progress') {
                            this.patch(item.key, { progress: event.percent });

                            return;
                        }

                        this.patch(item.key, { status: 'done', progress: 100, file: null });
                        this.uploaded.emit(event.file);
                    },
                    error: (e: unknown) => {
                        this.patch(item.key, { status: 'failed', error: e instanceof Error ? e.message : 'Dosya yüklenemedi.' });
                        resolve();
                    },
                    complete: () => resolve()
                });
        });
    }

    private patch(key: number, changes: Partial<QueueItem>): void {
        this.items.update((list) => list.map((i) => (i.key === key ? { ...i, ...changes } : i)));
    }
}
