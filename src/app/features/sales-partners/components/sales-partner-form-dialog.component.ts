import { Component, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import type { SalesPartnerDto } from '@/app/features/sales-partners/models/sales-partner.model';
import { SalesPartnersService } from '@/app/features/sales-partners/services/sales-partners.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Satış ortağı ekle/düzenle (kişisel veri asgari: ad, isteğe bağlı e-posta/telefon; bağlı kurum kimliği kendi kodu engeli için). */
@Component({
    selector: 'app-sales-partner-form-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, CheckboxModule, DialogModule, InputTextModule, MessageModule],
    template: `
        <p-dialog
            [header]="partner() ? 'Satış ortağını düzenle' : 'Yeni satış ortağı'"
            [modal]="true"
            [(visible)]="visible"
            [style]="{ width: 'min(32rem, 95vw)' }"
            [draggable]="false"
            [closable]="!submitting()"
        >
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
                @if (error()) {
                    <p-message severity="error" styleClass="w-full" role="alert">{{ error() }}</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="spName" class="text-sm font-medium text-muted-color">Ad *</label>
                    <input id="spName" pInputText formControlName="name" autocomplete="off" maxlength="200" />
                    @if (form.controls.name.invalid && form.controls.name.touched) {
                        <small class="text-red-500">Ad 2–200 karakter olmalı.</small>
                    }
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="spEmail" class="text-sm font-medium text-muted-color">E-posta</label>
                        <input id="spEmail" pInputText type="email" formControlName="email" autocomplete="off" maxlength="200" />
                        @if (form.controls.email.invalid && form.controls.email.touched) {
                            <small class="text-red-500">Geçerli bir e-posta yazın.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1">
                        <label for="spPhone" class="text-sm font-medium text-muted-color">Telefon</label>
                        <input id="spPhone" pInputText formControlName="phone" autocomplete="off" maxlength="30" />
                    </div>
                </div>
                <div class="flex flex-col gap-1">
                    <label for="spTenant" class="text-sm font-medium text-muted-color">Ortağın kendi kurum kimliği</label>
                    <input id="spTenant" pInputText formControlName="linkedTenantId" autocomplete="off" placeholder="İsteğe bağlı" />
                    <small class="text-muted-color">Ortak bir klinik işletiyorsa: bu kurum ortağın kodlarını kullanamaz. E-posta da aynı amaçla karşılaştırılır.</small>
                    @if (form.controls.linkedTenantId.invalid && form.controls.linkedTenantId.touched) {
                        <small class="text-red-500">Kurum kimliği GUID biçiminde olmalı.</small>
                    }
                </div>
                @if (partner()) {
                    <div class="flex items-center gap-2">
                        <p-checkbox inputId="spActive" formControlName="isActive" [binary]="true" />
                        <label for="spActive" class="text-sm">Aktif (pasif ortağın kodları yeni kullanımda reddedilir)</label>
                    </div>
                }
                <div class="flex flex-wrap justify-end gap-2 pt-2">
                    <p-button type="button" [label]="copy.buttonCancel" severity="secondary" (onClick)="visible.set(false)" [disabled]="submitting()" />
                    <p-button type="submit" [label]="copy.buttonSave" icon="pi pi-check" [loading]="submitting()" [disabled]="submitting()" />
                </div>
            </form>
        </p-dialog>
    `
})
export class SalesPartnerFormDialogComponent {
    readonly visible = model(false);
    /** Düzenlenen ortak; `null` yeni kayıt. */
    readonly partner = input<SalesPartnerDto | null>(null);
    readonly saved = output<SalesPartnerDto>();

    readonly copy = PANEL_COPY;
    readonly submitting = signal(false);
    readonly error = signal<string | null>(null);

    private readonly fb = inject(FormBuilder);
    private readonly partners = inject(SalesPartnersService);

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200), Validators.pattern(/\S/)]],
        email: ['', [Validators.email, Validators.maxLength(200)]],
        phone: ['', [Validators.maxLength(30)]],
        linkedTenantId: ['', [Validators.pattern(GUID_PATTERN)]],
        isActive: [true]
    });

    constructor() {
        effect(() => {
            if (this.visible()) {
                const p = untracked(() => this.partner());

                untracked(() => {
                    this.error.set(null);
                    this.form.reset({
                        name: p?.name ?? '',
                        email: p?.email ?? '',
                        phone: p?.phone ?? '',
                        linkedTenantId: p?.linkedTenantId ?? '',
                        isActive: p?.isActive ?? true
                    });
                });
            }
        });
    }

    submit(): void {
        if (this.form.invalid || this.submitting()) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();
        const input = {
            name: v.name.trim(),
            email: v.email.trim() || null,
            phone: v.phone.trim() || null,
            linkedTenantId: v.linkedTenantId.trim() || null,
            isActive: v.isActive
        };
        const existing = this.partner();

        this.submitting.set(true);
        this.error.set(null);
        (existing ? this.partners.update(existing.id, input) : this.partners.create(input)).subscribe({
            next: (saved) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.saved.emit(saved);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.error.set(e instanceof Error ? e.message : 'Kayıt başarısız.');
            }
        });
    }
}
