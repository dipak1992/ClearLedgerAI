import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/server/auth-options";
import { prisma } from "@/lib/server/prisma";

export async function getRequestUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return null;
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      fullName: session.user?.name ?? undefined,
      avatarUrl: session.user?.image ?? undefined,
      name: session.user?.name ?? undefined,
      image: session.user?.image ?? undefined
    },
    create: {
      email,
      authUserId: email,
      fullName: session.user?.name ?? undefined,
      avatarUrl: session.user?.image ?? undefined,
      name: session.user?.name ?? undefined,
      image: session.user?.image ?? undefined
    }
  });

  return user;
}
