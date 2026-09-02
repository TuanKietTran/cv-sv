<script setup lang="ts">
import type { UIPlan, PlansResponse } from "~/types/api";
import type { BillingPeriod, CurrencyCode } from "@core/domain";

useHead({ title: "sub — Plans" });

const route = useRoute();
const userId = computed(() => (route.query.userId as string) || "demo");

const { data, status, refresh } = await useFetch<PlansResponse>("/api/plans", {
    query: { all: "true" },
});

const plans = computed<UIPlan[]>(() => data.value?.plans ?? []);

const MINOR_UNITS: Record<CurrencyCode, number> = {
    USD: 100, EUR: 100, GBP: 100, AUD: 100,
    CAD: 100, SGD: 100, JPY: 1, VND: 1,
};

function formatMoney(amountMinor: number, currency: CurrencyCode): string {
    const units = MINOR_UNITS[currency] ?? 100;
    return `${(amountMinor / units).toFixed(units === 1 ? 0 : 2)} ${currency}`;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "all" | "mine";
const activeTab = ref<Tab>("all");

const myPlans = computed(() =>
    plans.value.filter((p) => p.source === "user" && p.createdBy === userId.value),
);

const tabPlans = computed(() =>
    activeTab.value === "mine" ? myPlans.value : plans.value,
);

// ── Filters ───────────────────────────────────────────────────────────────────
const search = ref("");
const filterCycle = ref<BillingPeriod | "">("");
const filterProvider = ref("");

const providers = computed(() => {
    const set = new Set(tabPlans.value.map((p) => p.provider).filter(Boolean));
    return [...set].sort();
});

const filteredPlans = computed(() => {
    const q = search.value.toLowerCase();
    return tabPlans.value.filter((p) => {
        const matchesSearch =
            !q ||
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.provider.toLowerCase().includes(q);
        const matchesCycle = !filterCycle.value || p.billingCycle === filterCycle.value;
        const matchesProvider = !filterProvider.value || p.provider === filterProvider.value;
        return matchesSearch && matchesCycle && matchesProvider;
    });
});

const loading = computed(() => status.value === "pending");

// ── Delete user plan ──────────────────────────────────────────────────────────
const deletingId = ref<string | null>(null);

async function deletePlan(plan: UIPlan) {
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    deletingId.value = plan.id;
    try {
        await $fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
        await refresh();
    } catch (e: any) {
        alert(e?.data?.message ?? "Failed to delete plan.");
    } finally {
        deletingId.value = null;
    }
}
</script>

<template>
    <div class="page">
        <div class="page-header">
            <div>
                <h1 class="page-title">Plans</h1>
                <p class="page-sub">{{ plans.length }} plans in catalog · {{ myPlans.length }} yours</p>
            </div>
        </div>

        <div class="tabs">
            <button
                class="tab"
                :class="{ active: activeTab === 'all' }"
                type="button"
                @click="activeTab = 'all'"
            >All plans</button>
            <button
                class="tab"
                :class="{ active: activeTab === 'mine' }"
                type="button"
                @click="activeTab = 'mine'"
            >My plans <span v-if="myPlans.length" class="tab-count">{{ myPlans.length }}</span></button>
        </div>

        <div v-if="loading" class="loading">Loading…</div>

        <template v-else>
            <div class="filters">
                <input
                    v-model="search"
                    type="search"
                    class="search"
                    placeholder="Search plans…"
                    aria-label="Search plans"
                />
                <select v-model="filterProvider" class="filter-select" aria-label="Filter by provider">
                    <option value="">All providers</option>
                    <option v-for="prov in providers" :key="prov" :value="prov">{{ prov }}</option>
                </select>
                <select v-model="filterCycle" class="filter-select" aria-label="Filter by billing cycle">
                    <option value="">All cycles</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="biannual">Biannual</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>

            <div v-if="filteredPlans.length === 0" class="empty">No plans found.</div>

            <div v-else class="plan-grid">
                <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card">
                    <div class="plan-card-header">
                        <div class="plan-meta">
                            <span v-if="plan.provider" class="plan-provider">{{ plan.provider }}</span>
                            <h3 class="plan-name">{{ plan.name }}</h3>
                        </div>
                        <span class="plan-cycle">{{ plan.billingCycle }}</span>
                    </div>

                    <p v-if="plan.description" class="plan-desc">{{ plan.description }}</p>

                    <div class="plan-price">
                        {{ formatMoney(plan.price.amountMinor, plan.price.currency) }}
                        <span class="plan-price-cycle">/ {{ plan.billingCycle }}</span>
                    </div>

                    <div v-if="plan.trialDays" class="plan-trial">
                        {{ plan.trialDays }}-day free trial
                    </div>

                    <ul v-if="plan.features.length" class="plan-features">
                        <li v-for="feat in plan.features" :key="feat" class="plan-feature">
                            <span class="feat-check" aria-hidden="true">✓</span>
                            {{ feat }}
                        </li>
                    </ul>

                    <div class="plan-badge-row">
                        <span v-if="!plan.isPublic" class="badge-private">Private</span>
                        <span v-if="plan.source === 'user'" class="badge-user">My plan</span>
                        <button
                            v-if="plan.source === 'user' && plan.createdBy === userId"
                            class="btn-delete-plan"
                            type="button"
                            :disabled="deletingId === plan.id"
                            @click="deletePlan(plan)"
                        >{{ deletingId === plan.id ? "Deleting…" : "Delete" }}</button>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<style scoped>
.page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 24px;
}

