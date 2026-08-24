import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePropertyOwnerDto } from './property-owner.dto';

describe('property owner DTOs', () => {
  it('accepts a named owner submission with blank optional fields', async () => {
    const dto = plainToInstance(CreatePropertyOwnerDto, {
      ownerName: '  Alice Owner  ',
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
    expect(dto.ownerName).toBe('Alice Owner');
    expect(dto.companyName).toBeUndefined();
    expect(dto.contactPhone).toBeUndefined();
  });

  it('rejects an owner record without a name', async () => {
    const dto = plainToInstance(CreatePropertyOwnerDto, {
      ownerName: '  ',
      contactEmail: 'owner@example.com',
      commissionRate: 10,
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
