import {Project} from "../project"
import { Room } from "../room/room"
import { fromError } from 'zod-validation-error'

export interface ValidateConfig {
  project: Project;
}

export interface RoomValidationError {
  title: string;
  id: number;
  error: string;
}

export async function validate (config : ValidateConfig) {
  const rooms = await config.project.read("/map.json").json()
  const errors = [] as Array<RoomValidationError>
  const validated = [] as Array<Room>
  for (const pending of rooms) {
    try {
      validated.push(Room.validate(pending))
    } catch (err : any) {
      const humanized = fromError(err)
      errors.push({title: pending.title[0], id: pending.id, error: humanized.toString()})
    }
  }

  return {errors, rooms: validated}
}