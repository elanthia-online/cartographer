import * as Project from "../project"
import { RoomList } from "../schema/room"
import ora from "ora"
import type { ZodIssue } from "zod"


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
  const runtime = performance.now() - then
  if (result.success) {
    return spinner.succeed(`validated ${rooms.length} rooms in ${runtime}ms`)
  }

  spinner.fail(`found ${result.error.errors.length} errors in ${file}`)
  const errorTable = Object.entries(result.error.flatten((issue: ZodIssue) => ({
    path: issue.path,
    message: issue.message,
    errorCode: issue.code,
  })).fieldErrors).flatMap(([room, errors])=> {
    return errors?.map(err => {
      const humanized = {room, path: err.path.join("."), message: err.message}
      return humanized
    })
  })

  console.table(errorTable)
  throw new Error(`${file} is invalid`)
}