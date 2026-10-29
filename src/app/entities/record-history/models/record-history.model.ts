/** Geçmişi okunabilen kayıt kaynakları (`RECORD_HISTORY_API_CONTRACT.md` §2); değer uç yolunun parçasıdır. */
export type RecordHistoryResource =
    | 'examinations'
    | 'treatments'
    | 'prescriptions'
    | 'vaccinations'
    | 'lab-results'
    | 'administrations'
    | 'hospitalizations';

export type RecordChangeKind = 'Created' | 'Updated' | 'Deleted';

export interface RecordFieldChangeDto {
    field: string;
    oldValue: string | null;
    newValue: string | null;
}

export interface RecordChangeDto {
    id: string;
    kind: RecordChangeKind;
    occurredAtUtc: string;
    actorUserId: string;
    actorName: string | null;
    changes: RecordFieldChangeDto[];
}

export interface RecordFieldChangeVm {
    label: string;
    oldText: string;
    newText: string;
}

export interface RecordChangeVm {
    id: string;
    kindLabel: string;
    occurredAtUtc: string;
    actorName: string;
    changes: RecordFieldChangeVm[];
}
