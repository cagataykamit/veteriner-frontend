import { Component, computed, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { precheckImportFile } from '@/app/features/imports/utils/import-labels.utils';

/** Sürükle-bırak veya seçici ile tek dosya alır; tür ve boyut ön kontrolü yapar. Dosya içeriği okunmaz. */
@Component({
    selector: 'app-import-drop-zone',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div
            class="rounded-border border-2 p-4 text-center transition-colors"
            [class.border-dashed]="!file()"
            [class.border-primary]="dragging()"
            [class.border-surface-300]="!dragging() && !file()"
            [class.dark:border-surface-600]="!dragging() && !file()"
            [class.border-green-600]="!dragging() && !!file()"
            [class.bg-green-50]="!!file()"
            [class.dark:border-green-500]="!dragging() && !!file()"
            [class.dark:bg-green-950/30]="!!file()"
            [attr.data-selected]="file() ? 'true' : null"
            (dragover)="onDragOver($event)"
            (dragleave)="dragging.set(false)"
            (drop)="onDrop($event)"
        >
            <div class="font-medium">{{ label() }}</div>
            @if (description(); as d) {
                <div class="text-sm text-muted-color">{{ d }}</div>
            }
            @if (file(); as f) {
                <div class="text-sm break-words my-2"><i class="pi pi-check-circle mr-1 text-green-700 dark:text-green-400"></i>{{ f.name }} ({{ sizeText() }})</div>
                <button pButton type="button" size="small" severity="secondary" (click)="clear()"><i class="p-button-icon pi pi-times"></i>Dosyayı kaldır</button>
            } @else {
                <div class="text-sm text-muted-color my-2">{{ hint() }}</div>
                <button pButton type="button" size="small" severity="secondary" (click)="picker.click()"><i class="p-button-icon pi pi-upload"></i>Dosya seç</button>
            }
            <input #picker type="file" class="hidden" [accept]="extension()" [attr.aria-label]="label()" (change)="onPick($event)" />
            @if (error()) {
                <div class="text-sm text-danger mt-2" role="alert">{{ error() }}</div>
            }
        </div>
    `
})
export class ImportDropZoneComponent {
    readonly label = input.required<string>();
    /** Dosyadan ne geldiği; dosya seçildikten sonra da görünür. */
    readonly description = input<string | null>(null);
    readonly hint = input('Dosyayı buraya bırakın veya seçin (en fazla 10 MB).');
    readonly extension = input.required<'.xlsx' | '.csv'>();
    readonly file = input<File | null>(null);
    readonly fileChange = output<File | null>();

    protected readonly dragging = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly sizeText = computed(() => {
        const size = this.file()?.size ?? 0;

        return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
    });

    protected onDragOver(e: DragEvent): void {
        e.preventDefault();
        this.dragging.set(true);
    }

    protected onDrop(e: DragEvent): void {
        e.preventDefault();
        this.dragging.set(false);
        this.accept(e.dataTransfer?.files?.[0] ?? null);
    }

    protected onPick(e: Event): void {
        const input = e.target as HTMLInputElement;

        this.accept(input.files?.[0] ?? null);
        input.value = '';
    }

    protected clear(): void {
        this.error.set(null);
        this.fileChange.emit(null);
    }

    private accept(file: File | null): void {
        if (!file) {
            return;
        }

        const problem = precheckImportFile(file, this.extension());

        this.error.set(problem);

        if (!problem) {
            this.fileChange.emit(file);
        }
    }
}
