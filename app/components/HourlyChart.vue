<script setup lang="ts">
import type { HourlyTotal } from "@core/analytics/metrics";

const props = defineProps<{ points: HourlyTotal[] }>();
const peak = computed(() => Math.max(1, ...props.points.map(point => point.count)));
</script>

<template>
   <div class="chart" role="img" :aria-label="`Requests per hour, peak ${peak}`">
      <div
         v-for="point in points"
         :key="point.hour"
         class="bar"
         :title="`${point.hour}:00 UTC — ${point.count} requests, ${point.errors} errors, avg ${formatMs(point.avgMs)}`"
      >
         <span class="fill" :style="{ height: `${(point.count / peak) * 100}%` }">
            <span class="err" :style="{ height: point.count ? `${(point.errors / point.count) * 100}%` : '0' }" />
         </span>
      </div>
   </div>
   <div class="axis muted">
      <span>{{ points[0]?.hour.slice(5).replace("T", " ") }}:00</span>
      <span>peak {{ peak }}/h</span>
      <span>{{ points.at(-1)?.hour.slice(5).replace("T", " ") }}:00 UTC</span>
   </div>
</template>

<style scoped>
.chart { display: flex; align-items: flex-end; gap: 2px; height: 120px; }
.bar { flex: 1; height: 100%; display: flex; align-items: flex-end; }
.fill { width: 100%; min-height: 1px; background: var(--accent); border-radius: 2px 2px 0 0; display: flex; align-items: flex-end; opacity: .85; }
.bar:hover .fill { opacity: 1; }
.err { width: 100%; background: var(--red); }
.axis { display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; }
</style>
