import { useMediator } from "@core/cqrs";
import { getUserQuery } from "@core/handlers/get-user";

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event);
  const userId = session.data?.userId;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }

  const mediator = useMediator();
  try {
    return await mediator.send(getUserQuery({ userId }));
  } catch {
    throw createError({ statusCode: 401, statusMessage: "Not authenticated" });
  }
});
