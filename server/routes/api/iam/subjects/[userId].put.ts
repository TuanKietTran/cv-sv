import { useMediator } from "@core/cqrs";
import { upsertSubjectCommand } from "@core/handlers/upsert-subject";

export default defineEventHandler(async (event) => {
   const userId = getRouterParam(event, "userId")!;
   const body = await readBody(event);
   const mediator = useMediator();
   return mediator.send(upsertSubjectCommand({
      userId,
      tier: body.tier,
      orgId: body.orgId,
      isServiceAccount: body.isServiceAccount,
   }));
});
