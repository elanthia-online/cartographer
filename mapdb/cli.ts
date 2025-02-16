#!/usr/bin/env bun
import ora from "ora"
import { program } from "commander"
import * as Tasks from "./tasks"
import * as Project from "./project"

program.command("download")
  .alias("dl")
  .option("--world <world>", "the url to download a mapdb json file from", "gs")
  .description("download a mapdb json file to your local tmp dir")
  .action(async (args : {world : string})=> {
    const spinner = ora()
    const project = args.world == "gs" ? Project.GemstoneTemporary : Project.DragonrealmsTemporary
    spinner.start(`downloading ${project.remoteMap} to ${project.map}`)
    try {
      const {mb, location} = await Tasks.download({project})
      spinner.succeed(`mapdb of ${mb}mb successfully downloaded to ${location}`)
    } catch (err : any) {
      spinner.fail(err.message)
      throw err
    }
  })

program.command("validate")
  .alias("v")
  .description("validate a mapdb in the local tmp dir")
  .option("--world <world>", "the world to use as a context", "gs")
  .action(async (args : {world: string}) => {
    const project = args.world == "gs" ? Project.GemstoneTemporary : Project.DragonrealmsTemporary
    const then = performance.now()
    const spinner = ora()
    spinner.start(`validating mapdb at ${project.map}...`)
    const {rooms, errors} = await Tasks.validate({project})
    const runtime = Math.round(performance.now() - then)

    if (errors.length == 0) {
      spinner.succeed(`[${runtime}ms] validated ${rooms.length} rooms`)
      return process.exit(0)
    }
    spinner.clear()
    console.table(errors)
    spinner.fail(`[${runtime}ms] found ${errors.length} issues in ${project.map}`)

    process.exit(1)
  })

program.parse()