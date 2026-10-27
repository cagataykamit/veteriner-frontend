import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { HbsStatusBadgeComponent } from '@/app/features/hbs/components/hbs-status-badge.component';
import type { HbsDataDto, HbsDataFieldDto, HbsEntryStatus, HbsEntryVm, HbsRecordKind } from '@/app/features/hbs/models/hbs.model';
import { HbsService } from '@/app/features/hbs/services/hbs.service';
import { HBS_REFERENCE_LABEL, HBS_REFERENCE_NUMBER_MAX, mapHbsEntryDtoToVm } from '@/app/features/hbs/utils/hbs-status.utils';
import { REASON_MAX, REASON_MIN, reasonLength } from '@/app/shared/forms/reason-length.validator';
import { copyTextToClipboard } from '@/app/shared/utils/clipboard.utils';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';

type SaveMode = 'Entered' | 'NotRequired';

const KIND_TITLE: Readonly<Record<HbsRecordKind, string>> = {
    prescription: 'HBS verisi — e-Reçete',
    vaccination: 'HBS verisi — ATS aşı kaydı'
};

/**
 * HBS'e girilecek veri alan alan (her satırda Kopyala) ve geri kayıt (numara + Kaydet, "Gerekmiyor" + gerekçe).
 * Vetinity HBS'e bağlanmaz; hekim HBS'e kendisi girer (ADR-036 AK-5/AK-8). Kesinleşmiş kayıtta da geri kayıt yapılabilir
 * (HBS numarası klinik içerik değildir). Metin nötrdür: zorunluluk iddiası yoktur.
 */
