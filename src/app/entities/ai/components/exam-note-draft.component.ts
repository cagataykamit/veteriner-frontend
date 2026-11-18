import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import {
    buildExamNoteTransfer,
    EXAM_NOTE_TEXT_FIELDS,
    EXAM_NOTE_VITAL_FIELDS,
    EXAM_NOTE_VITALS_LABEL,
    type ExamNoteDraftContent,
    type ExamNoteFieldKey,
    type ExamNoteFormValues,
    type ExamNoteMergeMode,
    type ExamNoteTextKey,
    type ExamNoteTransfer,
    type ExamNoteVitalKey
} from '@/app/entities/ai/utils/exam-note-draft.utils';

type Row = { kind: 'text'; key: ExamNoteTextKey; label: string; rows: number } | { kind: 'vitals' };

/** Paneldeki sıra formdakiyle aynı: şikâyet, anamnez, bulgular, vitaller, değerlendirme, plan, ek notlar. */
const ROWS: readonly Row[] = [...EXAM_NOTE_TEXT_FIELDS.slice(0, 3).map((f): Row => ({ kind: 'text', ...f })), { kind: 'vitals' }, ...EXAM_NOTE_TEXT_FIELDS.slice(3).map((f): Row => ({ kind: 'text', ...f }))];

const MERGE_OPTIONS: ReadonlyArray<{ label: string; value: ExamNoteMergeMode }> = [
    { label: 'Sona ekle', value: 'append' },
    { label: 'Yerine yaz', value: 'replace' }
];

/**
 * AI-001 taslağının içerik bileşeni (ortak `app-ai-draft-panel` içine takılır). Alanlar kesik çerçeveli ve düzenlenebilir;
 * düzenlenen alan düz çerçeve alır ve "düzenlendi" yazar. Notta karşılığı olmayan alan "boş kalır" der. Form alanı doluysa
 * metin siz seçmeden silinmez: "Sona ekle" (varsayılan) ya da "Yerine yaz". Aktarımı sayfa `transfer()` ile alır.
 */
