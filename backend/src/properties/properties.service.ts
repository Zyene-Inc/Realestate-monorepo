import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.property.findMany({
      include: { units: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.property.findUnique({
      where: { id },
      include: { units: true },
    });
  }

  async create(data: any) {
    return this.prisma.property.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.property.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.property.delete({
      where: { id },
    });
  }
}
