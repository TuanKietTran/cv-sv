import { afterEach, describe, expect, it } from "vitest";
import { ref } from "vue";
import {
   createAuthDialogController,
   isAuthCallbackHash,
   isAuthFlowHash,
   needsAppUserRefresh,
   stripAuthCallbackState,
} from "../../app/utils/auth-dialog-state";

function fakeTimers() {
   let next = 0;
   const pending = new Map<number, { callback: () => void; ms: number }>();
   return {
      setTimer: (callback: () => void, ms: number) => {
         pending.set(++next, { callback, ms });
         return next;
      },
      clearTimer: (handle: unknown) => {
         pending.delete(handle as number);
      },
      fire(ms: number) {
         for (const [handle, timer] of [...pending]) {
            if (timer.ms !== ms) continue;
            pending.delete(handle);
            timer.callback();
         }
      },
      get count() {
         return pending.size;
      },
   };
}

function setup(initial: { open?: boolean; loaded?: boolean; signedIn?: boolean; hash?: string } = {}) {
   const open = ref(initial.open ?? true);
   const clerkLoaded = ref(initial.loaded ?? false);
   const signedIn = ref(initial.signedIn ?? false);
   const hash = ref(initial.hash ?? "");
   const timers = fakeTimers();
   const controller = createAuthDialogController({
      open,
      clerkLoaded,
      signedIn,
      hash,
      loadTimeoutMs: 1_000,
      callbackTimeoutMs: 2_000,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
   });
   disposers.push(controller.dispose);
   return { open, clerkLoaded, signedIn, hash, timers, controller };
}

const disposers: (() => void)[] = [];
afterEach(() => {
   disposers.splice(0).forEach(dispose => dispose());
});

describe("auth dialog derived state", () => {
   it("derives loading, signedOut and signedIn from auth state", () => {
      const { clerkLoaded, signedIn, controller } = setup();
      expect(controller.view.value).toBe("loading");

      clerkLoaded.value = true;
      expect(controller.view.value).toBe("signedOut");

      signedIn.value = true;
      expect(controller.view.value).toBe("signedIn");
   });

   it("swaps signedOut to signedIn on the same controller instance without a reload", () => {
      const { clerkLoaded, signedIn, controller } = setup({ loaded: true });
      const view = controller.view;
      expect(view.value).toBe("signedOut");

      signedIn.value = true;
      expect(controller.view).toBe(view);
      expect(view.value).toBe("signedIn");
      expect(clerkLoaded.value).toBe(true);
   });

   it("opens an already-authenticated user directly on the account view", () => {
      const { controller } = setup({ loaded: false, signedIn: true });
      expect(controller.view.value).toBe("signedIn");
   });

   it("returns to the signed-out view when the user signs out while open", () => {
      const { signedIn, controller } = setup({ loaded: true, signedIn: true });
      signedIn.value = false;
      expect(controller.view.value).toBe("signedOut");
   });

   it("times out when the auth service never loads", () => {
      const { timers, controller } = setup();
      timers.fire(1_000);
      expect(controller.view.value).toBe("error");
      expect(controller.errorKind.value).toBe("load-timeout");
   });

   it("does not start timers while the dialog is closed", () => {
      const { timers } = setup({ open: false, hash: "#/sso-callback" });
      expect(timers.count).toBe(0);
   });
});

