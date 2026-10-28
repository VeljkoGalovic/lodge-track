-- Canonicalise email addresses in place (2026-10-28).
--
-- From now on alias spellings share one account: the stored value is the
-- canonical form produced by lib/email.ts canonicalizeEmail() — lowercased
-- and trimmed, `+tag` stripped from the local part, dots removed and
-- googlemail.com folded onto gmail.com for Google, case-folded elsewhere.
--
-- Rows whose email is already canonical are untouched. Rows sharing a
-- canonical form are resolved deterministically: a row that is already exactly
-- canonical wins, otherwise the oldest row stays and the rest keep their
-- original spelling (they surface as "email already in use" at registration
-- and as an alias at sign-in — no data is deleted).
--
-- Token and invitation tables get the same rewrite without collision guards:
-- they are non-unique, and their emails must key to the canonical user rows.

WITH parsed AS (
  SELECT id, email, btrim(lower(email)) AS addr, "createdAt"
  FROM "User"
),
split AS (
  SELECT
    id, email, addr, "createdAt",
    CASE
      WHEN addr LIKE '%@%' AND addr NOT LIKE '%@%@%' THEN split_part(addr, '@', 1)
    END AS local,
    CASE
      WHEN addr LIKE '%@%' AND addr NOT LIKE '%@%@%'
      THEN CASE split_part(addr, '@', 2)
             WHEN 'googlemail.com' THEN 'gmail.com'
             ELSE split_part(addr, '@', 2)
           END
    END AS domain
  FROM parsed
),
localised AS (
  SELECT
    id, email, addr, "createdAt", domain,
    CASE WHEN domain = 'gmail.com'
         THEN regexp_replace(regexp_replace(local, '\+.*$', ''), '\.', '', 'g')
         ELSE regexp_replace(local, '\+.*$', '')
    END AS localc
  FROM split
),
final AS (
  SELECT
    id, email, "createdAt",
    CASE WHEN localc = '' OR domain = '' OR domain IS NULL THEN NULL
         ELSE localc || '@' || domain
    END AS cemail
  FROM localised
),
ranked AS (
  SELECT
    id, email, cemail,
    row_number() OVER (
      PARTITION BY cemail
      ORDER BY (email = cemail) DESC, "createdAt" ASC
    ) AS rn
  FROM final
  WHERE cemail IS NOT NULL
)
UPDATE "User" u
SET email = r.cemail
FROM ranked r
WHERE u.id = r.id
  AND r.rn = 1
  AND r.cemail <> r.email;

-- Verification tokens: canonical rewrite, no collision guard (non-unique).
WITH parsed AS (
  SELECT id, btrim(lower(email)) AS addr
  FROM "VerificationToken"
),
split AS (
  SELECT
    id, addr,
    CASE
      WHEN addr LIKE '%@%' AND addr NOT LIKE '%@%@%' THEN split_part(addr, '@', 1)
    END AS local,
    CASE
      WHEN addr LIKE '%@%' AND addr NOT LIKE '%@%@%'
      THEN CASE split_part(addr, '@', 2)
             WHEN 'googlemail.com' THEN 'gmail.com'
             ELSE split_part(addr, '@', 2)
           END
    END AS domain
  FROM parsed
),
localised AS (
  SELECT
    id, domain,
    CASE WHEN domain = 'gmail.com'
         THEN regexp_replace(regexp_replace(local, '\+.*$', ''), '\.', '', 'g')
         ELSE regexp_replace(local, '\+.*$', '')
    END AS localc
  FROM split
),
final AS (
  SELECT id,
         CASE WHEN localc = '' OR domain = '' OR domain IS NULL THEN NULL
              ELSE localc || '@' || domain
         END AS cemail
  FROM localised
)
UPDATE "VerificationToken" t
SET email = f.cemail
FROM final f
WHERE t.id = f.id
  AND f.cemail IS NOT NULL
  AND f.cemail <> t.email;

-- Invitations: canonical rewrite, no collision guard (non-unique index).
WITH parsed AS (
  SELECT id, btrim(lower(email)) AS addr
  FROM "Invitation"
),
split AS (
  SELECT
    id, addr,
    CASE
      WHEN addr LIKE '%@%' AND addr NOT LIKE '%@%@%' THEN split_part(addr, '@', 1)
    END AS local,
    CASE
      WHEN addr LIKE '%@%' AND addr NOT LIKE '%@%@%'
      THEN CASE split_part(addr, '@', 2)
             WHEN 'googlemail.com' THEN 'gmail.com'
             ELSE split_part(addr, '@', 2)
           END
    END AS domain
  FROM parsed
),
localised AS (
  SELECT
    id, domain,
    CASE WHEN domain = 'gmail.com'
         THEN regexp_replace(regexp_replace(local, '\+.*$', ''), '\.', '', 'g')
         ELSE regexp_replace(local, '\+.*$', '')
    END AS localc
  FROM split
),
final AS (
  SELECT id,
         CASE WHEN localc = '' OR domain = '' OR domain IS NULL THEN NULL
              ELSE localc || '@' || domain
         END AS cemail
  FROM localised
)
UPDATE "Invitation" i
SET email = f.cemail
FROM final f
WHERE i.id = f.id
  AND f.cemail IS NOT NULL
  AND f.cemail <> i.email;
