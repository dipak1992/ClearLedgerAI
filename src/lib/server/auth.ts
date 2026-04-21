import { headers } from "next/headers";

import { prisma } from "@/lib/server/prisma";

export async function getRequestUser() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("x-user-email") ?? "demo@clearledger.ai";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      authUserId: email,
      fullName: requestHeaders.get("x-user-name") ?? "Demo User"
    }
  });

  return user;
}
