<script setup lang="ts">
useHead({ title: "sub — Login" });

const mode = ref<"login" | "signup">("login");
const email = ref("");
const password = ref("");
const name = ref("");
const loading = ref(false);
const error = ref("");

const toggle = () => {
    mode.value = mode.value === "login" ? "signup" : "login";
    error.value = "";
};

const submit = async () => {
    error.value = "";
    if (!email.value || !password.value) {
        error.value = "All fields are required.";
        return;
    }
    if (mode.value === "signup" && !name.value) {
        error.value = "All fields are required.";
        return;
    }
    loading.value = true;
    try {
        const { login, register } = useAuth();
        if (mode.value === "login") {
            await login(email.value, password.value);
        } else {
            await register(email.value, password.value);
        }
        await navigateTo("/d");
    } catch (err: any) {
        error.value =
            err?.data?.statusMessage ?? err?.message ?? "Something went wrong.";
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="page">
        <div class="card">
            <!-- Logo -->
            <div class="card-logo">
                <span class="logo-mark">◆</span>
            </div>

            <!-- Heading -->
            <div class="card-head">
                <h1 class="title">
                    {{ mode === "login" ? "Welcome back" : "Create account" }}
                </h1>
                <p class="subtitle">
                    {{
                        mode === "login"
                            ? "Sign in to manage your subscriptions."
                            : "Start managing your subscriptions today."
                    }}
                </p>
            </div>

            <!-- Form -->
            <form class="form" novalidate @submit.prevent="submit">
                <div v-if="mode === 'signup'" class="field">
                    <label for="name" class="label">Name</label>
                    <input
                        id="name"
                        v-model="name"
                        type="text"
                        class="input"
                        placeholder="Your name"
                        autocomplete="name"
                    />
                </div>

                <div class="field">
                    <label for="email" class="label">Email</label>
                    <input
                        id="email"
                        v-model="email"
                        type="email"
                        class="input"
                        placeholder="you@example.com"
                        autocomplete="email"
                    />
                </div>

                <div class="field">
                    <div class="label-row">
                        <label for="password" class="label">Password</label>
                        <a v-if="mode === 'login'" href="#" class="forgot"
                            >Forgot?</a
                        >
                    </div>
                    <input
                        id="password"
                        v-model="password"
                        type="password"
                        class="input"
                        placeholder="••••••••"
                        :autocomplete="
                            mode === 'login'
                                ? 'current-password'
                                : 'new-password'
                        "
                    />
                </div>

                <p v-if="error" role="alert" class="error">{{ error }}</p>

                <button type="submit" class="btn-submit" :disabled="loading">
                    <span v-if="loading" class="spinner" aria-hidden="true" />
                    <span>{{
                        loading
                            ? "Please wait…"
                            : mode === "login"
                              ? "Sign in"
                              : "Create account"
                    }}</span>
                </button>
            </form>

            <!-- Toggle -->
            <p class="toggle">
                {{
                    mode === "login"
                        ? "Don't have an account?"
                        : "Already have an account?"
                }}
                <button class="toggle-btn" type="button" @click="toggle">
                    {{ mode === "login" ? "Sign up" : "Sign in" }}
                </button>
            </p>
        </div>
    </div>
</template>

<style scoped>
.page {
    min-height: calc(100vh - 56px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
}

.card {
    width: 100%;
    max-width: 400px;
    background: var(--bg-mantle);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 40px 36px;
}

.card-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
}
.logo-mark {
    font-size: 28px;
    color: var(--accent);
}

.card-head {
    text-align: center;
    margin-bottom: 32px;
}

.title {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--fg-text);
    margin: 0 0 8px;
}
.subtitle {
    font-size: 14px;
    color: var(--fg-subtext0);
    margin: 0;
}

/* Form */
.form {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.label {
    font-size: 13px;
    font-weight: 500;
    color: var(--fg-subtext1);
}
.forgot {
    font-size: 12px;
    color: var(--accent);
}

.input {
    background: var(--bg-surface0);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--fg-text);
    padding: 10px 14px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    width: 100%;
}
.input::placeholder {
    color: var(--bg-overlay1);
}
.input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}

.error {
    font-size: 13px;
    color: var(--red);
    margin: 0;
    padding: 10px 12px;
    background: color-mix(in srgb, var(--red) 10%, transparent);
    border-radius: var(--radius-sm);
    border: 1px solid color-mix(in srgb, var(--red) 30%, transparent);
}

.btn-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 11px;
    background: var(--accent);
    color: var(--bg-crust);
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
        background 0.15s,
        opacity 0.15s;
    margin-top: 4px;
}
.btn-submit:hover:not(:disabled) {
    background: var(--accent-hover);
}
.btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.spinner {
    width: 14px;
    height: 14px;
    border: 2px solid color-mix(in srgb, var(--bg-crust) 30%, transparent);
    border-top-color: var(--bg-crust);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Toggle */
.toggle {
    text-align: center;
    font-size: 13px;
    color: var(--fg-subtext0);
    margin: 24px 0 0;
}
.toggle-btn {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
}
.toggle-btn:hover {
    color: var(--accent-hover);
}
</style>
