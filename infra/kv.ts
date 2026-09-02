import { openKv } from "@deno/kv";

let _kv: Awaited<ReturnType<typeof openKv>> | undefined;

export async function getKv() {
   if (!_kv) _kv = await openKv();
   return _kv;
}
