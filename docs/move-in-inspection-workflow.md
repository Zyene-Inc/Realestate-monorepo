# Move-in inspection and key-handover workflow

## Purpose

The move-in record preserves the condition of the rental at the beginning of the tenancy. It is operational evidence, not a replacement for the signed lease, required notices, licensed advice, or local inspection requirements.

Missouri law permits a security deposit to be used to restore a home to its condition at the commencement of the tenancy, excluding ordinary wear and tear. The current statute is [RSMo 535.300](https://revisor.mo.gov/main/OneSection.aspx?section=535.300). The Missouri Attorney General also advises landlords to make a property habitable before move-in. Staff should have Johnson Realty's final checklist language and retention policy reviewed by Missouri counsel.

## Workflow

1. An active lease automatically receives a private draft inspection. Existing active leases can be selected from **Move-in inspections** to create the same standard draft.
2. Staff records the walkthrough date, each room and fixture condition, relevant notes, private photos, utility meter baselines, and every key, fob, remote, or access card.
3. Every condition item must be completed. Every physical key record must be marked handed over. A keyless home must instead include a non-secret description of how access was delivered.
4. Staff selects **Send to resident**. The staff-authored record becomes read-only and the resident receives an in-app notification and email.
5. The resident reviews the record in **Move-in record**. Resident conditions, notes, and photos are stored separately and never overwrite staff evidence.
6. The resident types the account holder's full name and accepts the displayed acknowledgement statement.
7. Completion stores an immutable acknowledgement containing the exact statement, record revision, complete JSON snapshot, SHA-256 digest, typed name, resident note, user, and timestamp.
8. Staff receives an in-app notification and email. The completed record remains viewable in both portals.

## Status rules

- `DRAFT`: staff can edit checklist, meters, keys, metadata, and staff photos.
- `READY_FOR_TENANT`: staff content is locked; the resident can add observations and resident photos.
- `COMPLETED`: all content and the acknowledgement are retained read-only.
- `CANCELED`: retained with a required cancellation reason; it is never silently deleted.

Before the resident acknowledges, staff can reopen a pending record with a required reason. Existing resident observations remain preserved. A completed record cannot be reopened, canceled, or mutated.

## Storage and access

- Bucket: `move-in-inspection-media`
- Access: private
- Allowed files: JPEG, PNG, WebP, and HEIC
- Maximum file size: 8 MB
- Maximum record count: 60 photos, of which residents can add up to 20
- Downloads: server-authorized signed URLs expiring after five minutes
- Direct `anon` and `authenticated` database access: revoked
- Application access: authenticated NestJS APIs using role checks and tenant ownership checks

Database references are removed before best-effort object cleanup, so a failed database operation never leaves a record pointing to a deleted photo.

## Production deployment

Supabase production project `xwrlpqakdndpnqqpfepz` records this workflow as applied migration `20260825003726_complete_move_in_inspection_and_key_handover`. The two committed SQL copies remain byte-identical and are mapped to that live version in `docs/database-migration-ledger.json`.

Deployment verification confirmed seven RLS-enabled workflow tables, 27 supporting indexes, no direct `anon` or `authenticated` table grants, and a private `move-in-inspection-media` bucket limited to approved image MIME types and 8 MB per object. The migration created no inspection or acknowledgement records.

## Security and evidence rules

- Never store reusable door, alarm, lockbox, or keypad codes in access notes or key identifiers.
- Optimistic revision checks prevent one browser from silently overwriting changes made in another.
- State transitions and mutations write audit events.
- Staff and resident evidence retain separate source attribution.
- The completed snapshot excludes signed download URLs and private storage paths while retaining photo identifiers and file metadata.
- No fake or historical inspections are backfilled automatically.
