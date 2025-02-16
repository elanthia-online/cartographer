import { test } from "bun:test"
import {GemstoneTemporary, DragonrealmsTemporary} from "../mapdb/project"

test("project can be initialized", async ()=> {
  await GemstoneTemporary.setup()
  await DragonrealmsTemporary.setup()
})