.page-header {
    margin-bottom: 24px;
}
.page-title {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--fg-text);
    margin: 0 0 4px;
}
.page-sub {
    font-size: 14px;
    color: var(--fg-subtext0);
    margin: 0;
}

.loading {
    color: var(--fg-subtext0);
    font-size: 14px;
    padding: 40px 0;
    text-align: center;
}

.empty {
    color: var(--fg-subtext0);
    font-size: 14px;
    padding: 40px;
    text-align: center;
    background: var(--bg-mantle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
}

.filters {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.search {
    background: var(--bg-surface0);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--fg-text);
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    flex: 1;
    min-width: 160px;
    transition: border-color 0.15s;
}
.search::placeholder { color: var(--bg-overlay1); }
.search:focus { border-color: var(--accent); }

.filter-select {
    background: var(--bg-surface0);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--fg-text);
    padding: 8px 12px;
    font-size: 13px;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
}
.filter-select:focus { border-color: var(--accent); }

.plan-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
}

.plan-card {
    background: var(--bg-mantle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: border-color 0.15s;
}
.plan-card:hover { border-color: var(--border-strong); }

.plan-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
}
.plan-meta { display: flex; flex-direction: column; gap: 2px; }

.plan-provider {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--accent);
}

.plan-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--fg-text);
    margin: 0;
}

.plan-cycle {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fg-subtext0);
    background: var(--bg-surface0);
    padding: 3px 8px;
    border-radius: var(--radius-full);
    white-space: nowrap;
}

.plan-desc {
    font-size: 13px;
    color: var(--fg-subtext0);
    margin: 0;
    line-height: 1.5;
}

.plan-price {
    font-size: 22px;
    font-weight: 700;
    color: var(--fg-text);
    font-variant-numeric: tabular-nums;
}
.plan-price-cycle {
    font-size: 13px;
    font-weight: 400;
    color: var(--fg-subtext0);
}

.plan-trial {
    font-size: 12px;
    color: var(--green);
    font-weight: 500;
}

.plan-features {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.plan-feature {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--fg-subtext1);
}

.feat-check {
    color: var(--green);
    font-size: 12px;
    flex-shrink: 0;
}

.plan-badge-row {
    display: flex;
    gap: 6px;
    margin-top: auto;
}

.badge-private {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    border: 1px solid var(--yellow);
    color: var(--yellow);
    background: color-mix(in srgb, var(--yellow) 10%, transparent);
}
.badge-user {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    border: 1px solid var(--teal);
    color: var(--teal);
    background: color-mix(in srgb, var(--teal) 10%, transparent);
}

.tabs {
    display: flex;
    gap: 2px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
}
.tab {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--fg-subtext0);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.tab:hover { color: var(--fg-text); }
.tab.active { color: var(--fg-text); border-bottom-color: var(--accent); }
.tab-count {
    font-size: 11px;
    font-weight: 700;
    background: var(--accent);
    color: var(--bg-crust);
    padding: 1px 6px;
    border-radius: var(--radius-full);
}

.btn-delete-plan {
    margin-left: auto;
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid var(--red);
    background: transparent;
    color: var(--red);
    cursor: pointer;
    transition: all 0.15s;
}
.btn-delete-plan:hover:not(:disabled) { background: var(--red); color: var(--bg-crust); }
.btn-delete-plan:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