@Component({
    selector: 'app-exam-note-draft',
    standalone: true,
    imports: [FormsModule, SelectButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col gap-3">
            @if (sourceNote(); as note) {
                <details class="text-sm" data-testid="exam-note-source">
                    <summary class="cursor-pointer font-medium text-muted-color">Serbest not</summary>
                    <p class="mt-2 mb-0 whitespace-pre-line">{{ note }}</p>
                </details>
            }

            @for (row of rows; track $index) {
                @if (row.kind === 'text') {
                    @if (values()[row.key] !== null) {
                        <div class="flex flex-col gap-1" [attr.data-testid]="'exam-note-field-' + row.key">
                            <label class="flex items-center gap-2 text-sm font-semibold" [for]="'ai-note-' + row.key">
                                {{ row.label }}
                                @if (edited().has(row.key)) {
                                    <span class="text-xs font-semibold text-muted-color">· düzenlendi</span>
                                }
                            </label>
                            @if (formValues()[row.key].trim(); as existing) {
                                <div class="flex flex-wrap items-center gap-2 text-xs text-muted-color" [attr.data-testid]="'exam-note-existing-' + row.key">
                                    <span class="min-w-0 truncate max-w-full">Formda yazılı: “{{ existing }}”</span>
                                    <p-selectbutton
                                        size="small"
                                        [options]="mergeOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        [allowEmpty]="false"
                                        [ngModel]="modes()[row.key] ?? 'append'"
                                        (ngModelChange)="setMode(row.key, $event)"
                                        [ariaLabel]="row.label + ': formdaki metinle birleştirme'"
                                    />
                                </div>
                            }
                            <textarea
                                class="w-full p-inputtext p-component ai-draft-input"
                                [class.ai-draft-edited]="edited().has(row.key)"
                                [id]="'ai-note-' + row.key"
                                [rows]="row.rows"
                                [ngModel]="values()[row.key]"
                                (ngModelChange)="setText(row.key, $event)"
                            ></textarea>
                        </div>
                    } @else {
                        <div class="ai-draft-empty" [attr.data-testid]="'exam-note-empty-' + row.key">
                            <b>{{ row.label }}</b
                            ><span>Notta karşılığı yok · boş kalır</span>
                        </div>
                    }
                } @else {
                    @if (hasVitals()) {
                        <fieldset class="m-0 p-0 border-0 flex flex-col gap-1" data-testid="exam-note-field-vitals">
                            <legend class="flex items-center gap-2 text-sm font-semibold mb-1">
                                {{ vitalsLabel }}
                                @if (edited().has('vitals')) {
                                    <span class="text-xs font-semibold text-muted-color">· düzenlendi</span>
                                }
                            </legend>
                            <div class="grid grid-cols-4 gap-2">
                                @for (v of vitalFields; track v.key) {
                                    <div class="min-w-0">
                                        <label class="block text-xs text-muted-color mb-1" [for]="'ai-note-' + v.key">{{ v.label }}</label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            class="w-full p-inputtext p-component ai-draft-input"
                                            [class.ai-draft-edited]="edited().has('vitals')"
                                            [id]="'ai-note-' + v.key"
                                            [ngModel]="vitals()[v.key]"
                                            (ngModelChange)="setVital(v.key, $event)"
                                        />
                                    </div>
                                }
                            </div>
                        </fieldset>
                    } @else {
                        <div class="ai-draft-empty" data-testid="exam-note-empty-vitals">
                            <b>{{ vitalsLabel }}</b
                            ><span>Notta karşılığı yok · boş kalır</span>
                        </div>
                    }
                }
            }
        </div>
    `,
    styles: `
        .ai-draft-input {
            border-style: dashed;
            border-color: var(--p-ai-border-color);
            background: var(--p-ai-background);
            resize: vertical;
        }

        .ai-draft-input.ai-draft-edited,
        .ai-draft-input:focus {
            border-style: solid;
            background: var(--p-inputtext-background);
        }

        .ai-draft-input.ai-draft-edited:not(:focus) {
            border-color: var(--p-inputtext-border-color);
        }

        .ai-draft-empty {
            display: flex;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.9286rem;
            color: var(--text-color-secondary);
            border: 1px dashed var(--p-content-border-color);
            border-radius: var(--p-border-radius-md);
        }

        .ai-draft-empty b {
            color: var(--text-color);
            font-weight: 600;
        }
    `
})
export class ExamNoteDraftComponent {
    /** Taslak içerik (`parseExamNoteDraftContent`). Değişince düzenlemeler sıfırlanır. */
    readonly content = input.required<ExamNoteDraftContent>();
    /** Kullanıcının yazdığı serbest not (saklanmaz); açılır bölümde gösterilir. */
    readonly sourceNote = input<string | null>(null);
    /** Formun şu anki değerleri: dolu alanda birleştirme seçimi sunulur. */
    readonly formValues = input.required<ExamNoteFormValues>();

    protected readonly rows = ROWS;
    protected readonly vitalFields = EXAM_NOTE_VITAL_FIELDS;
    protected readonly vitalsLabel = EXAM_NOTE_VITALS_LABEL;
    protected readonly mergeOptions = MERGE_OPTIONS;

    protected readonly values = signal<Record<ExamNoteTextKey, string | null>>(textPart({} as ExamNoteDraftContent));
    protected readonly vitals = signal<Record<ExamNoteVitalKey, number | null>>(vitalPart({} as ExamNoteDraftContent));
    protected readonly modes = signal<Partial<Record<ExamNoteTextKey, ExamNoteMergeMode>>>({});
    protected readonly edited = signal<ReadonlySet<ExamNoteFieldKey>>(new Set());
    protected readonly hasVitals = computed(() => EXAM_NOTE_VITAL_FIELDS.some((f) => this.content()[f.key] !== null));

    constructor() {
        effect(() => {
            const c = this.content();

            this.values.set(textPart(c));
            this.vitals.set(vitalPart(c));
            this.modes.set({});
            this.edited.set(new Set());
        });
    }

    /** Panelde görünen (düzenlenmiş olabilir) taslaktan forma aktarılacak yama ve alan izleri. */
    transfer(): ExamNoteTransfer {
        return buildExamNoteTransfer(this.formValues(), { ...this.values(), ...this.vitals() } as ExamNoteDraftContent, this.modes(), this.edited());
    }

    protected setText(key: ExamNoteTextKey, value: string): void {
        // Alan boşaltılsa da satırı görünür kalır (null değil ''): aktarımda boş alan atlanır.
        this.values.update((v) => ({ ...v, [key]: value ?? '' }));
        this.markEdited(key);
    }

    protected setVital(key: ExamNoteVitalKey, value: number | string | null): void {
        const n = typeof value === 'number' && Number.isFinite(value) ? value : null;

        this.vitals.update((v) => ({ ...v, [key]: n }));
        this.markEdited('vitals');
    }

    protected setMode(key: ExamNoteTextKey, mode: ExamNoteMergeMode): void {
        this.modes.update((m) => ({ ...m, [key]: mode }));
    }

    private markEdited(key: ExamNoteFieldKey): void {
        this.edited.update((s) => new Set(s).add(key));
    }
}

function textPart(c: ExamNoteDraftContent): Record<ExamNoteTextKey, string | null> {
    return Object.fromEntries(EXAM_NOTE_TEXT_FIELDS.map((f) => [f.key, c[f.key] ?? null])) as Record<ExamNoteTextKey, string | null>;
}

function vitalPart(c: ExamNoteDraftContent): Record<ExamNoteVitalKey, number | null> {
    return Object.fromEntries(EXAM_NOTE_VITAL_FIELDS.map((f) => [f.key, c[f.key] ?? null])) as Record<ExamNoteVitalKey, number | null>;
}
