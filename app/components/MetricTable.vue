<script setup lang="ts">
import type { MetricSummary } from "@core/analytics/metrics";

const props = withDefaults(defineProps<{
   rows: MetricSummary[];
   keyLabel: string;
   showLatency?: boolean;
}>(), { showLatency: true });

const filter = ref("");
const visible = computed(() => {
   const q = filter.value.toLowerCase();
   return props.rows.filter(row => !q || row.key.toLowerCase().includes(q));
});
const topStatuses = (statuses: Record<string, number>) =>
   Object.entries(statuses).sort((left, right) => right[1] - left[1]).slice(0, 4);
</script>

<template>
   <div class="metric-table">
      <input v-model="filter" type="search" :placeholder="`Filter ${keyLabel.toLowerCase()}…`" :aria-label="`Filter ${keyLabel}`">
      <table v-if="visible.length">
         <thead>
            <tr>
               <th>{{ keyLabel }}</th>
               <th class="num">Count</th>
               <th class="num">Errors</th>
               <template v-if="showLatency">
                  <th class="num">Avg</th>
                  <th class="num">Max</th>
               </template>
               <th>Statuses</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="row in visible" :key="row.key">
               <td><code>{{ row.key }}</code></td>
               <td class="num">{{ row.count }}</td>
               <td class="num" :class="{ error: row.errors }">{{ row.errors }} <span class="muted">({{ formatPercent(row.errorRate) }})</span></td>
               <template v-if="showLatency">
                  <td class="num">{{ formatMs(row.avgMs) }}</td>
                  <td class="num">{{ formatMs(row.maxMs) }}</td>
               </template>
               <td>
                  <span v-for="[status, count] in topStatuses(row.statuses)" :key="status" class="badge" :class="{ red: status >= '500', yellow: status >= '400' && status < '500' }">
                     {{ status }} × {{ count }}
                  </span>
               </td>
            </tr>
         </tbody>
      </table>
      <p v-else class="empty">No data in this window.</p>
   </div>
</template>

<style scoped>
.metric-table { display: grid; gap: 10px; }
.metric-table input { max-width: 280px; }
.badge { margin-right: 4px; }
</style>
