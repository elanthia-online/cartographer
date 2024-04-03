import * as z from "zod"
export const ClimateSchema = z.enum([
    "arid",
    "arid, temperate",
    "cold, damp",
    "cold, dry",
    "",
    "freshwater",
    "glacial",
    "hot, damp",
    "humid",
    "moist",
    "none",
    "saltwater",
    "snowy, arctic",
    "temperate",
])
export type Climate = z.infer<typeof ClimateSchema>
