import ora from "ora"
import * as Project from "../project"
export async function download ({url}: {url: string}) {
  const spinner = ora()
  spinner.start(`downloading ${url}...`)
  try {
    await Project.setup()
    const db = await fetch(url)
    if (!db.ok) {
      throw new Error(`error fetching > status=${db.statusText} ${url}`)
    }
    const {location, write, stats} = await Project.write("mapdb.json", await db.text())
    const mb = (stats.size / Math.pow(2, 20)).toFixed(2)
    spinner.succeed(`mapdb of ${mb}mb successfully downloaded to ${location}`)
  } catch (err : any) {
    spinner.fail(err.message)
  }
}