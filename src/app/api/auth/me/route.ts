import { getSessionUser, publicUser } from "@/lib/auth";
import { jsonOk } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonOk({ user: null });
  return jsonOk({
    user: {
      ...publicUser(user),
      email: user.email,
      phoneFull: user.phone,
      fullName: user.fullName,
    },
  });
}
