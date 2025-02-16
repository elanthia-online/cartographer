import {type Project} from "../project"
import { validate } from "./validate"

export interface SeedOptions {
  project: Project;
}

export async function seed (options : SeedOptions) {
  const {errors, rooms} = await validate(options)
}