describe("auth dialog OAuth callback", () => {
   it("stays loading during the callback even after the auth service loads", () => {
      const { clerkLoaded, controller } = setup({ hash: "#/sso-callback" });
      clerkLoaded.value = true;
      expect(controller.callbackPending.value).toBe(true);
      expect(controller.view.value).toBe("loading");
   });

   it("switches to signedIn when the callback creates a session", () => {
      const { clerkLoaded, signedIn, hash, timers, controller } = setup({ hash: "#/sso-callback" });
      clerkLoaded.value = true;
      signedIn.value = true;
      hash.value = "";
      expect(controller.view.value).toBe("signedIn");
      expect(controller.callbackPending.value).toBe(false);
      expect(timers.count).toBe(0);
   });

   it("keeps showing signedIn while user details load after the session exists", () => {
      const { clerkLoaded, signedIn, controller } = setup({ hash: "#/sso-callback" });
      signedIn.value = true;
      expect(controller.view.value).toBe("signedIn");
      clerkLoaded.value = true;
      expect(controller.view.value).toBe("signedIn");
   });

   it("reports a failure when the callback ends without a session (cancelled or rejected)", () => {
      const { clerkLoaded, hash, controller } = setup({ hash: "#/sso-callback" });
      clerkLoaded.value = true;
      hash.value = "#/";
      expect(controller.view.value).toBe("error");
      expect(controller.errorKind.value).toBe("callback-failed");

      controller.retry();
      expect(controller.view.value).toBe("signedOut");
   });

   it("shows the form when the callback continues to another step", () => {
      const { clerkLoaded, hash, controller } = setup({ hash: "#/sso-callback" });
      clerkLoaded.value = true;
      hash.value = "#/continue";
      expect(controller.view.value).toBe("signedOut");
      expect(controller.errorKind.value).toBeNull();
   });

   it("times out a callback that never completes, then recovers if a session appears", () => {
      const { clerkLoaded, signedIn, timers, controller } = setup({ hash: "#/sso-callback" });
      clerkLoaded.value = true;
      timers.fire(2_000);
      expect(controller.view.value).toBe("error");
      expect(controller.errorKind.value).toBe("callback-timeout");

      signedIn.value = true;
      expect(controller.view.value).toBe("signedIn");
   });

   it("picks up a callback hash that appears after mount", () => {
      const { clerkLoaded, hash, controller } = setup({ loaded: true });
      expect(controller.view.value).toBe("signedOut");
      hash.value = "#/sso-callback?foo=bar";
      expect(controller.view.value).toBe("loading");
      expect(clerkLoaded.value).toBe(true);
   });
});

describe("auth callback URL helpers", () => {
   it("recognises Clerk hash routes", () => {
      expect(isAuthCallbackHash("#/sso-callback")).toBe(true);
      expect(isAuthCallbackHash("#/sso-callback/")).toBe(true);
      expect(isAuthCallbackHash("#/sso-callbacks")).toBe(false);
      expect(isAuthCallbackHash("")).toBe(false);
      expect(isAuthFlowHash("#/factor-one")).toBe(true);
      expect(isAuthFlowHash("#/")).toBe(false);
      expect(isAuthFlowHash("#section")).toBe(false);
   });

   it("removes callback-only state and keeps app state", () => {
      expect(stripAuthCallbackState("/e/abc?tab=css&__clerk_status=verified#/sso-callback")).toBe("/e/abc?tab=css");
      expect(stripAuthCallbackState("/login?redirect=%2Fd#/")).toBe("/login?redirect=%2Fd");
      expect(stripAuthCallbackState("/about#faq")).toBe("/about#faq");
      expect(stripAuthCallbackState("/")).toBe("/");
   });
});

describe("app user sync with Clerk", () => {
   it("refreshes only when Clerk and the app user disagree", () => {
      expect(needsAppUserRefresh({ clerkLoaded: false, clerkSignedIn: true, appUserId: null })).toBe(false);
      expect(needsAppUserRefresh({ clerkLoaded: true, clerkSignedIn: true, appUserId: null })).toBe(true);
      expect(needsAppUserRefresh({ clerkLoaded: true, clerkSignedIn: true, appUserId: "clerk:user_1" })).toBe(false);
      expect(needsAppUserRefresh({ clerkLoaded: true, clerkSignedIn: false, appUserId: "clerk:user_1" })).toBe(true);
      // A legacy email/password session is not owned by Clerk and is left alone.
      expect(needsAppUserRefresh({ clerkLoaded: true, clerkSignedIn: false, appUserId: "legacy-uuid" })).toBe(false);
   });
});
