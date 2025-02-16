#!/usr/bin/env bun
import ora from "ora"
import { program } from "commander"
import * as Tasks from "./tasks"
import * as Project from "./project"

program.command("download")
  .alias("dl")
  .option("--url <url>", "the url to download a mapdb json file from", "https://github.com/FarFigNewGut/lich_repo_mirror/raw/main/gs_map/gs_map.json")
  .option("--to <file>", "the file to download the mapdb to", "gemstone.json")
  .description("download a mapdb json file to your local tmp dir")
  .action(async (args)=> {
    const spinner = ora()
    spinner.start(`downloading ${args.url} to ${Project.asset(args.to)}`)
    try {
      const {mb, location} = await Tasks.download({url: args.url, to: args.to})
      spinner.succeed(`mapdb of ${mb}mb successfully downloaded to ${location}`)
    } catch (err : any) {
      spinner.fail(err.message)
      throw err
    }
  })

program.command("validate")
  .alias("v")
  .description("validate a mapdb in the local tmp dir")
  .option("--file <file>", "the local database to validate")
  .action(async args => {
    const db = Project.asset(args.file)
    const then = performance.now()
    const spinner = ora()
    spinner.start(`validating mapdb at ${db}...`)
    const {rooms, errors} = await Tasks.validate(args.file)
    const runtime = Math.round(performance.now() - then)

    if (errors.length == 0) {
      spinner.succeed(`[${runtime}ms] validated ${rooms.length} rooms`)
      return process.exit(0)
    }
    spinner.clear()
    console.table(errors)
    spinner.fail(`[${runtime}ms] found ${errors.length} issues in ${db}`)

    process.exit(1)
  })

program.parse()