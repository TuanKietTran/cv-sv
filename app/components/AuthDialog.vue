<script setup lang="ts">
import {
    createAuthDialogController,
    isAuthCallbackHash,
    isAuthFlowHash,
    needsAppUserRefresh,
    stripAuthCallbackState,
} from "~/utils/auth-dialog-state";

type AccountTab = "account" | "cloud" | "security";

const route = useRoute();
const { authDialog, openAuthDialog, closeAuthDialog, setAuthMode } = useAuthDialog();
const { user: appUser, fetchMe, logout } = useAppAuth();
const { isSignedIn: clerkSignedIn } = useAuth();
const { user: clerkUser } = useUser();
const clerk = useClerk();
// Same signal as <ClerkLoaded>. `useAuth().isLoaded` can be true from SSR
// initial state even when clerk-js never loads in the browser.
const clerkLoaded = computed(() => Boolean(clerk.value?.loaded));

const dialogElement = ref<HTMLElement | null>(null);
const continueButton = ref<HTMLButtonElement | null>(null);
const tabButtons = ref<HTMLButtonElement[]>([]);
const mounted = ref(false);
const hash = ref("");
const announcement = ref("");
const activeTab = ref<AccountTab>("account");
const signingOut = ref(false);
const signOutError = ref("");
let previousFocus: HTMLElement | null = null;
let previousOverflow = "";

const signedIn = computed(() => Boolean(clerkSignedIn.value) || Boolean(appUser.value));
const controller = createAuthDialogController({
    // Timers only run in the browser, never during SSR.
    open: computed(() => mounted.value && authDialog.value.open),
    clerkLoaded,
    signedIn,
    hash,
});
const { view, errorKind, callbackPending } = controller;

const isSignup = computed(() => authDialog.value.mode === "signup");
const destination = computed(() => authDialog.value.redirectTo ?? "/");
const title = computed(() => isSignup.value ? "Create your account" : "Welcome back");
const errorMessage = computed(() => {
    switch (errorKind.value) {
        case "load-timeout": return "The sign-in service failed to load. Check your connection and try again.";
        case "callback-timeout": return "Signing in is taking too long. The provider may not have completed the request.";
        case "callback-failed": return "Sign-in was cancelled or could not be completed. No changes were made.";
        default: return "";
    }
});

const displayName = computed(() => clerkUser.value?.fullName || clerkUser.value?.username || "");
const displayEmail = computed(() => clerkUser.value?.primaryEmailAddress?.emailAddress || appUser.value?.email || "");
const avatarUrl = computed(() => clerkUser.value?.imageUrl || "");
const avatarInitial = computed(() => (displayName.value || displayEmail.value || "?").charAt(0).toUpperCase());
const canManageAccount = computed(() => Boolean(clerkSignedIn.value));

const tabs: { id: AccountTab; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "cloud", label: "Cloud data" },
    { id: "security", label: "Security" },
];

const clerkAppearance = {
    layout: { socialButtonsPlacement: "top" as const },
    elements: {
        rootBox: { width: "100%" },
        cardBox: { width: "100%", boxShadow: "none" },
        card: { width: "100%", boxShadow: "none", background: "transparent", padding: "0" },
        header: { display: "none" },
        footer: { display: "none" },
    },
};

const syncHash = () => {
    hash.value = window.location.hash;
};

const replaceUrlWithoutCallbackState = () => {
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const clean = stripAuthCallbackState(current);
    if (clean !== current) window.history.replaceState(window.history.state, "", clean);
    syncHash();
};

const restoreFocus = async () => {
    await nextTick();
    const target = previousFocus?.isConnected
        ? previousFocus
        : document.querySelector<HTMLElement>("[data-account-trigger]");
    target?.focus();
    previousFocus = null;
};

// Keep the app-level user (account control, route guard) in step with Clerk.
// This only reads `/api/auth/me`; signing in never uploads the local CV.
let refreshingUser = false;
watch(
    () => [clerkLoaded.value, clerkSignedIn.value, appUser.value?.id] as const,
    async ([loaded, isSignedIn, appUserId]) => {
        if (!import.meta.client || refreshingUser) return;
        if (!needsAppUserRefresh({ clerkLoaded: loaded, clerkSignedIn: Boolean(isSignedIn), appUserId: appUserId ?? null })) return;
        refreshingUser = true;
        try {
            await fetchMe();
        } finally {
            refreshingUser = false;
        }
    },
);

