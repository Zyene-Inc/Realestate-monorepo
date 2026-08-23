import { Role, UserStatus } from '@prisma/client';
import type { Request } from 'express';

type AuthenticatedUser = {
  sub: string;
  authUserId: string;
  email: string;
  role: Role;
  status: UserStatus;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};
