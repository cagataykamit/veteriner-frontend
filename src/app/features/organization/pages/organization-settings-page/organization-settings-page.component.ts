import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { finalize, switchMap } from 'rxjs';
import type { SubscriptionStatusKey, SubscriptionSummaryVm } from '@/app/features/subscriptions/models/subscription-vm.model';
import { OrganizationSettingsService } from '@/app/features/organization/services/organization-settings.service';
import { SubscriptionsService } from '@/app/features/subscriptions/services/subscriptions.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { subscriptionPlanLabel } from '@/app/features/subscriptions/utils/subscription-plan.utils';
import { subscriptionStatusLabel } from '@/app/features/subscriptions/utils/subscription-status.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

@Component({
    selector: 'app-organization-settings-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-right" />
        <app-page-header
            title="Kurum Bilgileri"
            subtitle="Hesap"
            description="Kurum adınızı görüntüleyip güncelleyebilirsiniz. Paket ve ödeme işlemleri için Abonelik sayfasını kullanın."
        />

        @if (loading()) {
            <app-loading-state message="Kurum bilgileri yükleniyor…" />
        } @else if (error(); as err) {
            <div class="card">
                <app-error-state title="Kurum bilgileri alınamadı" [detail]="err" (retry)="reload()" />
            </div>
        } @else if (summary(); as s) {
            <div class="card mb-4">
                <h5 class="mt-0 mb-3">Özet</h5>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-3 m-0 text-sm">
                    <div class="md:col-span-2">
                        <dt class="text-muted-color font-medium m-0 mb-1">Kurum adı</dt>
                        <dd class="m-0 text-base font-medium break-words">{{ s.tenantName }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Abonelik durumu (özet)</dt>
                        <dd class="m-0">
                            {{ statusLabel(s.status) }} · {{ planSummary(s) }}
                        </dd>
                    </div>
                </dl>
                <p class="text-sm text-muted-color mt-4 mb-0">
                    Faturalama, paket yükseltme ve deneme bilgileri
                    <a routerLink="/panel/settings/subscription" class="text-primary font-medium no-underline">Abonelik</a>
                    ekranındadır; burada yalnızca kurum adı düzenlenir.
                </p>
            </div>

            <div class="card">
                <h5 class="mt-0 mb-4">Kurum adını düzenle</h5>
                @if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">
                        Bu kurum salt okunur moddadır; kurum adı güncellenemez.
                    </p>
                }
                @if (formError()) {
                    <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ formError() }}</p>
                }
                <form [formGroup]="form" (ngSubmit)="onSave()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-8">
                            <label for="orgTenantName" class="block text-sm font-medium text-muted-color mb-2">Kurum adı *</label>
                            <input
                                id="orgTenantName"
                                pInputText
                                class="w-full"
                                formControlName="tenantName"
                                autocomplete="organization"
                                [disabled]="ro.mutationBlocked()"
                            />
                            @if (form.controls.tenantName.invalid && form.controls.tenantName.touched) {
                                <small class="text-red-500">Kurum adı en az bir karakter içermelidir.</small>
                            }
                        </div>
                    </div>
                    <div class="mt-4 mb-0">
                        <p-button
                            type="submit"
                            label="Kaydet"
                            icon="pi pi-save"
                            [loading]="saving()"
                            [disabled]="form.invalid || saving() || ro.mutationBlocked() || !form.dirty"
                        />
                    </div>
                </form>
            </div>
        }
    `
})
export class OrganizationSettingsPageComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly subscriptions = inject(SubscriptionsService);
    private readonly orgSettings = inject(OrganizationSettingsService);
    private readonly messages = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly summary = signal<SubscriptionSummaryVm | null>(null);
    readonly saving = signal(false);
    readonly formError = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        tenantName: ['', [Validators.maxLength(256), trimmedRequired()]]
    });

    ngOnInit(): void {
        this.load();
    }

    planSummary(s: SubscriptionSummaryVm): string {
        return subscriptionPlanLabel(s.planCode, s.planName);
    }

    statusLabel(status: SubscriptionStatusKey): string {
        return subscriptionStatusLabel(status);
    }

    reload(): void {
        this.load();
    }

    private load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.summary.set(null);
        this.formError.set(null);
        this.subscriptions.getSubscriptionSummary({ bustCache: true }).subscribe({
            next: (s) => {
                this.summary.set(s);
                this.ro.applySummary(s);
                this.form.patchValue({ tenantName: tenantNameForEdit(s.tenantName) });
                this.form.markAsPristine();
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    onSave(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        this.formError.set(null);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const name = this.form.controls.tenantName.getRawValue().trim();
        this.saving.set(true);
        this.orgSettings
            .updateTenantDisplayName(name)
            .pipe(
                switchMap(() => this.subscriptions.getSubscriptionSummary({ bustCache: true })),
                finalize(() => this.saving.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (s) => {
                    this.summary.set(s);
                    this.ro.applySummary(s);
                    this.form.patchValue({ tenantName: tenantNameForEdit(s.tenantName) });
                    this.form.markAsPristine();
                    this.messages.add({
                        severity: 'success',
                        summary: 'Kaydedildi',
                        detail: 'Kurum adı güncellendi.'
                    });
                },
                error: (e: Error) => {
                    this.formError.set(e.message ?? 'Kayıt başarısız');
                }
            });
    }
}

function trimmedRequired(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = control.value;
        if (typeof v !== 'string' || !v.trim().length) {
            return { required: true };
        }
        return null;
    };
}

/** Mapper boş ad için em dash kullanır; düzenleme alanı boş başlar. */
function tenantNameForEdit(displayTenantName: string): string {
    const t = displayTenantName.trim();
    if (!t || t === '\u2014') {
        return '';
    }
    return displayTenantName.trim();
}
