import { foreignKey, integer, pgTable, serial, text, unique } from "drizzle-orm/pg-core";
import { facilityType } from "../../enum/schema.enum";
import { districts } from "../districts/schema";

export const facilities = pgTable("facilities", {
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
    facilityType: facilityType("facility_type").notNull(),
    districtId: integer("district_id").notNull(),
  }, (table) => [
    foreignKey({
      columns: [table.districtId],
      foreignColumns: [districts.id],
      name: "facilities_district_id_fkey"
    }),
    unique("facilities_name_district_id_key").on(table.name, table.districtId),
  ])