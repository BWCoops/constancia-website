/**
 * Seed the Constancia Brain data dictionary with starter terms.
 *
 * Usage: BRAIN_DATABASE_URL=... npx tsx scripts/brain-seed-dictionary.ts
 *
 * Idempotent: ON CONFLICT (team_id, domain, term) DO UPDATE.
 * Requires a `kb_teams` row to exist; will create the default
 * "constancia" team if none exists.
 */

import { brainDb } from "../server/brain/db";
import { kbDictionaryTerms, kbTeams } from "../shared/brain-schema";
import { eq, and, sql } from "drizzle-orm";

interface SeedTerm {
  term: string;
  expansion?: string;
  definition: string;
  domain: "delivery" | "finance" | "onestream" | "sql" | "sales" | "general";
  synonyms?: string[];
}

const STARTER_TERMS: SeedTerm[] = [
  // ---------- Delivery ----------
  {
    term: "SOW",
    expansion: "Statement of Work",
    definition:
      "Contractual document defining the scope, deliverables, timeline and commercials of an engagement. The authoritative source of what we are committed to deliver.",
    domain: "delivery",
    synonyms: ["statement of work"],
  },
  {
    term: "RTM",
    expansion: "Requirements Traceability Matrix",
    definition:
      "A grid that links each requirement to the design element, test case and delivered artefact that satisfies it. Used to demonstrate coverage at UAT and gate sign-off.",
    domain: "delivery",
    synonyms: ["requirements traceability matrix", "traceability matrix"],
  },
  {
    term: "FSD",
    expansion: "Functional Specification Document",
    definition:
      "Describes WHAT the solution must do from a business and user perspective. Pairs with the TSD which describes HOW.",
    domain: "delivery",
    synonyms: ["functional spec", "functional specification"],
  },
  {
    term: "TSD",
    expansion: "Technical Specification Document",
    definition:
      "Describes HOW the solution is built — data model, integrations, components, configurations. Pairs with the FSD.",
    domain: "delivery",
    synonyms: ["technical spec", "technical design document", "TDD"],
  },
  {
    term: "UAT",
    expansion: "User Acceptance Testing",
    definition:
      "The phase where the client validates that delivered functionality meets the FSD. Pass-criteria gate final sign-off.",
    domain: "delivery",
  },
  {
    term: "Go-Live",
    definition:
      "The cutover event where the new system replaces or augments the old one for real business use. Distinct from technical deployment.",
    domain: "delivery",
    synonyms: ["cutover", "production go-live"],
  },
  {
    term: "Change Request",
    expansion: "Change Request",
    definition:
      "Formal request to alter agreed scope, schedule or cost mid-engagement. Tracked separately from defects.",
    domain: "delivery",
    synonyms: ["CR"],
  },

  // ---------- Finance / EPM ----------
  {
    term: "EPM",
    expansion: "Enterprise Performance Management",
    definition:
      "Discipline and tooling for planning, consolidation, reporting and analysis at enterprise scale. Vendors: OneStream, Anaplan, Oracle EPM, SAP, Workday Adaptive.",
    domain: "finance",
    synonyms: ["enterprise performance management", "CPM"],
  },
  {
    term: "Consolidation",
    definition:
      "The process of combining financial results across legal entities, applying currency translation, eliminations and adjustments to produce group financials.",
    domain: "finance",
  },
  {
    term: "FP&A",
    expansion: "Financial Planning & Analysis",
    definition:
      "The function responsible for budgeting, forecasting, variance analysis and management reporting.",
    domain: "finance",
  },
  {
    term: "Chart of Accounts",
    definition:
      "The hierarchical list of accounts used to record financial transactions. The dimensional spine of consolidation and reporting.",
    domain: "finance",
    synonyms: ["CoA"],
  },
  {
    term: "Intercompany Elimination",
    definition:
      "Removal of transactions between entities within the same consolidation group so they do not double-count in group results.",
    domain: "finance",
    synonyms: ["IC elimination", "intercompany"],
  },
  {
    term: "Currency Translation",
    definition:
      "Conversion of local-currency financials to a group reporting currency using rule-driven rates (closing, average, historical).",
    domain: "finance",
    synonyms: ["FX translation"],
  },

  // ---------- OneStream ----------
  {
    term: "Business Rule",
    expansion: "Business Rule",
    definition:
      "Custom VB.NET or C# code executed by the OneStream platform during data load, consolidation, calculations or events. The primary extensibility mechanism in OneStream.",
    domain: "onestream",
    synonyms: ["BR", "OneStream business rule"],
  },
  {
    term: "Data Management",
    definition:
      "OneStream's framework for orchestrating sequences of steps — exports, loads, transformations — outside the calculation engine. Used for ETL-style automation.",
    domain: "onestream",
    synonyms: ["DM", "data management sequence", "DMS"],
  },
  {
    term: "Stage",
    definition:
      "OneStream's intermediate data area where source data lands and is validated before being posted to a Cube.",
    domain: "onestream",
    synonyms: ["staging engine"],
  },
  {
    term: "Cube",
    definition:
      "OneStream's multidimensional store for consolidated and reportable data. Distinct from Stage.",
    domain: "onestream",
  },
  {
    term: "Workflow",
    definition:
      "OneStream's process management for data submission, review and certification by entity / scenario / period.",
    domain: "onestream",
  },
  {
    term: "Confirmation Rule",
    definition:
      "A data-quality check that runs against Workflow data and must pass before the workflow can advance. Author as a Business Rule.",
    domain: "onestream",
  },
  {
    term: "Member Formula",
    definition:
      "Calculation defined on a single dimension member (e.g., a computed Account) that runs at calculation time.",
    domain: "onestream",
  },

  // ---------- SQL ----------
  {
    term: "CTE",
    expansion: "Common Table Expression",
    definition:
      "A `WITH name AS (SELECT ...)` block in SQL. Improves readability and enables recursion without temp tables.",
    domain: "sql",
    synonyms: ["common table expression"],
  },
  {
    term: "Window Function",
    definition:
      "Aggregation that operates over a window of rows without collapsing them, e.g. `ROW_NUMBER() OVER (PARTITION BY ...)`. Core to ranking and running totals.",
    domain: "sql",
  },
  {
    term: "Upsert",
    definition:
      "INSERT-or-UPDATE in one statement. PostgreSQL: `INSERT ... ON CONFLICT (...) DO UPDATE`. T-SQL: `MERGE`.",
    domain: "sql",
    synonyms: ["merge", "ON CONFLICT"],
  },
  {
    term: "Star Schema",
    definition:
      "Dimensional modelling pattern: a central fact table joined to multiple denormalised dimension tables. Standard for BI / reporting layers.",
    domain: "sql",
  },
  {
    term: "Slowly Changing Dimension",
    definition:
      "A dimension where attribute values change over time. Type 1 overwrites; Type 2 keeps history with effective/expiry dates.",
    domain: "sql",
    synonyms: ["SCD", "SCD2"],
  },

  // ---------- Sales / commercial ----------
  {
    term: "ICP",
    expansion: "Ideal Customer Profile",
    definition:
      "The crisp definition of the type of company most likely to buy and succeed with our offering. Drives outbound targeting and disqualification.",
    domain: "sales",
  },
  {
    term: "MQL",
    expansion: "Marketing Qualified Lead",
    definition:
      "A prospect who has demonstrated engagement (downloads, demos, scoring threshold) and is ready for sales contact.",
    domain: "sales",
  },
  {
    term: "SQL (sales)",
    expansion: "Sales Qualified Lead",
    definition:
      "A prospect that sales has accepted as worth pursuing — distinct from MQL. Note: collides with the SQL programming acronym; disambiguate by context.",
    domain: "sales",
    synonyms: ["sales qualified lead"],
  },
  {
    term: "TAM",
    expansion: "Total Addressable Market",
    definition:
      "The total revenue opportunity available if we captured 100% of demand for our offering in a defined market.",
    domain: "sales",
  },

  // ---------- General ----------
  {
    term: "POC",
    expansion: "Proof of Concept",
    definition:
      "A scoped technical exercise to demonstrate that a proposed solution is feasible. Distinct from a pilot, which validates business value.",
    domain: "general",
    synonyms: ["proof of concept"],
  },
];

