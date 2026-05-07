import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vendor.findMany();
  }

  async create(data: any) {
    return this.prisma.vendor.create({ data });
  }
}
