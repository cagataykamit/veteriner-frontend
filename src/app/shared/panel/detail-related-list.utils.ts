import { DETAIL_RELATED_LIST_LIMIT } from '@/app/shared/constants/detail-list.constants';

export interface DetailRelatedListSlice<T> {
    readonly displayed: T[];
    readonly total: number;
}

/** İlişkili liste: en fazla `DETAIL_RELATED_LIST_LIMIT` satır (detay gömülü liste standardı). */
export function sliceDetailRelatedList<T>(items: readonly T[] | null | undefined): DetailRelatedListSlice<T> {
    const arr = items ?? [];
    const total = arr.length;
    return {
        displayed: arr.slice(0, DETAIL_RELATED_LIST_LIMIT),
        total
    };
}
