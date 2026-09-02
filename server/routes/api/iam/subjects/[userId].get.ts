import { useMediator } from "@core/cqrs";
import { getSubjectQuery } from "@core/handlers/get-subject";

export default defineEventHandler(async (event) => {
   const userId = getRouterParam(event, "userId")!;
   const mediator = useMediator();
   return mediator.send(getSubjectQuery({ userId }));
});
