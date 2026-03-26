/**
 * Backend Veteriner API (OpenAPI 3) — Swagger ile uyumlu tam path'ler.
 * @see https://localhost:7173/swagger/index.html
 * @see ../../../../docs/BACKEND-INTEGRATION.md — query/create varsayımları ve notlar.
 */
export const ApiEndpoints = {
    auth: {
        login: () => `/api/v1/Auth/login`,
        refresh: () => `/api/v1/Auth/refresh`,
        selectClinic: () => `/api/v1/auth/select-clinic`,
        logout: () => `/api/v1/Auth/logout`,
        logoutAll: () => `/api/v1/Auth/logout-all`
    },
    me: {
        clinics: () => `/api/v1/me/clinics`
    },
    dashboard: {
        summary: () => `/api/v1/dashboard/summary`
    },
    clients: {
        list: () => `/api/v1/clients`,
        byId: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}`
    },
    pets: {
        list: () => `/api/v1/pets`,
        byId: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}`
    },
    species: {
        list: () => `/api/v1/species`,
        byId: (id: string) => `/api/v1/species/${encodeURIComponent(id)}`
    },
    breeds: {
        list: () => `/api/v1/breeds`,
        byId: (id: string) => `/api/v1/breeds/${encodeURIComponent(id)}`
    },
    appointments: {
        list: () => `/api/v1/appointments`,
        byId: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}`
    },
    examinations: {
        list: () => `/api/v1/examinations`,
        byId: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}`
    },
    vaccinations: {
        list: () => `/api/v1/vaccinations`,
        byId: (id: string) => `/api/v1/vaccinations/${encodeURIComponent(id)}`
    },
    payments: {
        list: () => `/api/v1/payments`,
        byId: (id: string) => `/api/v1/payments/${encodeURIComponent(id)}`
    }
} as const;
