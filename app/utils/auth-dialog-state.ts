import { computed, effectScope, ref, watch, type Ref } from "vue";

/**
 * The account dialog renders exactly one of these bodies. They are derived
 * from Clerk's (and the legacy session's) auth state on every change, so a
 * session that appears after the dialog opened swaps the body in place.
 */
export type AuthDialogView = "loading" | "signedOut" | "signedIn" | "error";
export type AuthDialogErrorKind = "load-timeout" | "callback-timeout" | "callback-failed";

export const AUTH_LOAD_TIMEOUT_MS = 12_000;
export const AUTH_CALLBACK_TIMEOUT_MS = 20_000;

/** Clerk's hash-routed OAuth return path (`/#/sso-callback`). */
export function isAuthCallbackHash(hash: string): boolean {
    return /^#\/sso-callback(?:[/?]|$)/.test(hash);
}

/** Any Clerk hash route (`#/factor-one`, `#/continue`, …) owned by the auth components. */
export function isAuthFlowHash(hash: string): boolean {
    return hash.startsWith("#/") && hash.length > 2;
}

/** The hash Clerk returns to when a redirect flow ends without a session. */
function isAuthRootHash(hash: string): boolean {
    return hash === "" || hash === "#" || hash === "#/";
}

/**
 * Remove callback-only state from a same-origin URL: Clerk hash routes and
 * `__clerk_*` query parameters. Returns a path + query + hash string suitable
 * for `history.replaceState`.
 */
export function stripAuthCallbackState(url: string): string {
    const parsed = new URL(url, "http://local.invalid");
    for (const key of [...parsed.searchParams.keys()]) {
        if (key.startsWith("__clerk_")) parsed.searchParams.delete(key);
    }
    const hash = isAuthFlowHash(parsed.hash) || isAuthRootHash(parsed.hash) ? "" : parsed.hash;
    return `${parsed.pathname}${parsed.search}${hash}`;
}

/**
 * Decide whether the app-level user (from `/api/auth/me`) is out of date with
 * Clerk's session. Only reads identity — never triggers any CV upload.
 */
export function needsAppUserRefresh(input: {
    clerkLoaded: boolean;
    clerkSignedIn: boolean;
    appUserId: string | null;
}): boolean {
    if (!input.clerkLoaded) return false;
    if (input.clerkSignedIn) return !input.appUserId;
    return Boolean(input.appUserId?.startsWith("clerk:"));
}

export interface AuthDialogControllerOptions {
    open: Readonly<Ref<boolean>>;
    clerkLoaded: Readonly<Ref<boolean>>;
    signedIn: Readonly<Ref<boolean>>;
    hash: Readonly<Ref<string>>;
    loadTimeoutMs?: number;
    callbackTimeoutMs?: number;
    setTimer?: (callback: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}

export function createAuthDialogController(options: AuthDialogControllerOptions) {
    const setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    const clearTimer = options.clearTimer ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>));
    const scope = effectScope(true);

    const callbackPending = ref(isAuthCallbackHash(options.hash.value));
    const errorKind = ref<AuthDialogErrorKind | null>(null);
    let loadTimer: unknown;
    let callbackTimer: unknown;

    const stopLoadTimer = () => {
        if (loadTimer !== undefined) clearTimer(loadTimer);
        loadTimer = undefined;
    };
    const stopCallbackTimer = () => {
        if (callbackTimer !== undefined) clearTimer(callbackTimer);
        callbackTimer = undefined;
    };

    const view = computed<AuthDialogView>(() => {
        if (errorKind.value) return "error";
        if (options.signedIn.value) return "signedIn";
        if (!options.clerkLoaded.value || callbackPending.value) return "loading";
        return "signedOut";
    });

    scope.run(() => {
        watch(options.hash, (hash, previous) => {
            if (isAuthCallbackHash(hash)) {
                callbackPending.value = true;
                return;
            }
            if (!isAuthCallbackHash(previous) || !callbackPending.value) return;
            callbackPending.value = false;
            // Clerk returns to its root route when the provider round trip ends
            // without a session (cancelled consent, provider error). Other
            // routes (`#/continue`, `#/factor-two`) are a flow still in progress.
            if (!options.signedIn.value && isAuthRootHash(hash)) errorKind.value = "callback-failed";
        }, { flush: "sync" });

        watch(options.signedIn, (signedIn) => {
            if (!signedIn) return;
            callbackPending.value = false;
            errorKind.value = null;
        }, { flush: "sync", immediate: true });

        watch(
            () => options.open.value && !options.clerkLoaded.value && !options.signedIn.value && !errorKind.value,
            (waiting) => {
                stopLoadTimer();
                if (!waiting) return;
                loadTimer = setTimer(() => {
                    loadTimer = undefined;
                    errorKind.value = "load-timeout";
                }, options.loadTimeoutMs ?? AUTH_LOAD_TIMEOUT_MS);
            },
            { flush: "sync", immediate: true },
        );

        watch(
            () => options.open.value && callbackPending.value && !errorKind.value,
            (waiting) => {
                stopCallbackTimer();
                if (!waiting) return;
                callbackTimer = setTimer(() => {
                    callbackTimer = undefined;
                    callbackPending.value = false;
                    errorKind.value = "callback-timeout";
                }, options.callbackTimeoutMs ?? AUTH_CALLBACK_TIMEOUT_MS);
            },
            { flush: "sync", immediate: true },
        );
    });

    /** Leave the error state and show the sign-in form again. */
    const retry = () => {
        callbackPending.value = false;
        errorKind.value = null;
    };

    const dispose = () => {
        stopLoadTimer();
        stopCallbackTimer();
        scope.stop();
    };

    return { view, errorKind, callbackPending, retry, dispose };
}
