import { Injectable } from '@nestjs/common';
import { updateCustomerProfileSchema, updateLocationSchema } from '@stampperk/shared';
import { PrismaService } from '../prisma/prisma.service';

const profileSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  alternatePhone: true,
  photoUrl: true,
  dateOfBirth: true,
  gender: true,
  language: true,
  timezone: true,
  currency: true,
  country: true,
  province: true,
  district: true,
  city: true,
  municipality: true,
  ward: true,
  streetAddress: true,
  postalCode: true,
  marketingConsent: true,
  pushConsent: true,
  notifyOffers: true,
  notifyLoyalty: true,
  notifyExpiry: true,
  notifyTransfers: true,
  notifyStaff: true,
  qrToken: true,
  role: true,
  lastLat: true,
  lastLng: true,
  lastLocationAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  updateProfile(userId: string, body: unknown) {
    const data = updateCustomerProfileSchema.parse(body);
    const emptyToNull = (v: string | undefined) => (v === '' ? null : v);

    let dateOfBirth: Date | null | undefined = undefined;
    if (data.dateOfBirth === null || data.dateOfBirth === '') {
      dateOfBirth = null;
    } else if (typeof data.dateOfBirth === 'string') {
      dateOfBirth = new Date(data.dateOfBirth.includes('T') ? data.dateOfBirth : `${data.dateOfBirth}T00:00:00.000Z`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: emptyToNull(data.phone),
        alternatePhone: emptyToNull(data.alternatePhone),
        photoUrl: emptyToNull(data.photoUrl),
        dateOfBirth,
        gender: emptyToNull(data.gender),
        language: emptyToNull(data.language) ?? undefined,
        timezone: emptyToNull(data.timezone) ?? undefined,
        currency: emptyToNull(data.currency) ?? undefined,
        country: emptyToNull(data.country) ?? undefined,
        province: emptyToNull(data.province),
        district: emptyToNull(data.district),
        city: emptyToNull(data.city),
        municipality: emptyToNull(data.municipality),
        ward: emptyToNull(data.ward),
        streetAddress: emptyToNull(data.streetAddress),
        postalCode: emptyToNull(data.postalCode),
        marketingConsent: data.marketingConsent,
        pushConsent: data.pushConsent,
        notifyOffers: data.notifyOffers,
        notifyLoyalty: data.notifyLoyalty,
        notifyExpiry: data.notifyExpiry,
        notifyTransfers: data.notifyTransfers,
        notifyStaff: data.notifyStaff,
      },
      select: profileSelect,
    });
  }

  updateLocation(userId: string, body: unknown) {
    const data = updateLocationSchema.parse(body);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLat: data.latitude,
        lastLng: data.longitude,
        lastLocationAt: new Date(),
      },
      select: { id: true, lastLat: true, lastLng: true, lastLocationAt: true },
    });
  }
}