@Component({
    selector: 'app-hbs-data-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, DialogModule, ButtonModule, TooltipModule, HbsStatusBadgeComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog [header]="title()" [modal]="true" [dismissableMask]="!saving()" [closable]="!saving()" [style]="{ width: 'min(720px, 95vw)' }" [(visible)]="visible">
            @if (loading()) {
                <p class="m-0 text-muted-color">HBS verisi yükleniyor…</p>
            } @else if (loadError()) {
                <p class="m-0 text-red-500" role="alert">{{ loadError() }}</p>
            } @else if (data(); as d) {
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <app-hbs-status-badge [status]="$safeNavigationMigration(entry()?.status)" />
                    <button pButton type="button" size="small" severity="secondary" data-testid="hbs-copy-all" (click)="copyAll()"><i class="p-button-icon pi pi-copy"></i>Tümünü kopyala</button>
                </div>
                <p class="mt-0 mb-3 text-sm text-muted-color">HBS ekranında ilgili alana yapıştırmak için satırdaki kopyala simgesini kullanın. Boş alanlar Vetinity'de kayıtlı değildir.</p>
                @if (d.ownerIdentityMasked) {
                    <p class="mt-0 mb-3 text-sm text-muted-color" role="note" data-testid="hbs-identity-masked">Kimlik numarası gizli gösteriliyor; tam numara için müşteri düzenleme yetkisi gerekir.</p>
                }
                @if (copyMessage()) {
                    <p class="mt-0 mb-3 text-sm" role="status" aria-live="polite">{{ copyMessage() }}</p>
                }

                @for (section of d.sections; track section.key) {
                    <h6 class="mt-4 mb-2">{{ section.title }}</h6>
                    <dl class="m-0" [attr.data-testid]="'hbs-section-' + section.key">
                        @for (field of section.fields; track field.key) {
                            <div class="flex items-center gap-2 py-1 border-b border-surface-200 dark:border-surface-700" data-testid="hbs-field">
                                <dt class="w-5/12 text-sm text-muted-color">{{ field.label }}</dt>
                                <dd class="m-0 flex-1 min-w-0 break-words" [class.text-muted-color]="!field.value">{{ field.value || '—' }}</dd>
                                <button
                                    pButton
                                    type="button"
                                    iconOnly
                                    [text]="true"
                                    [rounded]="true"
                                    size="small"
                                    [disabled]="!field.value"
                                    [attr.aria-label]="field.label + ' kopyala'"
                                    [pTooltip]="field.label + ' kopyala'"
                                    tooltipPosition="left"
                                    [attr.data-testid]="'hbs-copy-' + field.key"
                                    (click)="copyField(field)"
                                ><i class="p-button-icon pi pi-copy"></i></button>
                            </div>
                        }
                    </dl>
                }

                <div class="mt-5 pt-4 border-t border-surface-200 dark:border-surface-700" data-testid="hbs-entry-form">
                    <h6 class="mt-0 mb-2">HBS kaydı</h6>
                    @if (entry(); as e) {
                        @if (e.status !== 'NotEntered') {
                            <p class="mt-0 mb-3 text-sm text-muted-color" data-testid="hbs-entry-summary">
                                @if (e.referenceNumber) {
                                    {{ referenceLabel() }}: <span class="font-medium text-color">{{ e.referenceNumber }}</span> ·
                                }
                                @if (e.notRequiredReason) {
                                    Gerekçe: {{ e.notRequiredReason }} ·
                                }
                                {{ markedText(e) }}
                            </p>
                        }
                    }
                    @if (!canEdit()) {
                        <p class="m-0 text-sm text-muted-color">HBS kaydını yalnız düzenleme yetkisi olan kullanıcı işaretleyebilir.</p>
                    } @else {
                        <div class="flex flex-wrap gap-4 mb-3" role="radiogroup" aria-label="HBS kaydı">
                            <label class="flex items-center gap-2 text-sm">
                                <input type="radio" name="hbsMode" value="Entered" [checked]="mode() === 'Entered'" (change)="mode.set('Entered')" data-testid="hbs-mode-entered" />
                                HBS'e girdim
                            </label>
                            <label class="flex items-center gap-2 text-sm">
                                <input type="radio" name="hbsMode" value="NotRequired" [checked]="mode() === 'NotRequired'" (change)="mode.set('NotRequired')" data-testid="hbs-mode-not-required" />
                                Gerekmiyor
                            </label>
                        </div>
                        @if (mode() === 'Entered') {
                            <label for="hbs-reference" class="block text-sm font-medium text-muted-color mb-2">{{ referenceLabel() }} (isteğe bağlı)</label>
                            <input id="hbs-reference" type="text" class="w-full p-inputtext p-component" [formControl]="reference" [attr.maxlength]="referenceMax" data-testid="hbs-reference-input" />
                        } @else {
                            <label for="hbs-reason" class="block text-sm font-medium text-muted-color mb-2">Gerekçe *</label>
                            <textarea id="hbs-reason" rows="2" class="w-full p-inputtext p-component" [formControl]="reason" data-testid="hbs-reason-input"></textarea>
                            @if (reason.invalid && (reason.dirty || reason.touched)) {
                                <small class="text-red-500">Gerekçe {{ reasonMin }}–{{ reasonMax }} karakter olmalıdır.</small>
                            }
                        }
                        @if (saveError()) {
                            <p class="text-red-500 mt-3 mb-0" role="alert">{{ saveError() }}</p>
                        }
                        <div class="flex flex-wrap justify-end gap-2 mt-3">
                            @if (entry()?.status !== 'NotEntered') {
                                <button pButton type="button" severity="secondary" [text]="true" [disabled]="saving()" data-testid="hbs-reset" (click)="save('NotEntered')">Girilmedi olarak geri al</button>
                            }
                            <button pButton type="button" [disabled]="saving() || (mode() === 'NotRequired' && reason.invalid) || reference.invalid" data-testid="hbs-save" (click)="save(mode())"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet</button>
                        </div>
                    }
                </div>
            }
        </p-dialog>
    `
})
export class HbsDataDialogComponent {
    readonly visible = model(false);
    readonly kind = input.required<HbsRecordKind>();
    readonly recordId = input.required<string>();
    /** Geri kayıt yetkisi (`Prescriptions.Update` / `Vaccinations.Update`) ve salt okunur kiracı denetimi çağırandadır. */
    readonly canEdit = input(false);
    readonly saved = output<HbsEntryVm>();

    private readonly hbs = inject(HbsService);

    protected readonly referenceMax = HBS_REFERENCE_NUMBER_MAX;
    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;

    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly data = signal<HbsDataDto | null>(null);
    readonly entry = signal<HbsEntryVm | null>(null);
    readonly mode = signal<SaveMode>('Entered');
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    readonly copyMessage = signal<string | null>(null);

    readonly reference = new FormControl('', { nonNullable: true, validators: Validators.maxLength(HBS_REFERENCE_NUMBER_MAX) });
    readonly reason = new FormControl('', { nonNullable: true, validators: reasonLength });

    protected readonly title = computed(() => KIND_TITLE[this.kind()]);
    protected readonly referenceLabel = computed(() => HBS_REFERENCE_LABEL[this.kind()]);

    constructor() {
        effect(() => {
            const open = this.visible();
            const id = this.recordId();

            if (open && id) {
                untracked(() => this.load(id));
            }
        });
    }

    protected markedText(e: HbsEntryVm): string {
        const at = e.markedAtUtc ? formatUtcIsoAsLocalDateTimeDisplay(e.markedAtUtc) : '';

        return [e.markedByName, at].filter(Boolean).join(' · ');
    }

    async copyField(field: HbsDataFieldDto): Promise<void> {
        const ok = await copyTextToClipboard(field.value ?? '');

        this.copyMessage.set(ok ? `${field.label} kopyalandı.` : 'Kopyalanamadı; değeri elle seçip kopyalayın.');
    }

    async copyAll(): Promise<void> {
        const ok = await copyTextToClipboard(this.data()?.copyAllText ?? '');

        this.copyMessage.set(ok ? 'Tüm alanlar kopyalandı.' : 'Kopyalanamadı; değerleri elle seçip kopyalayın.');
    }

    save(status: HbsEntryStatus): void {
        if (this.saving()) {
            return;
        }

        if (status === 'NotRequired' && this.reason.invalid) {
            this.reason.markAsTouched();

            return;
        }

        this.saving.set(true);
        this.saveError.set(null);
        this.hbs
            .updateHbsEntry(this.kind(), this.recordId(), {
                status,
                referenceNumber: status === 'Entered' ? this.reference.value.trim() || null : null,
                notRequiredReason: status === 'NotRequired' ? this.reason.value.trim() : null
            })
            .subscribe({
                next: (vm) => {
                    this.saving.set(false);
                    this.entry.set(vm);
                    this.resetForm(vm);
                    this.saved.emit(vm);
                },
                error: (e: unknown) => {
                    this.saving.set(false);
                    this.saveError.set(e instanceof Error ? e.message : 'HBS kaydı kaydedilemedi.');
                }
            });
    }

    private load(id: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.copyMessage.set(null);
        this.saveError.set(null);
        this.hbs.getHbsData(this.kind(), id).subscribe({
            next: (d) => {
                const vm = mapHbsEntryDtoToVm(d.hbs);

                this.data.set(d);
                this.entry.set(vm);
                this.resetForm(vm);
                this.loading.set(false);
            },
            error: (e: unknown) => {
                this.data.set(null);
                this.loadError.set(e instanceof Error ? e.message : 'HBS verisi yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    private resetForm(vm: HbsEntryVm | null): void {
        this.mode.set(vm?.status === 'NotRequired' ? 'NotRequired' : 'Entered');
        this.reference.reset(vm?.referenceNumber ?? '');
        this.reason.reset(vm?.notRequiredReason ?? '');
    }
}
