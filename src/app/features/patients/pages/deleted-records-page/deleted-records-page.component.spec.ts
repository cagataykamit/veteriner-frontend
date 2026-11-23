import type { Mock } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { DeletedRecordRowVm } from '@/app/entities/record-deletion/models/record-deletion.model';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import { RecordDeletionError } from '@/app/entities/record-deletion/utils/record-deletion-error.utils';
import { DeletedRecordsPageComponent } from './deleted-records-page.component';

const clientRow: DeletedRecordRowVm = {
    kind: 'client',
    id: 'c1',
    title: 'Ayşe Yılmaz',
    detail: '+90 532 123 45 67',
    clientId: null,
    clientName: null,
    clientDeleted: false,
    deletedWithClient: false,
    deletedAtUtc: '2026-11-23T10:00:00Z',
    deletedByUserName: 'Dr. Ali Veli'
};

const petRow = (over: Partial<DeletedRecordRowVm> = {}): DeletedRecordRowVm => ({
    kind: 'pet',
    id: 'p1',
    title: 'Pamuk',
    detail: 'Kedi',
    clientId: 'c1',
    clientName: 'Ayşe Yılmaz',
    clientDeleted: false,
    deletedWithClient: false,
    deletedAtUtc: '2026-11-23T10:00:00Z',
    deletedByUserName: 'Dr. Ali Veli',
    ...over
});

const page = (items: DeletedRecordRowVm[]) => of({ items, page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 });

describe('DeletedRecordsPageComponent (Silinenler, ADR-054)', () => {
    let fixture: ComponentFixture<DeletedRecordsPageComponent>;
    let claims: Set<string>;
    let listDeleted: Mock;
    let restore: Mock;
    let query: Record<string, string>;

    const create = () => {
        TestBed.configureTestingModule({
            imports: [DeletedRecordsPageComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } },
                { provide: TenantReadOnlyContextService, useValue: { mutationBlocked: () => false } },
                { provide: RecordDeletionService, useValue: { listDeleted, restore } }
            ]
        });
        fixture = TestBed.createComponent(DeletedRecordsPageComponent);
        fixture.detectChanges();

        return fixture.componentInstance;
    };

    const el = () => fixture.nativeElement as HTMLElement;
    const q = (testId: string) => el().querySelector(`[data-testid="${testId}"]`);

    beforeEach(() => {
        claims = new Set(['Clients.Delete', 'Pets.Delete']);
        query = {};
        listDeleted = vi.fn().mockName('listDeleted').mockImplementation((kind: string) => page(kind === 'client' ? [clientRow] : [petRow(), petRow({ id: 'p2', title: 'Boncuk', clientDeleted: true })]));
        restore = vi.fn().mockName('restore').mockReturnValue(of(void 0));
    });

    it('iki izinle iki görünüm; müşteriler önce: silinme, silen ve "Geri yükle"', () => {
        const c = create();

        expect(c.viewOptions.map((o) => o.label)).toEqual(['Müşteriler', 'Hastalar']);
        expect(q('deleted-view')).not.toBeNull();
        expect(listDeleted).toHaveBeenCalledWith('client', { page: 1, pageSize: 10, search: undefined });
        const row = q('deleted-row-c1');

        expect(row?.textContent).toContain('Ayşe Yılmaz');
        expect(row?.textContent).toContain('23.11.2026');
        expect(row?.textContent).toContain('Dr. Ali Veli');
        expect(q('restore-c1')).not.toBeNull();
    });

    it('yalnız Pets.Delete: görünüm seçicisi yok, hastalar listelenir', () => {
        claims = new Set(['Pets.Delete']);
        const c = create();

        expect(c.viewOptions.map((o) => o.value)).toEqual(['pet']);
        expect(q('deleted-view')).toBeNull();
        expect(listDeleted).toHaveBeenCalledWith('pet', expect.anything());
    });

    it('hasta görünümü (?tab=pets): müşterisi silinmiş hastada geri yükleme yerine müşteri kartı bağlantısı', () => {
        query = { tab: 'pets' };
        create();

        expect(q('restore-p1')).not.toBeNull();
        expect(q('restore-p2')).toBeNull();
        const link = q('deleted-row-p2')?.querySelector('[data-testid="restore-client-first"]');

        expect(link?.textContent).toContain('Önce müşteriyi geri yükleyin');
        expect(link?.getAttribute('href')).toBe('/panel/clients/c1');
    });

    it('geri yükleme başarılı: bilgi ve kart bağlantısı, liste yeniden okunur', () => {
        const c = create();

        listDeleted.mockClear();
        c.restore(clientRow);
        fixture.detectChanges();

        expect(restore).toHaveBeenCalledWith('client', 'c1');
        expect(q('restore-feedback')?.textContent).toContain('Ayşe Yılmaz ve onunla birlikte silinen hastaları geri yüklendi.');
        expect(q('restore-feedback')?.querySelector('a')?.getAttribute('href')).toBe('/panel/clients/c1');
        expect(listDeleted).toHaveBeenCalledTimes(1);
    });

    it('RestoreConflict: hata metni ve çakışan müşteriye bağlantı', () => {
        restore.mockReturnValue(throwError(() => new RecordDeletionError('Aynı bilgilerle aktif bir müşteri var.', 'Clients.RestoreConflict', null, 'c9')));
        const c = create();

        c.restore(clientRow);
        fixture.detectChanges();

        expect(q('restore-feedback')?.getAttribute('role')).toBe('alert');
        expect(q('restore-feedback')?.textContent).toContain('Aynı bilgilerle aktif bir müşteri var.');
        expect(q('restore-feedback')?.querySelector('a')?.getAttribute('href')).toBe('/panel/clients/c9');
    });

    it('telefon satırları (G-04): silinme gününe göre; müşterisi silinmiş hastada yalnız müşteri kartı eylemi', () => {
        query = { tab: 'pets' };
        const c = create();
        const items = c.phoneItems();

        expect(items.map((i) => i.at)).toEqual(['2026-11-23T10:00:00Z', '2026-11-23T10:00:00Z']);
        expect(items[0].actions?.map((a) => a.label)).toEqual(['Geri yükle']);
        expect(items[1].actions?.map((a) => a.label)).toEqual(['Önce müşteriyi geri yükleyin']);
        expect(items[1].status?.label).toBe('Müşterisi silindi');
    });
});
