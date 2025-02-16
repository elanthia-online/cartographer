import * as Project from "../project"
import { RoomSchema } from "../schema/room"
import * as _ from "underscore"
import { fromError } from 'zod-validation-error'


export async function load (file : string) : Promise<Array<{id: string}>> {
  return await Project.readJSON(file)
}

export async function validate (file : string) {
  const rooms = await load(file)
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