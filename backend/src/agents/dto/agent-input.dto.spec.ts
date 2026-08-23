import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DeclineAgentDto } from './decline-agent.dto';
import { UpdateAgentProfileDto } from './update-agent-profile.dto';

describe('agent input DTOs', () => {
  it('does not coerce an object into a decline reason', async () => {
    const dto = plainToInstance(DeclineAgentDto, {
      reason: { value: 'Missing license' },
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'reason')).toBe(true);
  });

  it('trims profile fields and accepts an empty phone to clear it', async () => {
    const dto = plainToInstance(UpdateAgentProfileDto, {
      companyName: '  Johnson Partner Realty  ',
      contactName: '  Alex Agent  ',
      phone: '   ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toEqual({
      companyName: 'Johnson Partner Realty',
      contactName: 'Alex Agent',
      phone: '',
    });
  });

  it('rejects markup and malformed phone numbers in profile changes', async () => {
    const dto = plainToInstance(UpdateAgentProfileDto, {
      companyName: '<b>Untrusted Realty</b>',
      phone: 'call-me-later',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'companyName',
      'phone',
    ]);
  });
});