watch(() => authDialog.value.open, async (open) => {
    if (!import.meta.client) return;
    if (open) {
        previousFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
            ? document.activeElement
            : null;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        activeTab.value = "account";
        await nextTick();
        if (view.value === "signedIn") continueButton.value?.focus();
        else dialogElement.value?.focus();
        return;
    }

    document.body.style.overflow = previousOverflow;
    signOutError.value = "";
    await restoreFocus();
}, { immediate: true });

// Swap the body in place when auth state changes, then move focus and
// announce the change for assistive technology.
watch(view, async (next, previous) => {
    if (!import.meta.client || !authDialog.value.open) return;
    if (next === "signedIn") {
        activeTab.value = "account";
        announcement.value = `Signed in${displayEmail.value ? ` as ${displayEmail.value}` : ""}.`;
        if (isAuthFlowHash(window.location.hash)) replaceUrlWithoutCallbackState();
    } else if (next === "signedOut" && previous === "signedIn") {
        announcement.value = "Signed out.";
    }
    await nextTick();
    if (next === "signedIn") continueButton.value?.focus();
    else if (next === "error") dialogElement.value?.querySelector<HTMLElement>(".auth-error button")?.focus();
    else if (previous === "signedIn" || previous === "error") dialogElement.value?.focus();
});

watch(() => route.fullPath, () => {
    if (import.meta.client) syncHash();
});

/** Close and return to the destination captured before authentication. */
const finish = async () => {
    const target = destination.value;
    closeAuthDialog();
    replaceUrlWithoutCallbackState();
    if (stripAuthCallbackState(route.fullPath) !== target) {
        await navigateTo(target, { replace: route.path === "/login" });
    }
};

const close = async () => {
    if (view.value === "signedIn") return finish();
    closeAuthDialog();
    if (callbackPending.value || errorKind.value) {
        controller.retry();
        replaceUrlWithoutCallbackState();
    }
    if (route.path === "/login") await navigateTo("/");
};

const retry = () => {
    if (errorKind.value === "load-timeout") {
        window.location.reload();
        return;
    }
    controller.retry();
    replaceUrlWithoutCallbackState();
};

const manageAccount = async () => {
    closeAuthDialog();
    await nextTick();
    clerk.value?.openUserProfile();
};

const openCloudData = async () => {
    closeAuthDialog();
    replaceUrlWithoutCallbackState();
    await navigateTo("/settings/cloud-data");
};

const signOut = async () => {
    if (signingOut.value) return;
    signingOut.value = true;
    signOutError.value = "";
    try {
        await logout({ redirectUrl: stripAuthCallbackState(route.fullPath) });
    } catch {
        signOutError.value = "Could not sign out. Please try again.";
    } finally {
        signingOut.value = false;
    }
};

const onTabKeydown = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next = {
        ArrowDown: index === last ? 0 : index + 1,
        ArrowRight: index === last ? 0 : index + 1,
        ArrowUp: index === 0 ? last : index - 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activeTab.value = tabs[next]!.id;
    tabButtons.value[next]?.focus();
};

const handleKeydown = (event: KeyboardEvent) => {
    if (!authDialog.value.open) return;
    if (event.key === "Escape") {
        void close();
        return;
    }
    if (event.key !== "Tab" || !dialogElement.value) return;

    const focusable = [...dialogElement.value.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input:not(:disabled), [href], [tabindex]",
    )].filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogElement.value)) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
};

onMounted(() => {
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    mounted.value = true;
    syncHash();

    // Returning from the OAuth provider is a full page load: reopen the same
    // dialog so the auth component can finish the callback in place.
    const persisted = readPersistedAuthDialog();
    if (!authDialog.value.open && (isAuthCallbackHash(hash.value) || (persisted && isAuthFlowHash(hash.value)))) {
        openAuthDialog(persisted?.mode ?? "login", persisted?.redirectTo);
    }
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("hashchange", syncHash);
    window.removeEventListener("popstate", syncHash);
    controller.dispose();
    document.body.style.overflow = previousOverflow;
});
</script>

