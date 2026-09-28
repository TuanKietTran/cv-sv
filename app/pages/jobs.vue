<script setup lang="ts">
import type { JobReport } from "~~/server/lib/analytics";

const { data, status, error, refresh } = await useFetch<JobReport>("/api/jobs");
const stateFilter = ref("");
const rows = computed(() => (data.value?.recent ?? []).filter(job => !stateFilter.value || job.state === stateFilter.value));
const stateClass: Record<string, string> = {
   succeeded: "green", failed: "red", cancelled: "yellow", running: "blue", queued: "",
};
</script>

<template>
   <div class="page">
      <header class="page-header">
         <div>
            <h1>CV import jobs</h1>
            <p>Live snapshot of the durable import queue in ruxt's pipeline storage.</p>
         </div>
         <button class="btn" type="button" :disabled="status === 'pending'" @click="refresh()">Refresh</button>
      </header>

      <p v-if="error" class="error" role="alert">{{ errorMessage(error, "Jobs could not be loaded.") }}</p>

      <template v-if="data">
         <section class="stats">
            <div class="card stat">
               <div class="label">Total jobs</div>
               <div class="value">{{ data.total }}</div>
               <div class="hint">avg run {{ formatMs(data.avgDurationMs) }}</div>
            </div>
            <button
               v-for="(count, state) in data.byState"
               :key="state"
               type="button"
               class="card stat filter"
               :aria-pressed="stateFilter === state"
               :class="{ selected: stateFilter === state }"
               @click="stateFilter = stateFilter === state ? '' : String(state)"
            >
               <div class="label">{{ state }}</div>
               <div class="value">{{ count }}</div>
               <div class="hint">{{ formatPercent(count / data.total) }}</div>
            </button>
         </section>

         <section v-if="Object.keys(data.byErrorCode).length" class="card">
            <h2>Failure reasons</h2>
            <span v-for="(count, code) in data.byErrorCode" :key="code" class="badge red">{{ code }} × {{ count }}</span>
         </section>

         <section class="card">
            <h2>Recent jobs <span v-if="stateFilter" class="muted">· {{ stateFilter }}</span></h2>
            <table v-if="rows.length">
               <thead>
                  <tr>
                     <th>File</th><th>State</th><th>Stage</th><th class="num">Progress</th>
                     <th class="num">Attempt</th><th>Owner</th><th>Updated</th><th class="num">Duration</th>
                  </tr>
               </thead>
               <tbody>
                  <tr v-for="job in rows" :key="job.id">
                     <td :title="job.id">{{ job.filename || job.id }}</td>
                     <td>
                        <span class="badge" :class="stateClass[job.state]">{{ job.state }}</span>
                        <div v-if="job.errorCode" class="error small">{{ job.errorCode }}</div>
                     </td>
                     <td>{{ job.stage }}</td>
                     <td class="num">{{ job.progress }}%</td>
                     <td class="num">{{ job.attempt }}</td>
                     <td><code class="small">{{ job.ownerId }}</code></td>
                     <td>{{ formatDate(job.updatedAt) }}</td>
                     <td class="num">{{ formatMs(job.durationMs) }}</td>
                  </tr>
               </tbody>
            </table>
            <p v-else class="empty">No jobs.</p>
         </section>
      </template>
   </div>
</template>

<style scoped>
.filter { text-align: left; font: inherit; color: inherit; cursor: pointer; }
.filter.selected { border-color: var(--accent); }
.badge { margin-right: 4px; }
.small { font-size: 11px; }
</style>
