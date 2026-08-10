import { PrismaService } from '../prisma/prisma.service';

/** Unambiguous alphabet (no 0/O, 1/I). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const SHORT_QR_LENGTH = 6;

export function randomShortQrToken(length = SHORT_QR_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Legacy Prisma cuid()-style tokens are long; short codes are 4–8 chars. */
export function isLegacyQrToken(token: string) {
  return !token || token.length > 8;
}

export async function allocateUniqueQrToken(
  prisma: PrismaService,
  length = SHORT_QR_LENGTH,
): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const token = randomShortQrToken(length + (attempt > 12 ? 2 : 0));
    const exists = await prisma.user.findUnique({
      where: { qrToken: token },
      select: { id: true },
    });
    if (!exists) return token;
  }
  // Extremely unlikely; keep uniqueness with longer fallback
  return `${randomShortQrToken(6)}${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
