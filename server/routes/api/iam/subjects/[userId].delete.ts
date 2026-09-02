import { useMediator } from "@core/cqrs";
import { deleteSubjectCommand } from "@core/handlers/delete-subject";

export default defineEventHandler(async (event) => {
   const userId = getRouterParam(event, "userId")!;
   const mediator = useMediator();
   return mediator.send(deleteSubjectCommand({ userId }));
});
