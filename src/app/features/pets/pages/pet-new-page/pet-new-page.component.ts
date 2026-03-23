import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import type { CreatePetRequest } from '@/app/features/pets/models/pet-create.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { PET_GENDER_FORM_OPTIONS, PET_STATUS_FORM_OPTIONS } from '@/app/features/pets/utils/pet-status.utils';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { clientOptionsFromList, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { messageFromHttpError } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-pet-new-page',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        SelectModule,
        AppPageHeaderComponent
    ],
    template: `
        <a routerLink="/panel/pets" class="text-primary font-medium no-underline inline-block mb-4">← Hayvan listesine dön</a>

        <app-page-header title="Yeni Hayvan" subtitle="Hasta yönetimi" description="Hayvan kaydı oluşturun." />

        <div class="card">
            @if (selectionError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert">{{ selectionError() }}</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="clientId" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                        <p-select
                            inputId="clientId"
                            formControlName="clientId"
                            [options]="clientOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Müşteri seçin"
                            [filter]="true"
                            filterBy="label"
                            [showClear]="true"
                            styleClass="w-full"
                            [loading]="loadingClients()"
                        />
                        @if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="name" class="block text-sm font-medium text-muted-color mb-2">Hayvan adı *</label>
                        <input id="name" pInputText class="w-full" formControlName="name" />
                        @if (form.controls.name.invalid && form.controls.name.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="species" class="block text-sm font-medium text-muted-color mb-2">Tür *</label>
                        <input id="species" pInputText class="w-full" formControlName="species" placeholder="Örn. Köpek, Kedi" />
                        @if (form.controls.species.invalid && form.controls.species.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="breed" class="block text-sm font-medium text-muted-color mb-2">Cins</label>
                        <input id="breed" pInputText class="w-full" formControlName="breed" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="gender" class="block text-sm font-medium text-muted-color mb-2">Cinsiyet</label>
                        <p-select
                            inputId="gender"
                            formControlName="gender"
                            [options]="genderOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Seçin"
                            [showClear]="true"
                            styleClass="w-full"
                        />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="birthDate" class="block text-sm font-medium text-muted-color mb-2">Doğum tarihi</label>
                        <input id="birthDate" type="date" class="w-full p-inputtext p-component" formControlName="birthDate" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="color" class="block text-sm font-medium text-muted-color mb-2">Renk</label>
                        <input id="color" pInputText class="w-full" formControlName="color" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="weight" class="block text-sm font-medium text-muted-color mb-2">Kilo (kg)</label>
                        <input id="weight" type="number" step="0.01" min="0" class="w-full p-inputtext p-component" formControlName="weightStr" />
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="status" class="block text-sm font-medium text-muted-color mb-2">Durum *</label>
                        <p-select
                            inputId="status"
                            formControlName="status"
                            [options]="statusOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Durum seçin"
                            styleClass="w-full"
                        />
                        @if (form.controls.status.invalid && form.controls.status.touched) {
                            <small class="text-red-500">Zorunlu alan.</small>
                        }
                    </div>
                    <div class="col-span-12">
                        <label for="notes" class="block text-sm font-medium text-muted-color mb-2">Notlar</label>
                        <textarea id="notes" rows="3" class="w-full p-inputtext p-component" formControlName="notes"></textarea>
                    </div>
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <p-button
                        type="submit"
                        [label]="copy.buttonSave"
                        icon="pi pi-check"
                        [loading]="submitting()"
                        [disabled]="form.invalid || submitting() || loadingClients()"
                    />
                    <p-button
                        type="button"
                        [label]="copy.buttonCancel"
                        icon="pi pi-times"
                        severity="secondary"
                        (onClick)="goList()"
                        [disabled]="submitting()"
                    />
                </div>
            </form>
        </div>
    `
})
export class PetNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;

    private readonly fb = inject(FormBuilder);
    private readonly petsService = inject(PetsService);
    private readonly clientsService = inject(ClientsService);
    private readonly router = inject(Router);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly selectionError = signal<string | null>(null);
    readonly loadingClients = signal(false);
    readonly clientOptions = signal<SelectOption[]>([]);

    readonly statusOptions = [...PET_STATUS_FORM_OPTIONS];
    readonly genderOptions = [...PET_GENDER_FORM_OPTIONS];

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        name: ['', Validators.required],
        species: ['', Validators.required],
        breed: [''],
        gender: [''],
        birthDate: [''],
        color: [''],
        weightStr: [''],
        status: ['active', Validators.required],
        notes: ['']
    });

    ngOnInit(): void {
        this.loadClients();
    }

    goList(): void {
        void this.router.navigate(['/panel/pets']);
    }

    onSubmit(): void {
        this.submitError.set(null);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const wRaw = v.weightStr.trim();
        const wNum = wRaw === '' ? null : Number(wRaw);
        const payload: CreatePetRequest = {
            clientId: v.clientId.trim(),
            name: v.name.trim(),
            species: v.species.trim(),
            breed: v.breed.trim() || undefined,
            gender: v.gender.trim() || undefined,
            birthDateInput: v.birthDate.trim() || undefined,
            color: v.color.trim() || undefined,
            weight: wNum != null && !Number.isNaN(wNum) ? wNum : null,
            status: v.status.trim(),
            notes: v.notes.trim() || undefined
        };

        this.submitting.set(true);
        this.petsService.createPet(payload).subscribe({
            next: ({ id }) => {
                this.submitting.set(false);
                void this.router.navigate(['/panel/pets', id]);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(this.mapSubmitError(e));
            }
        });
    }

    private loadClients(): void {
        this.loadingClients.set(true);
        this.selectionError.set(null);
        this.clientsService.getClients({ page: 1, pageSize: 300 }).subscribe({
            next: (r) => {
                this.clientOptions.set(clientOptionsFromList(r.items));
                this.loadingClients.set(false);
            },
            error: (e: unknown) => {
                this.selectionError.set(this.mapLoadError(e, 'Müşteri listesi yüklenemedi.'));
                this.loadingClients.set(false);
            }
        });
    }

    private mapLoadError(e: unknown, fallback: string): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, fallback);
        }
        return e instanceof Error ? e.message : fallback;
    }

    private mapSubmitError(e: unknown): string {
        if (e instanceof HttpErrorResponse) {
            return messageFromHttpError(e, 'Kayıt oluşturulamadı.');
        }
        return e instanceof Error ? e.message : 'Kayıt oluşturulamadı.';
    }
}
