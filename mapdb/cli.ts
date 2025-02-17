#!/usr/bin/env bun
import ora from "ora"
import { program } from "commander"
import * as Tasks from "./tasks"
import * as Project from "./project"

program.command("download")
  .alias("dl")
  .description("download a mapdb json file to your local tmp dir")
  .option("--dr", "run in dragonrealms mode", false)
  .action(async (args: {dr: boolean})=> {
    const project = args.dr ? Project.Dragonrealms : Project.Gemstone
    const spinner = ora()
    spinner.start(`downloading ${project.remoteMap} to ${project.route("/map.json")}`)
    try {
      const {mb} = await Tasks.download({project})
      spinner.succeed(`mapdb of ${mb}mb successfully downloaded`)
    } catch (err : any) {
      spinner.fail(err.message)
      throw err
    }
  })

program.command("validate")
  .alias("v")
  .description("validate a mapdb in the local tmp dir")
  .option("--dr", "run in dragonrealms mode", false)
  .action(async (args: {dr: boolean})=> {
    const project = args.dr ? Project.Dragonrealms : Project.Gemstone
    const then = performance.now()
    const spinner = ora()
    spinner.start(`validating mapdb at ${project.route("/map.json")}...`)
    const {rooms, errors} = await Tasks.validate({project})
    const runtime = Math.round(performance.now() - then)

    if (errors.length == 0) {
      spinner.succeed(`[${runtime}ms] validated ${rooms.length} rooms`)
      return process.exit(0)
    }
    spinner.clear()
    console.table(errors)
    spinner.fail(`[${runtime}ms] found ${errors.length} issues`)

    process.exit(1)
  })

  program.command("git")
    .description("outputs the mapdb on the file system that is useful for git")
    .option("--dr", "run in dragonrealms mode", false)
    .action(async (args: {dr: boolean})=> {
      const project = args.dr ? Project.Dragonrealms : Project.Gemstone
      const then = performance.now()
      const spinner = ora()
      spinner.start(`seeding git version at mapdb at ${project.route("/map.json")}...`)
      const operations = await Tasks.git({project})
      const runtime = Math.round(performance.now() - then)
      spinner.succeed(`[${runtime}ms] created=${operations.created} skipped=${operations.skipped} updated=${operations.updated} errored=${operations.errored}`)
      process.exit(0)
    })

program.parse()