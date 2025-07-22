import * as z from "zod"
import { ClimateValidator } from "./climate"
import { TerrainValidator } from "./terrain"

export const TimetoValidator = z.record(
    z.string(),
    z.union([z.number(), z.string(), z.null()])
)

export const PathsValidator = z.union([
    z.array(z.string()),
    z.null(),
    //z.string(),
]).optional()

export const BackendIdValidator = z.union([
    z.array(z.number()),
    z.null()
]).optional()

export const RoomValidator = z.object({
    "id": z.number(),
    "title": z.union([z.array(z.string()), z.null()]).optional(),
    "description": z.union([z.array(z.string()), z.null()]).optional(),
    "paths": PathsValidator,
    "location": z.union([z.boolean(), z.null(), z.string()]).optional(),
    "climate": z.union([ClimateValidator, z.null()]).optional(),
    "terrain": z.union([TerrainValidator, z.null()]).optional(),
    "wayto": z.record(z.string(), z.string()),
    "timeto": TimetoValidator,
    "tags": z.union([z.array(z.string()), z.null()]).optional(),
    "uid": BackendIdValidator,
    "image": z.union([z.null(), z.string()]).optional(),
    "image_coords": z.union([z.array(z.number()), z.null()]).optional(),
    "check_location": z.union([z.boolean(), z.null()]).optional(),
    "unique_loot": z.union([z.array(z.string()), z.null()]).optional(),
})