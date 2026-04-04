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
        byId: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}`,
        recentSummary: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}/recent-summary`
    },
    pets: {
        list: () => `/api/v1/pets`,
        byId: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}`,
        historySummary: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}/history-summary`
    },
    species: {
        list: () => `/api/v1/species`,
        byId: (id: string) => `/api/v1/species/${encodeURIComponent(id)}`
    },
    breeds: {
        list: () => `/api/v1/breeds`,
        byId: (id: string) => `/api/v1/breeds/${encodeURIComponent(id)}`
    },
    /** Ref-data — PetColors; path Swagger ile teyit edilmeli. */
    petColors: {
        list: () => `/api/v1/pet-colors`
    },
    appointments: {
        list: () => `/api/v1/appointments`,
        byId: (id: string) => `/api/v1/appointments/${encodeURIComponent(id)}`
    },
    examinations: {
        list: () => `/api/v1/examinations`,
        byId: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}`,
        relatedSummary: (id: string) => `/api/v1/examinations/${encodeURIComponent(id)}/related-summary`
    },
    vaccinations: {
        list: () => `/api/v1/vaccinations`,
        byId: (id: string) => `/api/v1/vaccinations/${encodeURIComponent(id)}`
    },
    payments: {
        list: () => `/api/v1/payments`,
        byId: (id: string) => `/api/v1/payments/${encodeURIComponent(id)}`
    },
    treatments: {
        list: () => `/api/v1/treatments`,
        byId: (id: string) => `/api/v1/treatments/${encodeURIComponent(id)}`
    },
    prescriptions: {
        list: () => `/api/v1/prescriptions`,
        byId: (id: string) => `/api/v1/prescriptions/${encodeURIComponent(id)}`
    },
    labResults: {
        list: () => `/api/v1/lab-results`,
        byId: (id: string) => `/api/v1/lab-results/${encodeURIComponent(id)}`
    },
    hospitalizations: {
        list: () => `/api/v1/hospitalizations`,
        byId: (id: string) => `/api/v1/hospitalizations/${encodeURIComponent(id)}`,
        discharge: (id: string) => `/api/v1/hospitalizations/${encodeURIComponent(id)}/discharge`
    }
} as const;
