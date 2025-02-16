import * as Project from "../project"
import { RoomList, RoomSchema } from "../schema/room"
import ora from "ora"
import * as _ from "underscore"
import { fromZodIssue, type ZodError, fromError } from 'zod-validation-error'


export async function load (file : string) : Promise<Array<{id: string}>> {
  return await Project.readJSON(file)
}

export async function validate (file : string) {
  const db = Project.asset(file)
  const spinner = ora()
  spinner.start(`validating mapdb at ${db}...`)
  const rooms = await load(file)
  const then = performance.now()
  const result =  await RoomList.safeParseAsync(rooms)
  const errors = [] as Record<string, string>[]
  for (const room of rooms) {
    try {
      const result = RoomSchema.parse(room)
    } catch (err : any) {
      const humanized = fromError(err)
      errors.push({id: room.id, error: humanized.toString()})
    }
  }
  const runtime = performance.now() - then
  if (errors.length == 0) {
    return spinner.succeed(`[${runtime}ms] validated ${rooms.length} rooms`)
  }

  spinner.fail(`[${runtime}ms] found ${errors.length} errors in ${file}`)
  console.table(errors)

  throw new Error(`${file} is invalid`)
}