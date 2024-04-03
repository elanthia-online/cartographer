import * as z from "zod"
export const TerrainSchema = z.enum([
    "barren scrub",
    "coniferous",
    "coniferous forest",
    "cultivated",
    "deciduous",
    "deciduous forest",
    "",
    "grassland",
    "hard, flat",
    "hilly",
    "mountainous",
    "muddy wetlands",
    "none",
    "plain dirt",
    "riparian",
    "rough",
    "sandy",
    "subterranean",
    "tropical",
]);
export type Terrain = z.infer<typeof TerrainSchema>;

