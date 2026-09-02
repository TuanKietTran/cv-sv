import { useMediator } from "@core/cqrs";
import { checkAccessQuery } from "@core/handlers/check-access";

export default defineEventHandler(async (event) => {
   const body = await readBody(event);
   const mediator = useMediator();
   return mediator.send(checkAccessQuery({
      userId: body.userId,
      action: body.action,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      ownerUserId: body.ownerUserId,
      ownerOrgId: body.ownerOrgId,
   }));
});
