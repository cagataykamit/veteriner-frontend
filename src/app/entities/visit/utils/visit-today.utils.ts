import type { TodayVm } from '@/app/entities/visit/models/visit-vm.model';

/** Bugün kuyruğunda bekleyen (henüz muayeneye alınmamış) hasta sayısı; menü sayacı bu sayıyı gösterir. */
export function countWaitingVisits(today: TodayVm): number {
    return today.items.filter((item) => item.careStatus === 'Waiting').length;
}
