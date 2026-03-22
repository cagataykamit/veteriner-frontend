import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { ExaminationDetailVm } from '@/app/features/examinations/models/examination-vm.model';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { examinationStatusLabel, examinationStatusSeverity } from '@/app/features/examinations/utils/examination-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateDisplay, formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-examination-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <a routerLink="/panel/examinations" class="text-primary font-medium no-underline inline-block mb-4">← Muayene listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Muayene yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (exam()) {
            <app-page-header
                title="Muayene"
                subtitle="Klinik"
                [description]="formatDateTime(exam()!.examinationDateUtc) + ' · ' + statusLabel(exam()!.status)"
            />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(exam()!.status)" [severity]="statusSeverity(exam()!.status)" />
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Muayene tarihi</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDateTime(exam()!.examinationDateUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(exam()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDate(exam()!.updatedAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Müşteri / hayvan</h5>
                        @if (exam()!.clientId) {
                            <p class="mt-0 mb-2">
                                <a [routerLink]="['/panel/clients', exam()!.clientId]" class="text-primary font-medium no-underline">Müşteri detayı →</a>
                            </p>
                        }
                        @if (exam()!.petId) {
                            <p class="mt-0 mb-3">
                                <a [routerLink]="['/panel/pets', exam()!.petId]" class="text-primary font-medium no-underline">Hayvan detayı →</a>
                            </p>
                        }
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Müşteri</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ exam()!.clientName }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Hayvan</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ exam()!.petName }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Şikayet</h5>
                        @if (exam()!.complaint === emptyMark) {
                            <app-empty-state message="Şikayet girilmemiş." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.complaint }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Bulgular</h5>
                        @if (exam()!.findings === emptyMark) {
                            <app-empty-state message="Bulgu kaydı yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.findings }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Tanı</h5>
                        @if (exam()!.diagnosis === emptyMark) {
                            <app-empty-state message="Tanı girilmemiş." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.diagnosis }}</p>
                        }
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        @if (exam()!.notes === emptyMark) {
                            <app-empty-state message="Not yok." />
                        } @else {
                            <p class="m-0 whitespace-pre-wrap">{{ exam()!.notes }}</p>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class ExaminationDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly examinationsService = inject(ExaminationsService);

    /** Mapper boş metin için kullandığı EM ile aynı. */
    readonly emptyMark = '—';

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly exam = signal<ExaminationDetailVm | null>(null);

    private lastId: string | null = null;

    readonly formatDate = (v: string | null) => formatDateDisplay(v);
    readonly formatDateTime = (v: string | null) => formatDateTimeDisplay(v);
    readonly statusLabel = examinationStatusLabel;
    readonly statusSeverity = examinationStatusSeverity;

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    if (!id) {
                        this.error.set('Geçersiz muayene.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    return this.examinationsService.getExaminationById(id);
                })
            )
            .subscribe({
                next: (x) => {
                    this.exam.set(x);
                    this.loading.set(false);
                },
                error: (e: Error) => {
                    this.error.set(e.message ?? 'Yükleme hatası');
                    this.loading.set(false);
                }
            });
    }

    reload(): void {
        if (!this.lastId) {
            return;
        }
        this.loading.set(true);
        this.error.set(null);
        this.examinationsService.getExaminationById(this.lastId).subscribe({
            next: (x) => {
                this.exam.set(x);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
