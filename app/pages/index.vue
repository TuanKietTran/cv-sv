<script setup lang="ts">
useHead({ title: 'sub — coming soon' })
</script>

<template>
  <div class="landing">
    <div class="noise" aria-hidden="true" />

    <div class="content">
      <div class="badge">
        <span class="badge-dot" />
        Under Construction
      </div>

      <h1 class="heading">
        Something<br />
        <span class="heading-accent">great</span> is coming.
      </h1>

      <p class="sub">
        Subscription management, simplified.<br />
        We're building it right now.
      </p>

      <div class="actions">
        <NuxtLink to="/login" class="btn btn-primary">
          Get early access
          <span aria-hidden="true">→</span>
        </NuxtLink>
        <NuxtLink to="/d" class="btn btn-ghost">
          View dashboard
        </NuxtLink>
      </div>
    </div>

    <div class="grid-bg" aria-hidden="true">
      <div v-for="n in 64" :key="n" class="cell" />
    </div>
  </div>
</template>

<style scoped>
.landing {
  min-height: calc(100vh - 56px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  padding: 80px 24px;
}

/* Animated grid background */
.grid-bg {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  opacity: 0.04;
  pointer-events: none;
}
.cell {
  border: 1px solid var(--fg-text);
}

/* Noise overlay */
.noise {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
  opacity: 0.3;
  pointer-events: none;
}

/* Content */
.content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 600px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface0);
  border: 1px solid var(--border-strong);
  color: var(--fg-subtext1);
  border-radius: var(--radius-full);
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 32px;
}
.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 0 0 8px var(--yellow);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.heading {
  font-size: clamp(48px, 8vw, 80px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--fg-text);
  margin: 0 0 24px;
}
.heading-accent {
  color: var(--accent);
  position: relative;
}

.sub {
  font-size: 18px;
  color: var(--fg-subtext1);
  line-height: 1.7;
  margin: 0 0 40px;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  text-decoration: none;
}
.btn-primary {
  background: var(--accent);
  color: var(--bg-crust);
  border-color: var(--accent);
}
.btn-primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--accent) 30%, transparent);
}
.btn-ghost {
  background: var(--bg-surface0);
  color: var(--fg-subtext1);
  border-color: var(--border);
}
.btn-ghost:hover {
  background: var(--bg-surface1);
  color: var(--fg-text);
}
</style>
