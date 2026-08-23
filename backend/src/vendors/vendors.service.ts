import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.vendor.findMany();
  }

  async create(data: Prisma.VendorCreateInput) {
    return this.prisma.vendor.create({ data });
  }
}
