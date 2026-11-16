import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import type { ImportWarningDto, ImportWarningPartDto, ImportWarningSeverity, ImportWarningTargetDto } from '@/app/features/imports/models/import-api.model';
import { countNotesByKind, IMPORT_NOTE_KIND_META, IMPORT_NOTE_KINDS, isStructuredNote, noteAreaLabel, noteKind, sortNotes } from '@/app/features/imports/utils/import-notes.utils';
import { formatCount } from '@/app/features/imports/utils/import-review.utils';

/**
 * "Dosya okunurken N not çıktı" paneli, satır satır: her not tek satır (tür simgesi · sayı · birim ve ne olacağı · konu ve kaynak · tür).
 * Sıra karar → dikkat → bilgi → aktarılmayacak. Karar satırı amber ve baştan açık; düğmesi Doğrulama adımındaki "Sizden beklenen"e
 * götürür. Kırılım ve "Ne olacak" satıra tıklayınca açılır. Başlıktaki tür sayıları filtredir; panel kapalıyken de görünür.
 * Yapısız not (eski sunucu, CSV) düz metin gösterilir.
 */
@Component({
    selector: 'app-import-upload-notes',
    standalone: true,
    imports: [NgTemplateOutlet, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section class="card !p-0 !mb-4 overflow-hidden" aria-labelledby="import-notes-title" data-testid="import-upload-notes">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 py-3">
                <button
                    id="import-notes-title"
                    type="button"
                    class="flex items-center gap-2 bg-transparent border-0 p-0 text-color cursor-pointer font-medium text-base"
                    [attr.aria-expanded]="open()"
                    aria-controls="import-notes-list"
                    (click)="open.set(!open())"
                >
                    <i class="pi pi-file-check text-primary" aria-hidden="true"></i>
                    Dosya okunurken {{ notes().length }} not çıktı
                </button>
                <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Türe göre filtre" data-testid="import-notes-filter">
                    @for (k of kinds; track k) {
                        @if (counts()[k]) {
                            <button
                                type="button"
                                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm cursor-pointer bg-transparent text-color"
                                [class]="filter() === k ? meta[k].border + ' ' + meta[k].soft : 'border-surface'"
                                [attr.aria-pressed]="filter() === k"
                                (click)="toggleFilter(k)"
                            >
                                <span class="inline-block w-2 h-2 rounded-full" [class]="meta[k].dot" aria-hidden="true"></span>
                                <span class="tabular-nums font-medium">{{ counts()[k] }}</span>
                                {{ meta[k].short }}
                            </button>
                        }
                    }
                </div>
                <button pButton type="button" size="small" [text]="true" severity="secondary" class="ml-auto" [attr.aria-label]="open() ? 'Notları gizle' : 'Notları göster'" (click)="open.set(!open())">
                    {{ open() ? 'Gizle' : 'Göster' }}<i class="p-button-icon pi" [class]="open() ? 'pi-angle-up' : 'pi-angle-down'"></i>
                </button>
            </div>

            @if (open()) {
                <ul id="import-notes-list" class="list-none p-0 m-0 border-t border-surface">
                    @for (note of visible(); track key(note)) {
                        @let k = kind(note);
                        @let structured = isStructured(note);
                        @let expandable = structured && hasDetail(note);
                        @let expanded = expandable && isOpen(note);
                        <li class="border-b border-surface last:border-b-0" [class]="k === 'decision' ? meta.decision.soft : ''" [attr.data-kind]="k" data-testid="import-note">
                            <div
                                class="grid grid-cols-[1.25rem_4.25rem_1fr_auto] sm:grid-cols-[1.25rem_5.5rem_1fr_auto] items-start gap-x-3 px-4 sm:px-5 py-3"
                                [class.cursor-pointer]="expandable"
                                [class.hover:bg-emphasis]="expandable && k !== 'decision'"
                                (click)="expandable && toggle(note)"
                            >
                                <i class="mt-1" [class]="meta[k].icon + ' ' + meta[k].text" role="img" [attr.aria-label]="meta[k].label"></i>
                                @if (structured) {
                                    <span class="text-right text-base sm:text-lg font-semibold tabular-nums leading-7">{{ n(note.count!) }}</span>
                                    <span class="min-w-0">
                                        <span class="block leading-7">
                                            <span class="font-medium">{{ note.unit }}</span> {{ note.title }}
                                        </span>
                                        <span class="block text-sm text-muted-color">
                                            {{ area(note) }}
                                            @if (note.source) {
                                                · {{ note.source }}
                                            }
                                            <span class="sm:hidden" [class]="meta[k].text"> · {{ meta[k].label }}</span>
                                        </span>
                                    </span>
                                } @else {
                                    <span class="col-span-2 min-w-0 text-sm leading-6" data-testid="import-note-plain">{{ note.message }}</span>
                                }
                                <span class="flex items-center gap-2 shrink-0">
                                    @if (k === 'decision' && note.target; as t) {
                                        <span class="hidden sm:inline">
                                            <ng-container *ngTemplateOutlet="goButton; context: { $implicit: note, target: t }" />
                                        </span>
                                    } @else {
                                        <span class="text-sm" [class]="meta[k].text + (structured ? ' hidden sm:inline' : '')">{{ meta[k].label }}</span>
                                    }
                                    @if (expandable) {
                                        <button
                                            type="button"
                                            class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-transparent border-0 text-muted-color cursor-pointer hover:bg-emphasis"
                                            [attr.aria-expanded]="expanded"
                                            [attr.aria-label]="(expanded ? 'Ayrıntıyı gizle: ' : 'Ayrıntıyı göster: ') + note.unit + ' ' + note.title"
                                            (click)="$event.stopPropagation(); toggle(note)"
                                        >
                                            <i class="pi" [class]="expanded ? 'pi-angle-up' : 'pi-angle-down'" aria-hidden="true"></i>
                                        </button>
                                    }
                                </span>
                            </div>
                            @if (expanded) {
                                <div class="flex flex-col gap-3 pl-12 pr-4 sm:pl-[3.25rem] sm:pr-5 pb-4 -mt-1" data-testid="import-note-detail">
                                    @if (note.parts?.length) {
                                        <ul class="list-none p-0 m-0 flex flex-col gap-1.5">
                                            @for (p of note.parts; track p.label) {
                                                <li class="grid grid-cols-[4.25rem_1fr] sm:grid-cols-[5.5rem_1fr_7rem] items-center gap-x-3 text-sm" [class.text-muted-color]="p.count === 0">
                                                    <span class="text-right tabular-nums font-medium">{{ n(p.count) }}</span>
                                                    <span class="min-w-0">{{ p.label }}</span>
                                                    <span class="hidden sm:block h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden" aria-hidden="true">
                                                        <span class="block h-full rounded-full" [class]="partDot(p)" [style.width.%]="partPct(note, p)"></span>
                                                    </span>
                                                </li>
                                            }
                                        </ul>
                                    }
                                    @if (note.outcome || note.example) {
                                        <p class="m-0 text-sm text-surface-700 dark:text-surface-200 sm:pl-[6.25rem]">
                                            @if (note.outcome) {
                                                <span class="font-medium">Ne olacak:</span> {{ note.outcome }}
                                            }
                                            @if (note.example) {
                                                <span class="whitespace-nowrap">
                                                    Örnek:
                                                    <code class="px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-[0.8125rem]">{{ note.example }}</code>
                                                </span>
                                            }
                                        </p>
                                    }
                                    @if (k === 'decision' && note.target; as t) {
                                        <div class="sm:hidden">
                                            <ng-container *ngTemplateOutlet="goButton; context: { $implicit: note, target: t }" />
                                        </div>
                                    }
                                </div>
                            }
                        </li>
                    }
                </ul>
                @if (filter(); as f) {
                    <div class="px-4 sm:px-5 py-2 border-t border-surface text-sm text-muted-color">
                        Yalnız "{{ meta[f].label }}" gösteriliyor ·
                        <button type="button" class="bg-transparent border-0 p-0 text-primary cursor-pointer" (click)="filter.set(null)">tümünü göster</button>
                    </div>
                }
            }
        </section>

        <ng-template #goButton let-note let-t="target">
            @if (canGo()) {
                <button pButton type="button" size="small" severity="warn" data-testid="import-note-go" (click)="$event.stopPropagation(); go.emit(t)">{{ goLabel(note) }}<i class="p-button-icon pi pi-arrow-right"></i></button>
            } @else {
                <span class="text-sm" [class]="meta.decision.text">Doğrulamada sorulacak</span>
            }
        </ng-template>
    `
})
export class ImportUploadNotesComponent {
    readonly notes = input.required<ImportWarningDto[]>();
    /** Panel açık gelsin mi (2. ve 3. adımda açık; 4. adımda yalnız karar bekleyen not varsa). Değişince panel ona döner. */
    readonly startOpen = input(true);
    /** Karar düğmesi gidebilir mi (doğrulama sonucu var); yoksa satırda "Doğrulamada sorulacak" yazar. */
    readonly canGo = input(false);
    readonly go = output<ImportWarningTargetDto>();

    protected readonly meta = IMPORT_NOTE_KIND_META;
    protected readonly kinds = IMPORT_NOTE_KINDS;
    protected readonly n = formatCount;
    protected readonly kind = noteKind;
    protected readonly isStructured = isStructuredNote;
    protected readonly area = noteAreaLabel;

    protected readonly open = linkedSignal(() => this.startOpen());
    protected readonly filter = signal<ImportWarningSeverity | null>(null);
    /** Açık satırlar; karar bekleyen satır baştan açık. */
    private readonly expandedKeys = linkedSignal<ReadonlySet<string>>(
        () =>
            new Set(
                this.notes()
                    .filter((note) => noteKind(note) === 'decision')
                    .map((note) => this.key(note))
            )
    );

    protected readonly counts = computed(() => countNotesByKind(this.notes()));
    protected readonly visible = computed(() => {
        const f = this.filter();

        return sortNotes(this.notes()).filter((note) => !f || noteKind(note) === f);
    });

    protected key(note: ImportWarningDto): string {
        return `${note.code}|${note.table ?? ''}`;
    }

    protected hasDetail(note: ImportWarningDto): boolean {
        return !!(note.parts?.length || note.outcome || note.example || (noteKind(note) === 'decision' && note.target));
    }

    protected isOpen(note: ImportWarningDto): boolean {
        return this.expandedKeys().has(this.key(note));
    }

    protected toggle(note: ImportWarningDto): void {
        const next = new Set(this.expandedKeys());
        const key = this.key(note);

        if (!next.delete(key)) {
            next.add(key);
        }

        this.expandedKeys.set(next);
    }

    protected toggleFilter(k: ImportWarningSeverity): void {
        this.filter.set(this.filter() === k ? null : k);
        this.open.set(true);
    }

    /** Düğme metni ekranda üretilir (sözleşme 7.2.1): "26 satır için seçim yap". */
    protected goLabel(note: ImportWarningDto): string {
        return note.count != null && note.unit ? `${formatCount(note.count)} ${note.unit} için seçim yap` : 'Seçime git';
    }

    protected partDot(p: ImportWarningPartDto): string {
        return IMPORT_NOTE_KIND_META[p.severity ?? 'info'].dot;
    }

    /** Oran çizgisi en büyük kırılıma göre; sıfır olmayan dilim en az %3 görünür. */
    protected partPct(note: ImportWarningDto, p: ImportWarningPartDto): number {
        const max = Math.max(1, ...(note.parts ?? []).map((x) => x.count));

        return p.count === 0 ? 0 : Math.max(3, (p.count / max) * 100);
    }
}