<template>
    <div
        v-if="authDialog.open"
        class="auth-backdrop"
        role="presentation"
        @mousedown.self="close"
    >
        <section
            ref="dialogElement"
            class="auth-dialog"
            :class="{ 'auth-dialog--settings': view === 'signedIn' }"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            :aria-busy="view === 'loading'"
            :data-auth-view="view"
            tabindex="-1"
        >
            <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

            <template v-if="view === 'signedIn'">
                <header class="dialog-header">
                    <div class="settings-title">
                        <span class="brand-mark" aria-hidden="true">◆</span>
                        <h1 id="auth-title">Account settings</h1>
                    </div>
                    <button class="close-button" type="button" aria-label="Close" @click="close">×</button>
                </header>

                <div class="settings-layout">
                    <div class="settings-rail">
                        <div class="settings-tabs" role="tablist" aria-label="Account settings" aria-orientation="vertical">
                            <button
                                v-for="(tab, index) in tabs"
                                :id="`account-tab-${tab.id}`"
                                :key="tab.id"
                                ref="tabButtons"
                                type="button"
                                role="tab"
                                :aria-selected="activeTab === tab.id"
                                :aria-controls="`account-panel-${tab.id}`"
                                :tabindex="activeTab === tab.id ? 0 : -1"
                                :class="{ active: activeTab === tab.id }"
                                @click="activeTab = tab.id"
                                @keydown="onTabKeydown($event, index)"
                            >{{ tab.label }}</button>
                        </div>
                        <button
                            class="sign-out-button"
                            type="button"
                            :disabled="signingOut"
                            :aria-busy="signingOut"
                            @click="signOut"
                        >{{ signingOut ? "Signing out…" : "Sign out" }}</button>
                    </div>

                    <div
                        v-show="activeTab === 'account'"
                        id="account-panel-account"
                        class="settings-panel"
                        role="tabpanel"
                        aria-labelledby="account-tab-account"
                    >
                        <p class="status-line"><span class="status-icon" aria-hidden="true">✓</span> Signed in</p>
                        <div class="profile">
                            <img v-if="avatarUrl" class="avatar" :src="avatarUrl" alt="" referrerpolicy="no-referrer">
                            <span v-else class="avatar avatar--fallback" aria-hidden="true">{{ avatarInitial }}</span>
                            <div class="profile-text">
                                <h2>{{ displayName || displayEmail || "Your account" }}</h2>
                                <p v-if="displayName && displayEmail">{{ displayEmail }}</p>
                                <p v-else-if="!displayEmail" class="muted">Loading account details…</p>
                            </div>
                        </div>
                        <p class="panel-copy">You're signed in. Your CV stays in this browser unless you enable a cloud feature.</p>
                        <div class="panel-actions">
                            <button ref="continueButton" class="primary-button" type="button" @click="finish">Continue</button>
                        </div>
                    </div>

                    <div
                        v-show="activeTab === 'cloud'"
                        id="account-panel-cloud"
                        class="settings-panel"
                        role="tabpanel"
                        aria-labelledby="account-tab-cloud"
                    >
                        <h2>Cloud data</h2>
                        <p class="panel-copy">
                            Signing in does not upload your CV. Cloud session recovery and cloud templates stay off
                            until you allow them.
                        </p>
                        <div class="panel-actions">
                            <button class="secondary-button" type="button" @click="openCloudData">Open cloud data settings</button>
                        </div>
                    </div>

                    <div
                        v-show="activeTab === 'security'"
                        id="account-panel-security"
                        class="settings-panel"
                        role="tabpanel"
                        aria-labelledby="account-tab-security"
                    >
                        <h2>Security</h2>
                        <template v-if="canManageAccount">
                            <p class="panel-copy">Manage your profile, connected GitHub or Google accounts, and active sessions.</p>
                            <div class="panel-actions">
                                <button class="secondary-button" type="button" @click="manageAccount">Manage account</button>
                            </div>
                        </template>
                        <p v-else class="panel-copy">This account signs in with an email and password.</p>
                    </div>
                </div>
                <p v-if="signOutError" class="inline-error" role="alert">{{ signOutError }}</p>
            </template>

            <template v-else>
                <header class="dialog-header">
                    <div class="brand-mark" aria-hidden="true">◆</div>
                    <button class="close-button" type="button" aria-label="Close" @click="close">×</button>
                </header>

                <div class="mode-tabs" role="tablist" aria-label="Account access">
                    <button
                        type="button"
                        role="tab"
                        :aria-selected="!isSignup"
                        :class="{ active: !isSignup }"
                        :disabled="view !== 'signedOut'"
                        @click="setAuthMode('login')"
                    >Sign in</button>
                    <button
                        type="button"
                        role="tab"
                        :aria-selected="isSignup"
                        :class="{ active: isSignup }"
                        :disabled="view !== 'signedOut'"
                        @click="setAuthMode('signup')"
                    >Create account</button>
                </div>

                <div class="dialog-copy">
                    <h1 id="auth-title">{{ title }}</h1>
                    <p>
                        {{ isSignup
                            ? "Create an account to access optional cloud features and continue across devices."
                            : "Sign in without leaving your current CV workflow." }}
                    </p>
                </div>

                <div v-if="view === 'error'" class="auth-error" role="alert">
                    <p>{{ errorMessage }}</p>
                    <div class="panel-actions">
                        <button class="primary-button" type="button" @click="retry">Try again</button>
                        <button class="secondary-button" type="button" @click="close">Close</button>
                    </div>
                </div>
                <div v-else-if="view === 'loading'" class="clerk-loading" role="status">
                    {{ callbackPending ? "Completing sign-in…" : "Loading secure sign-in…" }}
                </div>

                <!-- Stays mounted (hidden) while a provider callback is processed. -->
                <ClerkLoaded>
                    <div v-if="view === 'signedOut' || callbackPending" v-show="view === 'signedOut'">
                        <SignUp
                            v-if="isSignup"
                            routing="hash"
                            :force-redirect-url="destination"
                            sign-in-url="/login"
                            :appearance="clerkAppearance"
                        />
                        <SignIn
                            v-else
                            routing="hash"
                            :force-redirect-url="destination"
                            sign-up-url="/login?mode=signup"
                            :appearance="clerkAppearance"
                        />
                    </div>
                </ClerkLoaded>

                <p class="privacy-note">
                    Your CV remains local unless you separately enable a cloud feature. Signing in does not upload it.
                </p>
            </template>
        </section>
    </div>
