/**
 * Demo seed: fully fictional data (people, teams, processes, hours, requests).
 * Nothing here is derived from real employee or company data.
 *
 *   npx tsx prisma/seed-demo.ts
 *
 * Deterministic (seeded PRNG); dates are relative to "today" so the dashboard
 * always looks current. Re-running wipes and recreates all demo data.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_PIN = "123456";
const DOMAIN = "example.com";
const WORKDAY_HOURS = 7.5;
const HISTORY_WEEKDAYS = 40;

// ─── Deterministic PRNG (mulberry32) ─────────────────────────────────────────
let _s = 20260101;
function rand(): number {
  _s |= 0;
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)];
const chance = (p: number) => rand() < p;
const round025 = (n: number) => Math.round(n * 4) / 4;

// ─── Fictional reference data ────────────────────────────────────────────────
const FIRST = ["Avery", "Jordan", "Riley", "Morgan", "Casey", "Quinn", "Rowan", "Sage", "Parker", "Reese", "Skyler", "Dakota", "Emerson", "Finley", "Harper", "Kendall", "Logan", "Marlow", "Nova", "Oakley", "Peyton", "Remy", "Sutton", "Tatum", "Wren", "Arlo", "Blake", "Cameron", "Devon", "Ellis", "Frankie", "Gray", "Hayden", "Indigo", "Jules", "Kai", "Lane", "Micah", "Noel", "Ollie"];
const LAST = ["Alder", "Brook", "Calloway", "Dunmore", "Ellery", "Fairchild", "Garrick", "Hollis", "Iverson", "Jarrett", "Kestrel", "Langford", "Merriweather", "Northcott", "Osborne", "Pemberton", "Quillan", "Rainsford", "Sinclair", "Thorne", "Underhill", "Vance", "Whitlock", "Yardley", "Ashby", "Beaumont", "Cresswell", "Draper", "Eastwood", "Fenwick"];
const SITES = ["NYC1", "AUS2", "DUB3"];
const TITLES = ["Production Associate", "Senior Production Associate", "Quality Specialist", "Content Specialist"];

const TEAMS = ["Studio Production", "Quality Review", "Data Annotation", "Creative Ops", "Support Desk"];

// name, complexity, team index, vertical, category
const PROCESSES: [string, number, number, string, string][] = [
  ["Image Retouch", 1.2, 0, "Studio", "Production"],
  ["Video Editing", 1.5, 0, "Studio", "Production"],
  ["Product Audit", 1.0, 1, "Quality", "Review"],
  ["Compliance Check", 1.4, 1, "Quality", "Review"],
  ["Label Annotation", 0.9, 2, "Data", "Annotation"],
  ["Text Classification", 1.0, 2, "Data", "Annotation"],
  ["Design Systems", 1.3, 3, "Creative", "Design"],
  ["Campaign Layouts", 1.1, 3, "Creative", "Design"],
  ["Ticket Triage", 0.8, 4, "Support", "Support"],
  ["Escalation Handling", 1.6, 4, "Support", "Support"],
];

const SKILLS: [string, string][] = [
  ["Retouching", "Studio"], ["Color Grading", "Studio"], ["Motion Graphics", "Studio"],
  ["Auditing", "Quality"], ["Policy Review", "Quality"], ["Defect Triage", "Quality"],
  ["Bounding Boxes", "Data"], ["Entity Tagging", "Data"], ["Sentiment Labeling", "Data"],
  ["Layout Design", "Creative"], ["Copy Editing", "Creative"], ["Brand Guidelines", "Creative"],
  ["Customer Comms", "Support"], ["Root Cause Analysis", "Support"],
];

const TRAININGS = ["Onboarding Basics", "Quality Standards 101", "Tooling Deep Dive", "Advanced Review Techniques", "Cross-Skill Workshop"];
const STATUSES: [string, string | null][] = [
  ["Production", "In Queue"], ["Production", "Active Task"], ["Meeting", "Team Sync"],
  ["Training", "Workshop"], ["Leave", "Holiday"], ["Stop", null],
];

function weekdaysBack(n: number): Date[] {
  const out: Date[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() - 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(new Date(d));
  }
  return out.reverse();
}

async function wipe() {
  // Child → parent order
  await prisma.notification.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.requestAssociate.deleteMany();
  await prisma.resourceRequest.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.training.deleteMany();
  await prisma.associateSkill.deleteMany();
  await prisma.processOwner.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.associate.deleteMany();
  await prisma.process.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.user.updateMany({ data: { reportsTo: null, teamId: null } });
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
}

async function main() {
  console.log("Seeding demo data (all fictional)...");
  await wipe();
  const hash = await bcrypt.hash(DEMO_PIN, 10);

  const teams = await Promise.all(TEAMS.map((name) => prisma.team.create({ data: { name } })));

  const usedLogins = new Set<string>();
  const makePerson = () => {
    for (;;) {
      const first = pick(FIRST), last = pick(LAST);
      const login = (first[0] + last).toLowerCase();
      if (usedLogins.has(login)) continue;
      usedLogins.add(login);
      return { login, name: `${first} ${last}` };
    }
  };

  // Fixed, easy-to-remember demo accounts
  const admin = await prisma.user.create({
    data: { email: `admin@${DOMAIN}`, name: "Demo Admin", role: "Admin", passwordHash: hash, teamId: teams[0].id, level: "L5", location: SITES[0], jobTitle: "Platform Admin" },
  });
  const leaders = [];
  for (const [i, name] of ["Demo Leader", "Sam Leadwell"].entries()) {
    leaders.push(await prisma.user.create({
      data: { email: i === 0 ? `leader@${DOMAIN}` : `sleadwell@${DOMAIN}`, name, role: "Senior_Leader", passwordHash: hash, level: "L7", location: SITES[0], jobTitle: "Director" },
    }));
  }

  // Managers: one or two per team
  const managersByTeam: string[][] = teams.map(() => []);
  const managerUsers = [];
  for (const [ti, team] of teams.entries()) {
    const count = ti === 0 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const p = ti === 0 && k === 0 ? { login: "manager", name: "Demo Manager" } : makePerson();
      const u = await prisma.user.create({
        data: { email: `${p.login}@${DOMAIN}`, name: p.name, role: "Manager", passwordHash: hash, teamId: team.id, level: "L5", location: pick(SITES), jobTitle: "Operations Manager", reportsTo: leaders[k % leaders.length].id },
      });
      managersByTeam[ti].push(u.id);
      managerUsers.push(u);
    }
  }

  // Skills & processes
  const skills = await Promise.all(SKILLS.map(([name, category]) => prisma.skill.create({ data: { name, category } })));
  const skillsByCategory = (cat: string) => skills.filter((s) => s.category === cat);
  const processes = await Promise.all(
    PROCESSES.map(([name, complexityFactor, , vertical, category]) =>
      prisma.process.create({ data: { name, complexityFactor, vertical, category, description: `${name} work for the ${vertical} vertical.` } }),
    ),
  );
  const teamVertical = ["Studio", "Quality", "Data", "Creative", "Support"];

  // Associates: ~120 across teams, uneven sizes
  const sizes = [30, 24, 28, 20, 18];
  type Person = { userId: string; assocId: string; teamIdx: number; primary: number; load: number };
  const people: Person[] = [];
  const proficiencies = ["Expert", "Proficient", "Proficient", "Trained"] as const;

  for (const [ti, team] of teams.entries()) {
    const teamProcs = processes.filter((_, i) => PROCESSES[i][2] === ti);
    for (let n = 0; n < sizes[ti]; n++) {
      const demo = ti === 0 && n === 0;
      const p = demo ? { login: "associate", name: "Demo Associate" } : makePerson();
      const level = n < sizes[ti] * 0.55 ? "L3" : n < sizes[ti] * 0.9 ? "L4" : "L5";
      const role = level === "L3" ? "SME" : "POC";
      const user = await prisma.user.create({
        data: {
          email: `${p.login}@${DOMAIN}`, name: p.name, role: demo ? "Associate" : role, passwordHash: hash,
          teamId: team.id, level, location: pick(SITES), jobTitle: pick(TITLES),
          reportsTo: pick(managersByTeam[ti]), isOnLeave: chance(0.04),
        },
      });
      const status = pick(STATUSES);
      const assoc = await prisma.associate.create({
        data: {
          userId: user.id, name: p.name, teamId: team.id,
          currentStatus: user.isOnLeave ? "Leave" : status[0],
          currentSubStatus: user.isOnLeave ? "Holiday" : status[1],
          statusUpdatedAt: new Date(),
        },
      });

      // Skills: 2–3 from own team's category, sometimes one cross-skill
      const own = skillsByCategory(teamVertical[ti]);
      const chosen = new Set<string>();
      const nOwn = 2 + (chance(0.4) ? 1 : 0);
      while (chosen.size < Math.min(nOwn, own.length)) chosen.add(pick(own).id);
      if (chance(0.3)) chosen.add(pick(skills).id);
      for (const skillId of chosen) {
        await prisma.associateSkill.create({ data: { associateId: assoc.id, skillId, proficiency: pick([...proficiencies]) } });
      }

      // Trainings
      for (const t of TRAININGS.filter(() => chance(0.55))) {
        const d = new Date(); d.setUTCDate(d.getUTCDate() - Math.floor(rand() * 300));
        await prisma.training.create({ data: { associateId: assoc.id, trainingName: t, completionDate: d } });
      }

      const primary = processes.indexOf(pick(teamProcs));
      people.push({ userId: user.id, assocId: assoc.id, teamIdx: ti, primary, load: 0.45 + rand() * 0.55 });
    }
  }

  // Process owners (manager of the process's team)
  for (const [i, proc] of processes.entries()) {
    await prisma.processOwner.create({ data: { processId: proc.id, userId: managersByTeam[PROCESSES[i][2]][0] } });
  }

  // Time entries over the last N weekdays
  const days = weekdaysBack(HISTORY_WEEKDAYS);
  const entries: { associateId: string; processId: string; entryDate: Date; hours: number; enteredBy: string }[] = [];
  const lastDayLoad = new Map<string, number>();
  for (const person of people) {
    const teamProcs = processes.filter((_, i) => PROCESSES[i][2] === person.teamIdx);
    for (const day of days) {
      if (chance(0.06)) continue; // leave / absent
      const total = Math.min(WORKDAY_HOURS, round025(WORKDAY_HOURS * person.load * (0.7 + rand() * 0.5)));
      if (total <= 0) continue;
      const split = chance(0.3) && teamProcs.length > 1;
      const first = processes[person.primary];
      const second = pick(teamProcs.filter((p) => p.id !== first.id).concat(first));
      const parts = split ? [[first, round025(total * 0.6)], [second, round025(total * 0.4)]] as const : ([[first, total]] as const);
      const seen = new Set<string>();
      for (const [proc, hrs] of parts) {
        if (hrs <= 0 || seen.has(proc.id)) continue;
        seen.add(proc.id);
        entries.push({ associateId: person.assocId, processId: proc.id, entryDate: day, hours: hrs, enteredBy: person.userId });
      }
      if (day === days[days.length - 1]) lastDayLoad.set(person.assocId, total);
    }
  }
  await prisma.timeEntry.createMany({ data: entries, skipDuplicates: true });

  // Bandwidth cache = free hours on the latest day
  for (const person of people) {
    const used = lastDayLoad.get(person.assocId) ?? 0;
    await prisma.associate.update({
      where: { id: person.assocId },
      data: { bandwidthCache: Math.max(0, WORKDAY_HOURS - used), bandwidthUpdatedAt: new Date() },
    });
  }

  // Sample cross-utilization requests in various states
  const requestDefs: { name: string; status: "Pending" | "Approved" | "Active" | "Completed" | "Rejected"; proc: number; just: string }[] = [
    { name: "Spring Launch Retouch Surge", status: "Pending", proc: 0, just: "Seasonal volume spike needs extra retouch capacity for two weeks." },
    { name: "Annotation Backlog Burn-down", status: "Approved", proc: 4, just: "Backlog exceeds SLA; borrowing trained annotators from adjacent teams." },
    { name: "Compliance Audit Prep", status: "Active", proc: 3, just: "Annual audit window; need extra reviewers with policy experience." },
    { name: "Design System Migration", status: "Completed", proc: 6, just: "Short-term help migrating legacy layouts to the new system." },
    { name: "Escalation Coverage", status: "Rejected", proc: 9, just: "Temporary coverage for escalations during a staffing gap." },
    { name: "Video Cutdowns Sprint", status: "Pending", proc: 1, just: "Need editors for a one-week cutdown sprint." },
  ];
  for (const [i, def] of requestDefs.entries()) {
    const requestor = managerUsers[i % managerUsers.length];
    const start = new Date(); start.setUTCDate(start.getUTCDate() + (def.status === "Completed" ? -30 : def.status === "Active" ? -3 : 5));
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 10);
    const req = await prisma.resourceRequest.create({
      data: {
        referenceNumber: `DEMO-${String(1000 + i)}`, requestorId: requestor.id, projectName: def.name,
        targetProcessId: processes[def.proc].id, startDate: start, endDate: end, hoursPerDay: pick([2, 4, 6]),
        businessJustification: def.just, status: def.status, isDraft: false, submittedAt: new Date(),
      },
    });
    const matches = people.filter((p) => p.teamIdx !== PROCESSES[def.proc][2]).slice(i * 2, i * 2 + 3);
    for (const m of matches) {
      await prisma.requestAssociate.create({
        data: {
          requestId: req.id, associateId: m.assocId,
          approvalStatus: def.status === "Pending" ? "Pending" : def.status === "Rejected" ? "Rejected" : "Approved",
          rejectionReason: def.status === "Rejected" ? "Team capacity needed for current commitments." : null,
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log(`  ${people.length} associates, ${managerUsers.length} managers, ${leaders.length} leaders, ${entries.length} time entries`);
  console.log(`  Demo logins (PIN ${DEMO_PIN}):`);
  console.log(`    admin@${DOMAIN}      (Admin)`);
  console.log(`    leader@${DOMAIN}     (Senior Leader)`);
  console.log(`    manager@${DOMAIN}    (Manager)`);
  console.log(`    associate@${DOMAIN}  (Associate)`);
  void admin;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
