import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class PasswordSecurityService {
  async assertNotCompromised(password: string) {
    const digest = createHash('sha1')
      .update(password, 'utf8')
      .digest('hex')
      .toUpperCase();
    const prefix = digest.slice(0, 5);
    const suffix = digest.slice(5);

    let response: Response;
    try {
      response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'Add-Padding': 'true',
          'User-Agent': 'Coach-Johnson-Realty-Password-Security',
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Password safety validation is temporarily unavailable',
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Password safety validation is temporarily unavailable',
      );
    }

    const compromised = (await response.text())
      .split('\n')
      .some((line) => line.split(':', 1)[0]?.trim() === suffix);
    if (compromised) {
      throw new BadRequestException(
        'This password appears in a known data breach. Choose a different password.',
      );
    }
  }
}