</template>

<style scoped>
/* Only theme tokens: no per-theme colours, tints or shadows on controls.
   Dividers use --border-strong because --border equals --bg-surface0 in
   some themes and disappears against the dialog background. */
.auth-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    padding: 20px;
    background: color-mix(in srgb, var(--bg-crust) 78%, transparent);
    backdrop-filter: blur(7px);
}
.auth-dialog {
    width: min(430px, 100%);
    max-height: min(760px, calc(100vh - 32px));
    overflow: auto;
    padding: 24px;
    outline: 0;
    color: var(--fg-text);
    background: var(--bg-mantle);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
}
.auth-dialog--settings { width: min(720px, 100%); }
.dialog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.brand-mark { color: var(--accent); font-size: 21px; }
.close-button {
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: var(--radius-sm);
    color: var(--fg-subtext0);
    background: transparent;
    font-size: 23px;
    line-height: 1;
    cursor: pointer;
}
.close-button:hover { color: var(--fg-text); background: var(--bg-surface0); }

/* Tabs: one shared look for the sign-in switch and the settings rail. */
.mode-tabs, .settings-tabs { display: flex; gap: 4px; }
.mode-tabs { padding-bottom: 12px; border-bottom: 1px solid var(--border-strong); }
.settings-tabs { flex-direction: column; }
.mode-tabs button, .settings-tabs button {
    padding: 8px 12px;
    border: 0;
    border-radius: var(--radius-sm);
    color: var(--fg-subtext0);
    background: transparent;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
}
.mode-tabs button:hover:not(:disabled), .settings-tabs button:hover { color: var(--fg-text); background: var(--bg-surface0); }
.mode-tabs button.active, .settings-tabs button.active { color: var(--fg-text); background: var(--bg-surface1); font-weight: 600; }
.mode-tabs button:disabled { cursor: default; }

