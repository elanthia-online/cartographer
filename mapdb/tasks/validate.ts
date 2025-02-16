import {Project} from "../project"
import { RoomSchema } from "../schema/room"
import * as _ from "underscore"
import { fromError } from 'zod-validation-error'

export interface ValidateConfig {
  project: Project;
}

export async function validate (config : ValidateConfig) {
  const rooms = await config.project.readMap()
  const errors = [] as Record<string, string>[]
  const validated = [] as Array<ReturnType<typeof RoomSchema.parse>>
  for (const room of rooms) {
    try {
      const result = RoomSchema.parse(room)
      validated.push(result)
    } catch (err : any) {
      const humanized = fromError(err)
      errors.push({id: room.id, error: humanized.toString()})
    }
  }

  return {errors, rooms: validated}
}