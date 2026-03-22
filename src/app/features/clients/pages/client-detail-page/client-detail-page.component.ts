import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import type { ClientDetailVm } from '@/app/features/clients/models/client-vm.model';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { clientStatusLabel, clientStatusSeverity } from '@/app/features/clients/utils/client-status.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { EMPTY, switchMap } from 'rxjs';

@Component({
    selector: 'app-client-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        TableModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppEmptyStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    template: `
        <a routerLink="/panel/clients" class="text-primary font-medium no-underline inline-block mb-4">← Müşteri listesine dön</a>

        @if (loading()) {
            <app-loading-state message="Müşteri yükleniyor…" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="reload()" />
            </div>
        } @else if (client()) {
            <app-page-header [title]="client()!.fullName" subtitle="Müşteri" [description]="'Kayıt: ' + formatDt(client()!.createdAtUtc)" />

            <div class="grid grid-cols-12 gap-8">
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Genel bilgiler</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Durum</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">
                                <app-status-tag [label]="statusLabel(client()!.status)" [severity]="statusSeverity(client()!.status)" />
                            </dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Oluşturulma</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDt(client()!.createdAtUtc) }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Güncellenme</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ formatDt(client()!.updatedAtUtc) }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">İletişim bilgileri</h5>
                        <dl class="m-0 grid grid-cols-12 gap-3">
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Telefon</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.phone }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">E-posta</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.email }}</dd>
                            <dt class="col-span-12 sm:col-span-4 text-muted-color">Adres</dt>
                            <dd class="col-span-12 sm:col-span-8 m-0">{{ client()!.address }}</dd>
                        </dl>
                    </div>
                </div>
                <div class="col-span-12">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Notlar</h5>
                        <p class="m-0 whitespace-pre-wrap">{{ client()!.notes }}</p>
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Hayvan özeti</h5>
                        @if (client()!.petsSummary.totalCount === 0 && client()!.petsSummary.items.length === 0) {
                            <app-empty-state message="Hayvan özeti yok veya henüz kayıt yok." />
                        } @else {
                            <p class="text-muted-color mt-0 mb-3">Toplam: {{ client()!.petsSummary.totalCount }}</p>
                            @if (client()!.petsSummary.items.length > 0) {
                                <p-table [value]="client()!.petsSummary.items" [paginator]="false" [tableStyle]="{ 'min-width': '100%' }">
                                    <ng-template #header>
                                        <tr>
                                            <th>Pet</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template #body let-row>
                                        <tr>
                                            <td>{{ row.name }}</td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            }
                        }
                    </div>
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <div class="card">
                        <h5 class="mt-0 mb-4">Randevu özeti</h5>
                        @if (client()!.appointmentsSummary.totalCount === 0 && client()!.appointmentsSummary.upcomingCount == null) {
                            <app-empty-state message="Randevu özeti yok veya henüz kayıt yok." />
                        } @else {
                            <dl class="m-0 grid grid-cols-12 gap-3">
                                <dt class="col-span-12 sm:col-span-6 text-muted-color">Toplam randevu</dt>
                                <dd class="col-span-12 sm:col-span-6 m-0">{{ client()!.appointmentsSummary.totalCount }}</dd>
                                @if (client()!.appointmentsSummary.upcomingCount != null) {
                                    <dt class="col-span-12 sm:col-span-6 text-muted-color">Yaklaşan</dt>
                                    <dd class="col-span-12 sm:col-span-6 m-0">{{ client()!.appointmentsSummary.upcomingCount }}</dd>
                                }
                            </dl>
                        }
                    </div>
                </div>
            </div>
        }
    `
})
export class ClientDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly clientsService = inject(ClientsService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly client = signal<ClientDetailVm | null>(null);

    private lastId: string | null = null;

    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly statusLabel = clientStatusLabel;
    readonly statusSeverity = clientStatusSeverity;

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                switchMap((params) => {
                    const id = params.get('id');
                    if (!id) {
                        this.error.set('Geçersiz client.');
                        this.loading.set(false);
                        return EMPTY;
                    }
                    this.lastId = id;
                    this.loading.set(true);
                    this.error.set(null);
                    return this.clientsService.getClientById(id);
                })
            )
            .subscribe({
                next: (c) => {
                    this.client.set(c);
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
        this.clientsService.getClientById(this.lastId).subscribe({
            next: (c) => {
                this.client.set(c);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
