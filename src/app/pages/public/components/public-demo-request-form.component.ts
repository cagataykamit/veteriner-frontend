import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TextareaModule } from 'primeng/textarea';
import { mapPublicDemoRequestFormToRequest, validatePublicDemoRequestForm, type PublicDemoRequestFieldErrors } from '@/app/features/public/data/public-demo-request.mapper';
import { DEMO_CLINIC_SIZE_OPTIONS, DEMO_REQUEST_LIMITS, emptyPublicDemoRequestForm, type PublicDemoRequestForm } from '@/app/features/public/models/public-demo-request.model';
import { PublicDemoRequestService } from '@/app/features/public/services/public-demo-request.service';
import { PRIVACY_POLICY_PATH } from '@/app/features/public/utils/legal-documents.utils';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

/**
 * Canlı demo talep formu (TRIAL-005, ADR-001 madde 4): 20 dakikalık görüntülü görüşme; çok hekimli/şubeli klinik vurgusu,
 * ana çağrı yine ücretsiz deneme. Gizli `website` alanı tuzaktır (sözleşme §2).
 */
@Component({
    selector: 'app-public-demo-request-form',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, ButtonModule, CheckboxModule, InputTextModule, RadioButtonModule, TextareaModule],
    template: `
        <section class="public-card p-6 md:p-8" aria-labelledby="demo-request-title">
            <h2 id="demo-request-title" class="public-h2 m-0">Canlı demo isteyin</h2>
            @if (sent()) {
                <div role="status" class="mt-4">
                    <p class="public-lead m-0">Talebiniz alındı. Bir iş günü içinde size dönüp görüşme saatini birlikte belirleyelim.</p>
                    <p class="m-0 mt-5 text-sm text-muted-color">
                        Beklerken denemek isterseniz:
                        <a routerLink="/auth/signup" class="public-brand-link">14 gün ücretsiz başlayın</a>, kart gerekmez.
                    </p>
                </div>
            } @else {
                <p class="public-lead m-0 mt-3">
                    Size uygun bir saatte 20 dakikalık görüntülü görüşmede Vetinity'yi kendi iş akışınız üzerinden gösterelim. Birden fazla hekimi ya da şubesi olan klinikler için özellikle öneririz.
                </p>

                <form class="mt-6 flex flex-col gap-5" novalidate (ngSubmit)="submit()">
                    <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label for="demoContactName" class="block font-medium mb-2">Ad soyad *</label>
                            <input pInputText id="demoContactName" name="contactName" class="w-full" autocomplete="name" [maxlength]="limits.contactName" [(ngModel)]="form.contactName" [disabled]="submitting()" [attr.aria-invalid]="!!errors().contactName" />
                            @if (errors().contactName) {
                                <small class="text-red-500 block mt-1">{{ errors().contactName }}</small>
                            }
                        </div>
                        <div>
                            <label for="demoClinicName" class="block font-medium mb-2">Klinik adı *</label>
                            <input pInputText id="demoClinicName" name="clinicName" class="w-full" autocomplete="organization" [maxlength]="limits.clinicName" [(ngModel)]="form.clinicName" [disabled]="submitting()" [attr.aria-invalid]="!!errors().clinicName" />
                            @if (errors().clinicName) {
                                <small class="text-red-500 block mt-1">{{ errors().clinicName }}</small>
                            }
                        </div>
                        <div>
                            <label for="demoEmail" class="block font-medium mb-2">E-posta *</label>
                            <input pInputText id="demoEmail" name="email" type="email" class="w-full" autocomplete="email" [maxlength]="limits.email" [(ngModel)]="form.email" [disabled]="submitting()" [attr.aria-invalid]="!!errors().email" />
                            @if (errors().email) {
                                <small class="text-red-500 block mt-1">{{ errors().email }}</small>
                            }
                        </div>
                        <div>
                            <label for="demoPhone" class="block font-medium mb-2">Telefon</label>
                            <input pInputText id="demoPhone" name="phone" type="tel" class="w-full" autocomplete="tel" [maxlength]="limits.phone" [(ngModel)]="form.phone" [disabled]="submitting()" />
                        </div>
                        <div>
                            <label for="demoCity" class="block font-medium mb-2">Şehir</label>
                            <input pInputText id="demoCity" name="city" class="w-full" autocomplete="address-level2" [maxlength]="limits.city" [(ngModel)]="form.city" [disabled]="submitting()" />
                        </div>
                        <div>
                            <label for="demoCurrentSoftware" class="block font-medium mb-2">Bugün kullandığınız program</label>
                            <input pInputText id="demoCurrentSoftware" name="currentSoftware" class="w-full" placeholder="Örn. başka bir program, Excel, defter" [maxlength]="limits.currentSoftware" [(ngModel)]="form.currentSoftware" [disabled]="submitting()" />
                        </div>
                    </div>

                    <fieldset class="m-0 border-0 p-0">
                        <legend class="font-medium mb-2">Klinik büyüklüğü *</legend>
                        <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
                            @for (option of sizeOptions; track option.value) {
                                <div class="flex items-center gap-2">
                                    <p-radiobutton [inputId]="'demoSize' + option.value" name="clinicSize" [value]="option.value" [(ngModel)]="form.clinicSize" [disabled]="submitting()" />
                                    <label [for]="'demoSize' + option.value">{{ option.label }}</label>
                                </div>
                            }
                        </div>
                        @if (errors().clinicSize) {
                            <small class="text-red-500 block mt-1">{{ errors().clinicSize }}</small>
                        }
                    </fieldset>

                    <div>
                        <label for="demoMessage" class="block font-medium mb-2">Mesajınız</label>
                        <textarea pTextarea id="demoMessage" name="message" rows="3" class="w-full" placeholder="Uygun gün ve saatler, görmek istedikleriniz" [maxlength]="limits.message" [(ngModel)]="form.message" [disabled]="submitting()"></textarea>
                    </div>

                    <!-- Tuzak alan: ekranda ve erişilebilirlik ağacında yok; yalnız botlar doldurur. -->
                    <div class="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
                        <label for="demoWebsite">Web siteniz</label>
                        <input id="demoWebsite" name="website" type="text" tabindex="-1" autocomplete="off" [(ngModel)]="form.website" />
                    </div>

                    <div>
                        <div class="flex items-start gap-2">
                            <p-checkbox inputId="demoPrivacy" name="privacyNoticeAccepted" [binary]="true" [(ngModel)]="form.privacyNoticeAccepted" [disabled]="submitting()" />
                            <label for="demoPrivacy" class="text-sm leading-6 text-surface-700 dark:text-surface-200"
                                ><a [href]="privacyPath" target="_blank" rel="noopener" class="public-brand-link">Gizlilik Politikası</a>'nı okudum; bilgilerimin demo planlamak için işlenmesini anlıyorum. *</label
                            >
                        </div>
                        @if (errors().privacyNoticeAccepted) {
                            <small class="text-red-500 block mt-1">{{ errors().privacyNoticeAccepted }}</small>
                        }
                    </div>

                    @if (formError()) {
                        <p class="m-0 text-sm text-red-500" role="alert">{{ formError() }}</p>
                    }

                    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <p-button type="submit" label="Demo iste" styleClass="w-full sm:w-auto" [loading]="submitting()" [disabled]="submitting()" />
                        <span class="text-sm text-muted-color">
                            Hemen denemek isterseniz <a routerLink="/auth/signup" class="public-brand-link">14 gün ücretsiz başlayın</a>.
                        </span>
                    </div>
                </form>
            }
        </section>
    `
})
export class PublicDemoRequestFormComponent {
    private readonly demoRequests = inject(PublicDemoRequestService);
    private readonly destroyRef = inject(DestroyRef);

