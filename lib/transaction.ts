import "server-only"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/** Retry the complete read/check/write operation, never just the last write. */
export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 3) {
        throw error
      }
      await new Promise(resolve => setTimeout(resolve, 10 * 2 ** attempt))
    }
  }
}
