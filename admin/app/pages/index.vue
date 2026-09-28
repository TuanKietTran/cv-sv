<script setup lang="ts">
import type { MetricReport } from "~~/server/lib/analytics";

type Tab = "routes" | "cqrs" | "users" | "tasks";
interface AnalyticsResponse extends Record<Tab, MetricReport> { hours: number }

const hours = ref(24);
const tab = ref<Tab>("routes");
const { data, status, error, refresh } = await useFetch<AnalyticsResponse>("/api/analytics", { query: { hours } });

const tabs: Array<{ id: Tab; label: string; keyLabel: string; latency: boolean }> = [
   { id: "routes", label: "Routes", keyLabel: "Route", latency: true },
   { id: "users", label: "Users", keyLabel: "Owner id", latency: false },
   { id: "cqrs", label: "Queries & commands", keyLabel: "Request", latency: true },
   { id: "tasks", label: "Tasks", keyLabel: "Task", latency: true },
];
const activeTab = computed(() => tabs.find(item => item.id === tab.value)!);

const stats = computed(() => {
   const report = data.value;
   if (!report) return [];
   const total = (rows: MetricReport) => rows.summary.reduce((sum, row) => sum + row.count, 0);
   const errors = report.routes.summary.reduce((sum, row) => sum + row.errors, 0);
   const requests = total(report.routes);
   const totalMs = report.routes.summary.reduce((sum, row) => sum + row.totalMs, 0);
   const cqrsErrors = report.cqrs.summary.reduce((sum, row) => sum + row.errors, 0);
   return [
      { label: "Requests", value: String(requests), hint: `${report.routes.summary.length} route shapes` },
      { label: "5xx rate", value: requests ? formatPercent(errors / requests) : "—", hint: `${errors} server errors` },
      { label: "Avg latency", value: requests ? formatMs(totalMs / requests) : "—", hint: "across all routes" },
      { label: "Active users", value: String(report.users.summary.length), hint: "signed-in API callers" },
      { label: "CQRS requests", value: String(total(report.cqrs)), hint: `${cqrsErrors} failed` },
   ];
});
</script>

<template>
   <div class="page">
      <header class="page-header">
         <div>
            <h1>Analytics</h1>
            <p>Hourly aggregates written by ruxt. Samples are flushed about every 30 seconds.</p>
         </div>
         <div class="controls">
            <select v-model.number="hours" aria-label="Time window">
               <option :value="1">Last hour</option>
               <option :value="24">Last 24 hours</option>
               <option :value="168">Last 7 days</option>
               <option :value="720">Last 30 days</option>
            </select>
            <button class="btn" type="button" :disabled="status === 'pending'" @click="refresh()">Refresh</button>
         </div>
      </header>

      <p v-if="error" class="error" role="alert">{{ errorMessage(error, "Analytics could not be loaded.") }}</p>

      <template v-if="data">
         <section class="stats">
            <div v-for="stat in stats" :key="stat.label" class="card stat">
               <div class="label">{{ stat.label }}</div>
               <div class="value">{{ stat.value }}</div>
               <div class="hint">{{ stat.hint }}</div>
            </div>
         </section>

         <section class="card">
            <h2>Traffic</h2>
            <HourlyChart :points="data.routes.hourly" />
         </section>

         <section class="card">
            <div class="tabs" role="tablist">
               <button
                  v-for="item in tabs"
                  :key="item.id"
                  type="button"
                  role="tab"
                  :aria-selected="tab === item.id"
                  :class="{ active: tab === item.id }"
                  @click="tab = item.id"
               >
                  {{ item.label }} <span class="muted">{{ data[item.id].summary.length }}</span>
               </button>
            </div>
            <MetricTable
               :key="tab"
               class="tab-body"
               :rows="data[tab].summary"
               :key-label="activeTab.keyLabel"
               :show-latency="activeTab.latency"
            />
         </section>
      </template>
   </div>
</template>

<style scoped>
.controls { display: flex; gap: 8px; }
.tab-body { margin-top: 12px; }
</style>