    readonly limits = DEMO_REQUEST_LIMITS;
    readonly sizeOptions = DEMO_CLINIC_SIZE_OPTIONS;
    readonly privacyPath = PRIVACY_POLICY_PATH;

    readonly form: PublicDemoRequestForm = emptyPublicDemoRequestForm();
    readonly errors = signal<PublicDemoRequestFieldErrors>({});
    readonly formError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly sent = signal(false);

    submit(): void {
        if (this.submitting()) {
            return;
        }

        this.formError.set(null);
        const errors = validatePublicDemoRequestForm(this.form);

        this.errors.set(errors);

        if (Object.keys(errors).length > 0) {
            return;
        }

        this.submitting.set(true);
        this.demoRequests
            .create(mapPublicDemoRequestFormToRequest(this.form))
            .pipe(
                finalize(() => this.submitting.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => this.sent.set(true),
                error: (err: unknown) => this.formError.set(demoRequestFailureMessage(err))
            });
    }
}

function demoRequestFailureMessage(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
        return 'Talep gönderilemedi. Lütfen tekrar deneyin.';
    }

    if (err.status === 429) {
        return 'Kısa sürede çok fazla talep gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
    }

    return messageFromHttpError(err, 'Talep gönderilemedi. Lütfen tekrar deneyin.');
}