async function ensureDefaultTeam(): Promise<string> {
  const slug = "constancia";
  const existing = await brainDb
    .select({ id: kbTeams.id })
    .from(kbTeams)
    .where(eq(kbTeams.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [inserted] = await brainDb
    .insert(kbTeams)
    .values({ slug, name: "Constancia" })
    .returning({ id: kbTeams.id });

  console.log(`Created default team "${slug}" (${inserted.id}).`);
  return inserted.id;
}

async function seed() {
  const teamId = await ensureDefaultTeam();
  console.log(`Seeding ${STARTER_TERMS.length} dictionary terms for team ${teamId}.`);

  let inserted = 0;
  let updated = 0;

  for (const t of STARTER_TERMS) {
    const result = await brainDb
      .insert(kbDictionaryTerms)
      .values({
        teamId,
        term: t.term,
        expansion: t.expansion,
        definition: t.definition,
        domain: t.domain,
        synonyms: t.synonyms ?? [],
        isCanonical: true,
      })
      .onConflictDoUpdate({
        target: [
          kbDictionaryTerms.teamId,
          kbDictionaryTerms.domain,
          kbDictionaryTerms.term,
        ],
        set: {
          expansion: t.expansion,
          definition: t.definition,
          synonyms: t.synonyms ?? [],
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: kbDictionaryTerms.id, createdAt: kbDictionaryTerms.createdAt, updatedAt: kbDictionaryTerms.updatedAt });

    const row = result[0];
    if (row.createdAt.getTime() === row.updatedAt.getTime()) {
      inserted++;
    } else {
      updated++;
    }
  }

  console.log(`Done. ${inserted} inserted, ${updated} updated.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
