import { Observable, of, throwError } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import type { ImportBatchStatus, ImportCommitProgressDto } from '@/app/features/imports/models/import-api.model';
import { IMPORT_JOB_STALL_MS, IMPORT_PROGRESS_MAX_FAILURES, IMPORT_PROGRESS_POLL_MS, pollImportProgress } from '@/app/features/imports/utils/import-progress-poll.utils';

const progress = (status: ImportBatchStatus, processed = 0, leaseActive = true): ImportCommitProgressDto => ({
    id: 'b1',
    status,
    phase: status === 'Validating' ? 'Validating' : null,
    processed,
    total: 10,
    updatedAtUtc: null,
    committedAtUtc: null,
    leaseActive
});

/** Her çağrıda sıradaki yanıtı döner; `Error` örneği hata olarak yayılır. */
function responses(...items: (ImportCommitProgressDto | Error)[]): () => Observable<ImportCommitProgressDto> {
    let i = 0;
    return () => {
        const item = items[Math.min(i++, items.length - 1)];
        return item instanceof Error ? throwError(() => item) : of(item);
    };
}

describe('pollImportProgress', () => {
    let scheduler: TestScheduler;
    const P = IMPORT_PROGRESS_POLL_MS;

    beforeEach(() => {
        scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
    });

    it('iş sürerken her yanıtı yayar, durum değişince son yanıtı running=false ile yayıp biter', () => {
        scheduler.run(({ expectObservable }) => {
            const fetch = responses(progress('Validating', 0), progress('Validating', 5), progress('Validated'));
            expectObservable(pollImportProgress(fetch, 'Validating')).toBe(`a ${P - 1}ms b ${P - 1}ms (c|)`, {
                a: { progress: progress('Validating', 0), running: true, stalled: false },
                b: { progress: progress('Validating', 5), running: true, stalled: false },
                c: { progress: progress('Validated'), running: false, stalled: false }
            });
        });
    });

    it('tek yoklama hatasını yutar ve sayacı başarıdan sonra sıfırlar', () => {
        scheduler.run(({ expectObservable }) => {
            const err = new Error('ağ');
            const fetch = responses(err, err, progress('Validating', 1), err, err, progress('Committed'));
            expectObservable(pollImportProgress(fetch, 'Validating')).toBe(`${2 * P}ms a ${3 * P - 1}ms (b|)`, {
                a: { progress: progress('Validating', 1), running: true, stalled: false },
                b: { progress: progress('Committed'), running: false, stalled: false }
            });
        });
    });

    it(`art arda ${IMPORT_PROGRESS_MAX_FAILURES} hatada son hatayla sonlanır`, () => {
        scheduler.run(({ expectObservable }) => {
            const err = new Error('ağ');
            expectObservable(pollImportProgress(responses(err), 'Committing')).toBe(`${(IMPORT_PROGRESS_MAX_FAILURES - 1) * P}ms #`, undefined, err);
        });
    });

    it('kira uzun süre boş kalırsa stalled işaretler; kira dolunca işaret kalkar', () => {
        const waits = IMPORT_JOB_STALL_MS / P;
        const queued = Array.from({ length: waits + 1 }, () => progress('Validating', 0, false));
        const fetch = responses(...queued, progress('Validating', 3, true), progress('Validated'));
        const ticks: boolean[] = [];
        scheduler.run(() => {
            pollImportProgress(fetch, 'Validating').subscribe((t) => ticks.push(t.stalled));
        });
        expect(ticks.length).toBe(waits + 3);
        expect(ticks.slice(0, waits)).toEqual(Array<boolean>(waits).fill(false));
        expect(ticks[waits]).toBeTrue();
        expect(ticks[waits + 1]).toBeFalse();
        expect(ticks[waits + 2]).toBeFalse();
    });
});
