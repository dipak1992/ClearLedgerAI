import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/server/auth-options";
import { prisma } from "@/lib/server/prisma";

export async function getRequestUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: true
    }
  });

  return user;
}
