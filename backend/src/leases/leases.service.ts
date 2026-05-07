import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeasesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lease.findMany({
      include: { tenant: true, unit: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.lease.findUnique({
      where: { id },
      include: { tenant: true, unit: true, payments: true },
    });
  }

  async create(data: any) {
    return this.prisma.lease.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.lease.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.lease.delete({
      where: { id },
    });
  }
}
