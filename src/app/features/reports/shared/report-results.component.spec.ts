import { HttpErrorResponse } from '@angular/common/http';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, Subject, of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ReportListQueryBase, ReportListResultBase, ReportListSource, ReportListState } from './report-list-state';
import { ReportResultsComponent } from './report-results.component';

type Row = { name: string };
type Result = ReportListResultBase & { items: readonly Row[] };

const KEY = 'panel:reports:results-test:listState';

let pending: Subject<Result>;

const source: ReportListSource<ReportListQueryBase, Result> = {
    loadReport: () => pending,
    exportCsvBlob: () => EMPTY,
    exportXlsxBlob: () => EMPTY
};

@Component({
    standalone: true,
    imports: [ReportResultsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-report-results [state]="state" emptyMessage="Kayıt yok" emptyHint="Süzgeci değiştirin">
            <ng-template #rows>
                @for (row of state.report()!.items; track $index) {
                    <div class="test-row">{{ row.name }}</div>
                }
            </ng-template>
        </app-report-results>
    `
})
class HostComponent {
    readonly state = new ReportListState<ReportListQueryBase, Result>({ source, stateKey: KEY, readClaim: 'Test.Read', exportFilePrefix: 'test' });
}

function result(...names: string[]): Result {
    return { page: 1, pageSize: 25, totalCount: names.length, items: names.map((name) => ({ name })) };
}

describe('ReportResultsComponent', () => {
    let fixture: ComponentFixture<HostComponent>;

    const el = () => fixture.nativeElement as HTMLElement;
    const text = () => el().textContent ?? '';
    const rows = () => Array.from(el().querySelectorAll('.test-row')).map((r) => r.textContent?.trim());
    const body = () => el().querySelector<HTMLElement>('[data-testid="report-results-body"]');

    function respond(r: Result): void {
        pending.next(r);
        pending.complete();
        fixture.detectChanges();
    }

    /** Yeni süzgeçle istek atar; yanıt `respond` ile verilene kadar bekler. */
    function applySearch(search: string): void {
        pending = new Subject<Result>();
        fixture.componentInstance.state.searchInput = search;
        fixture.componentInstance.state.applyFilters();
        fixture.detectChanges();
    }

    beforeEach(() => {
        sessionStorage.removeItem(KEY);
        pending = new Subject<Result>();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: AuthService,
                    useValue: { hasOperationClaim: () => true, getMyClinics: () => of([]), getJwtClinicId: () => null }
                }
            ]
        });
        fixture = TestBed.createComponent(HostComponent);
        fixture.componentInstance.state.init();
        fixture.detectChanges();
    });

    it('ilk yüklemede "yükleniyor" durumu görünür; sonuç gelince satırlar ve toplam kayıt gösterilir', () => {
        expect(text()).toContain(PANEL_COPY.reportsLoadingMessage);
        expect(body()).toBeNull();

        respond(result('Pamuk', 'Boncuk'));

        expect(text()).not.toContain(PANEL_COPY.reportsLoadingMessage);
        expect(rows()).toEqual(['Pamuk', 'Boncuk']);
        expect(text()).toContain(PANEL_COPY.reportsTotalRecords);
        expect(body()!.getAttribute('aria-busy')).toBe('false');
        expect(body()!.classList).not.toContain('opacity-60');
    });

    it('süzgeç değişince eski satırlar yerinde kalır ve soluklaşır; yanıt gelince yeni satırlar gelir', () => {
        respond(result('Pamuk', 'Boncuk'));

        applySearch('tekir');

        expect(text()).not.toContain(PANEL_COPY.reportsLoadingMessage);
        expect(rows()).toEqual(['Pamuk', 'Boncuk']);
        expect(body()!.getAttribute('aria-busy')).toBe('true');
        expect(body()!.classList).toContain('opacity-60');

        respond(result('Tekir'));

        expect(rows()).toEqual(['Tekir']);
        expect(body()!.getAttribute('aria-busy')).toBe('false');
        expect(body()!.classList).not.toContain('opacity-60');
    });

    it('boş sonuçtan yenilemede de boş durum yerinde kalır; yenileme hatası eski satırların yerine hata gösterir', () => {
        respond(result());
        applySearch('tekir');

        expect(text()).toContain('Kayıt yok');
        expect(text()).not.toContain(PANEL_COPY.reportsLoadingMessage);

        pending.error(new HttpErrorResponse({ status: 500 }));
        fixture.detectChanges();

        expect(body()).toBeNull();
        expect(el().querySelector('app-error-state')).not.toBeNull();
    });
});
