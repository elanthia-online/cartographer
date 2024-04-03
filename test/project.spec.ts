import { expect, test } from "bun:test";
import * as Project from "../mapdb/project"

test("project can be initialized", async ()=> {
  await Project.setup()
})