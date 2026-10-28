import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import { memberRemoveMessage } from '@/app/features/tenant-members/utils/tenant-member-remove-mutation.utils';

const REMOVE_FAILED = 'Üye çıkarılamadı. Lütfen tekrar deneyin.';

/**
 * Üyeyi kurumdan çıkarma onayı (`DELETE .../members/{memberId}`); üye detayı ve üye listesi satırı aynı diyaloğu kullanır.
 * Başarıda `removed`, hatada Türkçe mesaj diyalogda kalır. Yetki ve "kendi hesabı değil" denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-tenant-member-remove-dialog',
    standalone: true,
    imports: [ButtonModule, DialogModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog header="Üyeyi kurumdan çıkar" [modal]="true" [draggable]="false" [dismissableMask]="!busy()" [closable]="!busy()" [style]="{ width: 'min(32rem, 95vw)' }" [(visible)]="visible">
            @if (member(); as m) {
                <p class="mt-0 mb-2 font-medium break-all">{{ m.email }}</p>
            }
            <p class="text-sm text-muted-color mt-0 mb-4">Bu kullanıcı kurum üyeliğini kaybedecek. Devam etmek istiyor musunuz?</p>
            @if (error()) {
                <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ error() }}</p>
            }
            <div class="flex flex-wrap justify-end gap-2">
                <button pButton type="button" severity="secondary" [disabled]="busy()" (click)="visible.set(false)">Vazgeç</button>
                <button pButton type="button" severity="danger" [disabled]="busy()" (click)="confirm()"><i class="p-button-icon" [class]="busy() ? 'pi pi-spin pi-spinner' : 'pi pi-user-minus'"></i>Üyeyi çıkar</button>
            </div>
        </p-dialog>
    `
})
export class TenantMemberRemoveDialogComponent {
    readonly visible = model(false);
    readonly member = input<{ id: string; email: string } | null>(null);
    readonly removed = output<void>();

    private readonly tenantMembers = inject(TenantMembersService);

    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.error.set(null));
            }
        });
    }

    confirm(): void {
        const m = this.member();

        if (!m || this.busy()) {
            return;
        }

        this.error.set(null);
        this.busy.set(true);
        this.tenantMembers.removeMember(m.id).subscribe({
            next: () => {
                this.busy.set(false);
                this.visible.set(false);
                this.removed.emit();
            },
            error: (e: unknown) => {
                this.busy.set(false);
                this.error.set(e instanceof HttpErrorResponse ? memberRemoveMessage(e, REMOVE_FAILED) : REMOVE_FAILED);
            }
        });
    }
}
