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
    .option("-o, --output <dir>", "output directory for git-compatible files")
    .action(async (args: {dr: boolean, output?: string})=> {
      const baseProject = args.dr ? Project.Dragonrealms : Project.Gemstone
      const project = args.output ?
        new Project.Project({world: baseProject.world, outputDir: args.output}) :
        baseProject

      if (args.output) {
        await project.gitSetup()
      }

      const then = performance.now()
      const spinner = ora()
      const outputLocation = args.output || project.route("/")
      spinner.start(`seeding git version at mapdb at ${project.route("/map.json")} -> ${outputLocation}...`)
      const operations = await Tasks.git({project, spinner})
      const runtime = Math.round(performance.now() - then)
      spinner.succeed(`[${runtime}ms] created=${operations.created} skipped=${operations.skipped} updated=${operations.updated} errors=${operations.errors.length}`)
      if (operations.errors.length) {
        operations.errors.forEach(({err, file})=> {
          console.log(err)
        })
      }
      process.exit(0)
    })

program.command("validate-files")
  .alias("vf")
  .description("validate specific room files")
  .option("--dr", "run in dragonrealms mode", false)
  .option("--json", "output errors in JSON format", false)
  .argument("<files...>", "room.json file paths to validate")
  .action(async (files: string[], args: {dr: boolean, json: boolean}) => {
    const then = performance.now()
    const spinner = ora()
    
    spinner.start(`validating ${files.length} room files...`)
    
    try {
      const results = await Tasks.validateFiles({files, json: args.json})
      const runtime = Math.round(performance.now() - then)
      
      if (results.errors.length === 0) {
        spinner.succeed(`[${runtime}ms] validated ${results.validFiles} files`)
        process.exit(0)
      } else {
        spinner.fail(`[${runtime}ms] found ${results.errors.length} validation errors`)
        
        if (args.json) {
          console.log(JSON.stringify(results, null, 2))
        } else {
          console.table(results.errors)
        }
        process.exit(1)
      }
    } catch (error: any) {
      const runtime = Math.round(performance.now() - then)
      spinner.fail(`[${runtime}ms] ${error.message}`)
      process.exit(1)
    }
  })

program.command("reconstruct")
  .alias("r")
  .description("reconstruct a mapdb.json file from git directory structure")
  .option("--dr", "run in dragonrealms mode", false)
  .option("-i, --input <dir>", "input git directory containing room files")
  .option("-o, --output <file>", "output file path for reconstructed mapdb.json")
  .action(async (args: {dr: boolean, input?: string, output?: string})=> {
    const baseProject = args.dr ? Project.Dragonrealms : Project.Gemstone

    if (!args.input) {
      console.error("Error: --input directory is required")
      process.exit(1)
    }

    if (!args.output) {
      console.error("Error: --output file path is required")
      process.exit(1)
    }

    const project = new Project.Project({world: baseProject.world})
    const then = performance.now()
    const spinner = ora()

    try {
      spinner.start(`reconstructing mapdb from ${args.input}...`)
      const results = await Tasks.reconstruct({
        project,
        spinner,
        gitDir: args.input,
        outputFile: args.output
      })

      const runtime = Math.round(performance.now() - then)

      if (results.errors.length === 0) {
        spinner.succeed(`[${runtime}ms] reconstructed ${results.roomsProcessed} rooms to ${args.output}`)
        process.exit(0)
      } else {
        spinner.succeed(`[${runtime}ms] reconstructed ${results.roomsProcessed} rooms with ${results.errors.length} errors`)
        console.log("\nErrors encountered:")
        results.errors.forEach(({err, file}) => {
          console.log(`${file}: ${err}`)
        })
        process.exit(0)
      }
    } catch (error: any) {
      const runtime = Math.round(performance.now() - then)
      spinner.fail(`[${runtime}ms] ${error.message}`)
      process.exit(1)
    }
  })

program.parse()