import * as z from "zod"
import { ClimateSchema } from "./climate"
import { TerrainSchema } from "./terrain"

export const TimetoSchema = z.record(
    z.string(),
    z.union([z.number(), z.string(), z.null()])
)

export const RoomSchema = z.object({
    "id": z.number(),
    "title": z.union([z.array(z.string()), z.null()]).optional(),
    "description": z.union([z.array(z.string()), z.null()]).optional(),
    "paths": z.union([z.array(z.string()), z.null()]).optional(),
    "location": z.union([z.boolean(), z.null(), z.string()]).optional(),
    "climate": z.union([ClimateSchema, z.null()]).optional(),
    "terrain": z.union([TerrainSchema, z.null()]).optional(),
    "wayto": z.record(z.string(), z.string()),
    "timeto": TimetoSchema,
    "tags": z.union([z.array(z.string()), z.null()]).optional(),
    "uid": z.union([z.array(z.number()), z.null()]).optional(),
    "image": z.union([z.null(), z.string()]).optional(),
    "image_coords": z.union([z.array(z.number()), z.null()]).optional(),
    "check_location": z.union([z.boolean(), z.null()]).optional(),
    "unique_loot": z.union([z.array(z.string()), z.null()]).optional(),
})
export type Room = z.infer<typeof RoomSchema>

export const RoomList = z.array(RoomSchema)
