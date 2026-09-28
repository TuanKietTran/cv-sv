import { METRIC_KINDS, readMetrics } from "~~/server/lib/analytics";

export default defineEventHandler(async (event) => {
   const hours = Math.min(720, Math.max(1, Math.trunc(Number(getQuery(event).hours)) || 24));
   const storage = useStorage("analytics");
   const [routes, cqrs, users, tasks] = await Promise.all(METRIC_KINDS.map(kind => readMetrics(storage, kind, hours)));
   return { hours, routes: routes!, cqrs: cqrs!, users: users!, tasks: tasks! };
});
