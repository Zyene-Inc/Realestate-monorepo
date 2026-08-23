import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePropertyOwnerDto } from './property-owner.dto';

describe('property owner DTOs', () => {
  it('accepts an owner submission with blank optional fields', async () => {
    const dto = plainToInstance(CreatePropertyOwnerDto, {
      ownerName: '  ',
      companyName: '  ',
      contactEmail: '  OWNER@Example.com ',
      contactPhone: '  ',
      commissionRate: '10',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      contactEmail: 'owner@example.com',
      commissionRate: 10,
    });
    expect(dto.ownerName).toBeUndefined();
    expect(dto.companyName).toBeUndefined();
    expect(dto.contactPhone).toBeUndefined();
  });
});
