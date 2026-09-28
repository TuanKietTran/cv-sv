export type AuthDialogMode = "login" | "signup";

interface AuthDialogState {
    open: boolean;
    mode: AuthDialogMode;
    redirectTo: string | null;
}

// Survives the full-page OAuth provider round trip so the callback can reopen
// the same dialog and return to the pre-auth destination. Holds no tokens.
const STORAGE_KEY = "cv-sv:auth-dialog";

const persist = (state: AuthDialogState) => {
    if (!import.meta.client) return;
    try {
        if (state.open) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: state.mode, redirectTo: state.redirectTo }));
        else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Storage can be unavailable in private modes; the dialog still works.
    }
};

export function readPersistedAuthDialog(): Pick<AuthDialogState, "mode" | "redirectTo"> | null {
    if (!import.meta.client) return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<AuthDialogState>;
        return {
            mode: parsed.mode === "signup" ? "signup" : "login",
            redirectTo: safeAuthRedirect(parsed.redirectTo ?? null),
        };
    } catch {
        return null;
    }
}

export function useAuthDialog() {
    const route = useRoute();
    const state = useState<AuthDialogState>("auth:dialog", () => ({
        open: false,
        mode: "login",
        redirectTo: null,
    }));

    const openAuthDialog = (mode: AuthDialogMode = "login", redirectTo?: string | null) => {
        // Freeze the pre-auth destination now: Clerk navigates during the flow,
        // so reading the live route later would lose where the user started.
        const fallback = route.path === "/login" ? "/" : stripAuthCallbackState(route.fullPath);
        state.value = { open: true, mode, redirectTo: safeAuthRedirect(redirectTo) ?? safeAuthRedirect(fallback) };
        persist(state.value);
    };

    const closeAuthDialog = () => {
        state.value = { ...state.value, open: false };
        persist(state.value);
    };

    const setAuthMode = (mode: AuthDialogMode) => {
        state.value = { ...state.value, mode };
        persist(state.value);
    };

    return {
        authDialog: readonly(state),
        openAuthDialog,
        closeAuthDialog,
        setAuthMode,
    };
}
