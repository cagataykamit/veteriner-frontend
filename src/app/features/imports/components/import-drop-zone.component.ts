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
            class="rounded-border border-2 border-dashed p-4 text-center transition-colors"
            [class.border-primary]="dragging()"
            [class.border-surface-300]="!dragging()"
            [class.dark:border-surface-600]="!dragging()"
            (dragover)="onDragOver($event)"
            (dragleave)="dragging.set(false)"
            (drop)="onDrop($event)"
        >
            <div class="font-medium mb-1">{{ label() }}</div>
            @if (file(); as f) {
                <div class="text-sm break-words mb-2"><i class="pi pi-file mr-1"></i>{{ f.name }} ({{ sizeText() }})</div>
                <button pButton type="button" size="small" severity="secondary" (click)="clear()"><i class="p-button-icon pi pi-times"></i>Dosyayı kaldır</button>
            } @else {
                <div class="text-sm text-muted-color mb-2">{{ hint() }}</div>
                <button pButton type="button" size="small" severity="secondary" (click)="picker.click()"><i class="p-button-icon pi pi-upload"></i>Dosya seç</button>
            }
            <input #picker type="file" class="hidden" [accept]="extension()" [attr.aria-label]="label()" (change)="onPick($event)" />
            @if (error()) {
                <div class="text-sm text-red-500 mt-2" role="alert">{{ error() }}</div>
            }
        </div>
    `
})
export class ImportDropZoneComponent {
    readonly label = input.required<string>();
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
