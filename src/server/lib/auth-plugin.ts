import { auth } from "@/lib/auth";
import Elysia from "elysia";

export const authPlugin = new Elysia({ name: "auth-plugin" })
  .derive({ as: "scoped" }, async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    return { user: session?.user ?? null };
  })
  .onBeforeHandle({ as: "scoped" }, ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { error: "ต้องเข้าสู่ระบบ" };
    }
  });
