import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.unit.findMany({
      include: { property: true, tenants: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.unit.findUnique({
      where: { id },
      include: { property: true, tenants: true },
    });
  }

  async create(data: any) {
    return this.prisma.unit.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.unit.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