.dialog-copy { margin: 20px 0 18px; }
.dialog-copy h1 { margin: 0 0 8px; font-size: 22px; }
.dialog-copy p, .privacy-note { margin: 0; color: var(--fg-subtext0); font-size: 14px; line-height: 1.55; }
.clerk-loading { padding: 28px 0; color: var(--fg-subtext0); text-align: center; }
.auth-error { display: grid; gap: 14px; justify-items: center; padding: 24px 0; text-align: center; }
.auth-error p { margin: 0; color: var(--fg-subtext1); line-height: 1.5; }
.privacy-note { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--border-strong); font-size: 12px; }

.settings-title { display: flex; align-items: center; gap: 10px; }
.settings-title h1 { margin: 0; font-size: 18px; }
.settings-layout { display: grid; grid-template-columns: 180px 1fr; gap: 24px; min-height: 300px; }
.settings-rail { display: flex; flex-direction: column; justify-content: space-between; gap: 12px; padding-right: 16px; border-right: 1px solid var(--border-strong); }
.settings-panel { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.settings-panel h2 { margin: 0; font-size: 18px; }
.status-line { margin: 0; color: var(--fg-subtext1); font-size: 14px; font-weight: 600; }
.status-icon { color: var(--green); }
.profile { display: flex; align-items: center; gap: 14px; min-width: 0; }
.avatar { width: 48px; height: 48px; flex: none; border-radius: 50%; object-fit: cover; }
.avatar--fallback { display: grid; place-items: center; color: var(--fg-text); background: var(--bg-surface1); font-size: 20px; font-weight: 600; }
.profile-text { min-width: 0; }
.profile-text h2, .profile-text p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-text p { margin: 4px 0 0; color: var(--fg-subtext0); font-size: 14px; }
.panel-copy { margin: 0; color: var(--fg-subtext0); font-size: 14px; line-height: 1.55; }
.panel-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: auto; }

/* Buttons follow the app's .btn-primary / .btn-secondary conventions. */
.primary-button, .secondary-button, .sign-out-button {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}
.primary-button { border: 1px solid var(--accent); color: var(--bg-crust); background: var(--accent); }
.primary-button:hover { border-color: var(--accent-hover); background: var(--accent-hover); }
.secondary-button, .sign-out-button { border: 1px solid var(--border-strong); color: var(--fg-subtext1); background: transparent; }
.secondary-button:hover, .sign-out-button:hover:not(:disabled) { color: var(--fg-text); background: var(--bg-surface0); }
.sign-out-button { padding: 8px 12px; color: var(--red); text-align: left; }
.sign-out-button:hover:not(:disabled) { color: var(--red); }
.sign-out-button:disabled { cursor: progress; opacity: .7; }
.inline-error { margin: 14px 0 0; color: var(--red); font-size: 13px; }
.muted { color: var(--fg-subtext0); }

@media (max-width: 600px) {
    .settings-layout { grid-template-columns: 1fr; gap: 18px; min-height: 0; }
    .settings-rail { flex-direction: row; flex-wrap: wrap; align-items: center; padding: 0 0 12px; border-right: 0; border-bottom: 1px solid var(--border-strong); }
    .settings-tabs { flex-direction: row; flex-wrap: wrap; }
    .settings-tabs button { padding: 8px 10px; white-space: nowrap; }
    .sign-out-button { margin-left: auto; white-space: nowrap; }
}
@media (max-width: 480px) {
    .auth-backdrop { align-items: end; padding: 0; }
    .auth-dialog { width: 100%; max-height: 92vh; border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 22px 20px calc(22px + env(safe-area-inset-bottom)); }
}
</style>
