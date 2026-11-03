import { readPendingRequestsView, writePendingRequestsView } from './pending-requests-view-preference';

describe('pending-requests-view-preference', () => {
    beforeEach(() => localStorage.clear());

    it('kayıt yoksa ya da kullanıcı yoksa varsayılan çiptir', () => {
        expect(readPendingRequestsView('u1')).toBe('chip');
        expect(readPendingRequestsView(null)).toBe('chip');
    });

    it('tercih kullanıcı başına saklanır', () => {
        writePendingRequestsView('u1', 'tiles');

        expect(localStorage.getItem('vetinity.pendingRequestsView.u1')).toBe('tiles');
        expect(readPendingRequestsView('u1')).toBe('tiles');
        expect(readPendingRequestsView('u2')).toBe('chip');

        writePendingRequestsView('u1', 'chip');
        expect(readPendingRequestsView('u1')).toBe('chip');
    });

    it('tanınmayan değer ya da erişilemeyen depo varsayılana düşer; kullanıcı yoksa yazılmaz', () => {
        localStorage.setItem('vetinity.pendingRequestsView.u1', 'bilinmeyen');
        expect(readPendingRequestsView('u1')).toBe('chip');

        writePendingRequestsView(null, 'tiles');
        expect(localStorage.length).toBe(1);

        const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('engelli');
        });

        expect(readPendingRequestsView('u1')).toBe('chip');
        getItem.mockRestore();
    });
});
