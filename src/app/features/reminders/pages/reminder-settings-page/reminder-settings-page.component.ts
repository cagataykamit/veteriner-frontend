import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ToastModule } from 'primeng/toast';
import {
    createReminderSettingsFormGroup,
    getReminderSettingsFormValue
} from '@/app/features/reminders/forms/reminder-settings-form.factory';
import { mapReminderSettingsFormToUpdateRequest } from '@/app/features/reminders/data/reminders.mapper';
import { RemindersService } from '@/app/features/reminders/services/reminders.service';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

@Component({
    selector: 'app-reminder-settings-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        InputNumberModule,
        ToggleSwitchModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-right" />
        <app-page-header title="Hatırlatmalar" subtitle="Hesap" description="Randevu ve aşı hatırlatma ayarlarını yönetin." />

        @if (loading()) {
            <app-loading-state message="Hatırlatma ayarları yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else {
            <div class="card">
                @if (showNoManagePermissionBanner()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">Bu ayarları değiştirme yetkiniz yok.</p>
                } @else if (ro.mutationBlocked()) {
                    <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">Hesap salt okunur durumda.</p>
                }

                <p class="text-sm text-muted-color mt-0 mb-4">Otomatik gönderim altyapısı sonraki fazda etkinleştirilecektir.</p>

                @if (updatedAtLabel()) {
                    <p class="text-sm text-muted-color mt-0 mb-4">Son güncelleme: {{ updatedAtLabel() }}</p>
                }

                @if (saveError()) {
                    <p class="text-red-500 text-sm mt-0 mb-4" role="alert">{{ saveError() }}</p>
                }

                <form [formGroup]="form" (ngSubmit)="onSave()">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label class="block text-sm font-medium text-muted-color mb-2">Randevu hatırlatmaları aktif</label>
                            <p-toggleswitch formControlName="appointmentRemindersEnabled" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label class="block text-sm font-medium text-muted-color mb-2">Randevudan kaç saat önce</label>
                            <p-inputNumber
                                formControlName="appointmentReminderHoursBefore"
                                [min]="1"
                                [max]="168"
                                [useGrouping]="false"
                                styleClass="w-full"
                            />
                            @if (form.controls.appointmentReminderHoursBefore.invalid && form.controls.appointmentReminderHoursBefore.touched) {
                                <small class="text-red-500">Saat değeri 1 ile 168 arasında olmalıdır.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label class="block text-sm font-medium text-muted-color mb-2">Aşı hatırlatmaları aktif</label>
                            <p-toggleswitch formControlName="vaccinationRemindersEnabled" />
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label class="block text-sm font-medium text-muted-color mb-2">Aşıdan kaç gün önce</label>
                            <p-inputNumber
                                formControlName="vaccinationReminderDaysBefore"
                                [min]="1"
                                [max]="30"
                                [useGrouping]="false"
                                styleClass="w-full"
                            />
                            @if (form.controls.vaccinationReminderDaysBefore.invalid && form.controls.vaccinationReminderDaysBefore.touched) {
                                <small class="text-red-500">Gün değeri 1 ile 30 arasında olmalıdır.</small>
                            }
                        </div>
                        <div class="col-span-12 md:col-span-6">
                            <label class="block text-sm font-medium text-muted-color mb-2">E-posta kanalı aktif</label>
                            <p-toggleswitch formControlName="emailChannelEnabled" />
                        </div>
                    </div>

                    <div class="mt-4">
                        <p-button
                            type="submit"
                            label="Kaydet"
                            icon="pi pi-save"
                            [loading]="saving()"
                            [disabled]="form.invalid || saving() || formDisabled() || !form.dirty"
                        />
                    </div>
                </form>
            </div>
        }
    `
})
export class ReminderSettingsPageComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly reminders = inject(RemindersService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly messages = inject(MessageService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly saveError = signal<string | null>(null);
    readonly updatedAtUtc = signal<string | null>(null);
    readonly canManage = signal(false);

    readonly form = createReminderSettingsFormGroup(this.fb);

    ngOnInit(): void {
        this.canManage.set(this.auth.hasOperationClaim('Reminders.Manage'));
        this.reload();
    }

    reload(): void {
        this.loading.set(true);
        this.error.set(null);
        this.reminders.getSettings().subscribe({
            next: (vm) => {
                this.form.patchValue({
                    appointmentRemindersEnabled: vm.appointmentRemindersEnabled,
                    appointmentReminderHoursBefore: vm.appointmentReminderHoursBefore,
                    vaccinationRemindersEnabled: vm.vaccinationRemindersEnabled,
                    vaccinationReminderDaysBefore: vm.vaccinationReminderDaysBefore,
                    emailChannelEnabled: vm.emailChannelEnabled
                });
                this.updatedAtUtc.set(vm.updatedAtUtc);
                this.form.markAsPristine();
                this.syncDisabledState();
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Hatırlatma ayarları yüklenemedi.');
                this.loading.set(false);
            }
        });
    }

    onSave(): void {
        if (this.formDisabled()) {
            return;
        }
        this.saveError.set(null);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.saving.set(true);
        const body = mapReminderSettingsFormToUpdateRequest(getReminderSettingsFormValue(this.form));
        this.reminders.updateSettings(body).subscribe({
            next: (vm) => {
                this.saving.set(false);
                this.updatedAtUtc.set(vm.updatedAtUtc);
                this.form.markAsPristine();
                addTracedToast(this.messages, 'ReminderSettingsPage', this.router.url, {
                    severity: 'success',
                    summary: 'Kaydedildi',
                    detail: 'Hatırlatma ayarları güncellendi.'
                });
            },
            error: (e: Error) => {
                this.saving.set(false);
                this.saveError.set(e.message ?? 'Hatırlatma ayarları kaydedilemedi.');
            }
        });
    }

    updatedAtLabel(): string | null {
        return formatUtcIsoAsLocalDateTimeDisplay(this.updatedAtUtc());
    }

    showNoManagePermissionBanner(): boolean {
        return !this.canManage();
    }

    formDisabled(): boolean {
        return this.ro.mutationBlocked() || !this.canManage();
    }

    private syncDisabledState(): void {
        if (this.formDisabled()) {
            this.form.disable({ emitEvent: false });
            return;
        }
        this.form.enable({ emitEvent: false });
    }
}
