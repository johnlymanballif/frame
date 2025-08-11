import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./db";
import { organizations, users, clients, projects, tasks } from "./db/schema";

export async function seedDatabase() {
  try {
    console.log("Seeding database...");
    console.log("Database URL:", process.env.DATABASE_URL);

    // Create demo organization
    const [org] = await db
      .insert(organizations)
      .values({
        name: "Frame Design Studio",
        timezone: "America/New_York",
        weekStart: "Mon",
      })
      .returning();

    // Create demo users
    const [owner] = await db
      .insert(users)
      .values({
        orgId: org.id,
        name: "John Owner",
        email: "owner@demo.com",
        role: "owner",
        costRateCents: 8000, // $80/hour
      })
      .returning();

    const [manager] = await db
      .insert(users)
      .values({
        orgId: org.id,
        name: "Sarah Manager",
        email: "manager@demo.com",
        role: "manager",
        costRateCents: 6000, // $60/hour
      })
      .returning();

    const [member] = await db
      .insert(users)
      .values({
        orgId: org.id,
        name: "Mike Designer",
        email: "designer@demo.com",
        role: "member",
        costRateCents: 5000, // $50/hour
      })
      .returning();

    // Create demo clients
    const [acmeClient] = await db
      .insert(clients)
      .values({
        orgId: org.id,
        name: "ACME Corp",
      })
      .returning();

    const [techClient] = await db
      .insert(clients)
      .values({
        orgId: org.id,
        name: "TechStart Inc",
      })
      .returning();

    // Create demo projects
    const [acmeProject] = await db
      .insert(projects)
      .values({
        orgId: org.id,
        clientId: acmeClient.id,
        name: "ACME Website Redesign",
        budgetType: "amount",
        budgetValue: 5000000, // $50,000
        defaultBillRateCents: 10000, // $100/hour
      })
      .returning();

    const [techProject] = await db
      .insert(projects)
      .values({
        orgId: org.id,
        clientId: techClient.id,
        name: "TechStart Brand Identity",
        budgetType: "hours",
        budgetValue: 120, // 120 hours
        defaultBillRateCents: 12000, // $120/hour
      })
      .returning();

    // Create demo tasks
    await db.insert(tasks).values([
      {
        orgId: org.id,
        projectId: acmeProject.id,
        name: "Homepage Design",
      },
      {
        orgId: org.id,
        projectId: acmeProject.id,
        name: "User Research",
      },
      {
        orgId: org.id,
        projectId: acmeProject.id,
        name: "Wireframes",
      },
      {
        orgId: org.id,
        projectId: techProject.id,
        name: "Logo Design",
      },
      {
        orgId: org.id,
        projectId: techProject.id,
        name: "Brand Guidelines",
      },
      {
        orgId: org.id,
        projectId: techProject.id,
        name: "Marketing Materials",
      },
    ]);

    console.log("Database seeded successfully!");
    console.log(`Demo organization: ${org.name} (ID: ${org.id})`);
    console.log(`Demo users created:`);
    console.log(`- Owner: ${owner.email}`);
    console.log(`- Manager: ${manager.email}`);
    console.log(`- Member: ${member.email}`);
    console.log(`Demo projects created: ${acmeProject.name}, ${techProject.name}`);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Allow running this script directly
if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}