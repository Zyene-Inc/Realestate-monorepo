import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';

function normalizedUrl(value: string | undefined, fallback: string) {
  return (value || fallback).replace(/\/$/, '');
}

export function getPortalUrls(config: ConfigService) {
  const legacyFrontendUrl = normalizedUrl(
    config.get<string>('FRONTEND_URL'),
    'http://localhost:3000',
  );

  return {
    public: normalizedUrl(
      config.get<string>('PUBLIC_SITE_URL'),
      legacyFrontendUrl,
    ),
    agent: normalizedUrl(
      config.get<string>('AGENT_PORTAL_URL'),
      legacyFrontendUrl,
    ),
    propertiesAdmin: normalizedUrl(
      config.get<string>('PROPERTIES_ADMIN_URL'),
      legacyFrontendUrl,
    ),
    rentalAdmin: normalizedUrl(
      config.get<string>('RENTAL_ADMIN_URL'),
      legacyFrontendUrl,
    ),
    tenant: normalizedUrl(
      config.get<string>('TENANT_PORTAL_URL'),
      legacyFrontendUrl,
    ),
    superAdmin: normalizedUrl(
      config.get<string>('SUPER_ADMIN_URL'),
      legacyFrontendUrl,
    ),
  };
}

export function getPortalUrlForRole(config: ConfigService, role?: Role) {
  const urls = getPortalUrls(config);
  if (role === Role.AGENT) return urls.agent;
  if (role === Role.SALES_ADMIN) return urls.propertiesAdmin;
  if (role === Role.TENANT_ADMIN) return urls.rentalAdmin;
  if (role === Role.TENANT) return urls.tenant;
  if (role === Role.SUPER_ADMIN) return urls.superAdmin;
  return urls.public;
}

export function getAllowedFrontendOrigins(config: ConfigService) {
  const configured = (config.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return new Set([...Object.values(getPortalUrls(config)), ...configured]);
}
