import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { ClientDetailVm, ClientKvkkConsentUpdateResult } from '@/app/entities/client/models/client-vm.model';
import { ClientsService } from '@/app/entities/client/services/clients.service';
import { KVKK_CONSENT_STATUS_OPTIONS, type KvkkConsentStatus } from '@/app/entities/client/utils/client-kvkk-consent.utils';
import { panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/**
 * İmzalı KVKK formunun sonucunu işaretler (`PUT /clients/{id}/kvkk-consent`, sözleşme §1): Kabul / Ret ve formun tarihi
 * (varsayılan bugün, ileri tarih seçilemez; geçmiş serbest: eski kâğıt formlar). "Yok'a geri al" yanlış girişi temizler.
 * Ret hatırlatma istemiyor bayrağını sunucuda açar (K7, ADR-025); yanıt bayrağı taşır. Yetki denetimi çağıranda yapılır. 409 `Clients.ConcurrencyConflict` → `stale` yayılır.
 */
@Component({
    selector: 'app-client-kvkk-consent-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, DialogModule, ButtonModule, SelectButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog header="KVKK rıza durumunu işaretle" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible">
            @if (client(); as c) {
                <p class="mt-0 mb-4 text-sm text-muted-color">
                    <span class="font-semibold text-color">{{ c.fullName }}</span> imzalı formu teslim etti. Form kâğıtta kalır; burada yalnız sonucu ve tarihi kaydedilir.
                </p>
                <span id="kvkk-status-label" class="block text-sm font-medium text-muted-color mb-2">Formdaki seçim</span>
                <p-selectbutton [options]="statusOptions" [formControl]="status" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="kvkk-status-label" data-testid="kvkk-status" />
                <label for="kvkk-recorded-on" class="block text-sm font-medium text-muted-color mt-4 mb-2">Form tarihi</label>
                <input id="kvkk-recorded-on" type="date" class="w-full p-inputtext p-component" [formControl]="recordedOn" [attr.max]="today()" />
                @if (dateError(); as msg) {
                    <small class="text-red-500" role="alert">{{ msg }}</small>
                }
                <p class="text-sm text-muted-color mt-3 mb-0" data-testid="kvkk-reminder-note">
                    Ret işaretlenince otomatik hatırlatmalar kapanır ("Hatırlatma istemiyor"). Sonradan Kabul'e geçmek hatırlatmaları açmaz; gerekiyorsa müşteri formunda elle açılır.
                </p>
                @if (!c.rowVersion) {
                    <p class="text-sm text-muted-color mt-3 mb-0" role="note">Kayıt sürümü okunamadı; sayfayı yenileyip tekrar deneyin.</p>
                }
            }
            @if (submitError()) {
                <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
            }
            <ng-template #footer>
                @if (canRevert()) {
                    <button pButton type="button" severity="secondary" [text]="true" [disabled]="submitting() || !client()?.rowVersion" (click)="submit('None')" data-testid="kvkk-revert"><i class="p-button-icon pi pi-undo"></i>Yok'a geri al</button>
                }
                <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" [disabled]="submitting() || !client()?.rowVersion || !!dateError()" (click)="submit(status.value)"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>Kaydet</button>
            </ng-template>
        </p-dialog>
    `
})
export class ClientKvkkConsentDialogComponent {
    readonly visible = model(false);
    readonly client = input<ClientDetailVm | null>(null);
    readonly changed = output<ClientKvkkConsentUpdateResult>();
    /** Kayıt arada değişti (409); çağıran detayı yenilemeli. */
    readonly stale = output<void>();

    private readonly clientsService = inject(ClientsService);

    readonly statusOptions = KVKK_CONSENT_STATUS_OPTIONS.filter((o) => o.value !== 'None');
    readonly status = new FormControl<KvkkConsentStatus>('Accepted', { nonNullable: true });
    readonly recordedOn = new FormControl('', { nonNullable: true });
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    private readonly dateValue = signal('');

    readonly canRevert = computed(() => (this.client()?.kvkkConsent.status ?? 'None') !== 'None');
    /** "Bugün" İstanbul takvim günü (sözleşme K4). */
    readonly today = signal(toIstanbulDateInputValue(new Date().toISOString()));
    readonly dateError = computed(() => {
        const v = this.dateValue();

        return v && v > this.today() ? 'Form tarihi bugünden ileri olamaz.' : null;
    });

    constructor() {
        this.recordedOn.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
            this.dateValue.set(v);
            this.submitError.set(null);
        });
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    const consent = this.client()?.kvkkConsent;

                    this.submitError.set(null);
                    this.today.set(toIstanbulDateInputValue(new Date().toISOString()));
                    this.status.setValue(consent && consent.status !== 'None' ? consent.status : 'Accepted');
                    this.recordedOn.setValue(consent?.recordedOn ?? this.today());
                });
            }
        });
    }

    submit(status: KvkkConsentStatus): void {
        const c = this.client();

        if (this.submitting() || !c?.rowVersion || (status !== 'None' && this.dateError())) {
            return;
        }

        this.submitError.set(null);
        this.submitting.set(true);
        this.clientsService.updateKvkkConsent(c.id, { status, recordedOn: status === 'None' ? null : this.recordedOn.value.trim() || null, rowVersion: c.rowVersion }).subscribe({
            next: (result) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.changed.emit(result);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'KVKK rıza durumu kaydedilemedi.'));

                if (e instanceof HttpErrorResponse && problemCodeFromHttpError(e) === 'Clients.ConcurrencyConflict') {
                    this.stale.emit();
                }
            }
        });
    }
}
