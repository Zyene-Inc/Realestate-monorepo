import { Injectable, NotFoundException } from '@nestjs/common';
import { ListingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  RentalPropertyDto,
  UpdateRentalPropertyDto,
} from './dto/rental-property.dto';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.property.findMany({
      where: { listingType: ListingType.RENT },
      include: { units: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.property.findFirst({
      where: { id, listingType: ListingType.RENT },
      include: { units: true },
    });
  }

  async create(data: RentalPropertyDto) {
    return this.prisma.property.create({
      data: {
        ...data,
        availabilityDate: data.availabilityDate
          ? new Date(data.availabilityDate)
          : undefined,
        listingType: ListingType.RENT,
        listingStatus: null,
        agentId: null,
        submittedAt: null,
        reviewedAt: null,
        reviewedByUserId: null,
        rejectionReason: null,
      },
    });
  }

  async update(id: string, data: UpdateRentalPropertyDto) {
    const result = await this.prisma.property.updateMany({
      where: { id, listingType: ListingType.RENT },
      data: {
        ...data,
        availabilityDate: data.availabilityDate
          ? new Date(data.availabilityDate)
          : undefined,
      },
    });
    if (result.count !== 1)
      throw new NotFoundException('Rental property not found');
    return this.findOne(id);
  }

  async remove(id: string) {
    const result = await this.prisma.property.deleteMany({
      where: { id, listingType: ListingType.RENT },
    });
    if (result.count !== 1)
      throw new NotFoundException('Rental property not found');
    return { deleted: true };
  }
}
