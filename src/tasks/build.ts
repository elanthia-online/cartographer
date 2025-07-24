import type { Ora } from "ora";
import { type Project } from "../project"
import { type GitRoom, type ValidRoom, Room } from "../room/room";
import * as fs from "node:fs/promises"
import path from "path"

/**
 * Configuration for building mapdb from git directory
 * @interface BuildConfig
 * @property {Project} project - Project instance containing configuration
 * @property {string} gitDir - Directory containing git-structured room files
 * @property {string} outputFile - Path to write the built mapdb.json
 * @property {string} outputDir - Directory to write userland format (when userland=true)
 * @property {boolean} userland - Whether to build in userland format with bundled StringProcs
 */
export interface BuildConfig {
  project: Project;
  spinner: Ora;
  gitDir: string;
  outputFile?: string;  // Required when userland=false
  outputDir?: string;   // Required when userland=true
  userland?: boolean;
}

/**
 * Results of the build operation
 */
export interface BuildResults {
  roomsProcessed: number;
  errors: Array<{err: string, file: string}>;
}

/**
 * Builds a mapdb.json file from git directory structure
 * @param {BuildConfig} config - Configuration object for the operation
 * @returns {Promise<BuildResults>} Results of the build
 */
export async function build(config: BuildConfig): Promise<BuildResults> {
  if (config.userland) {
    return await buildUserland(config)
  } else {
    return await buildStandard(config)
  }
}

/**
 * Builds standard mapdb.json file from git directory structure
 * @param {BuildConfig} config - Configuration object for the operation
 * @returns {Promise<BuildResults>} Results of the build
 */
async function buildStandard(config: BuildConfig): Promise<BuildResults> {
  const { project, spinner, gitDir, outputFile } = config
  
  if (!outputFile) {
    throw new Error("outputFile is required for standard build")
  }
  
  const errors: Array<{err: string, file: string}> = []
  const rooms: Record<string, ValidRoom> = {}

  spinner.text = "Scanning git directory for room files..."

  try {
    // Find all room.json files in the git directory
    const roomFiles = await findRoomFiles(gitDir)
    spinner.text = `Found ${roomFiles.length} room files, processing...`

    for (let i = 0; i < roomFiles.length; i++) {
      const roomFile = roomFiles[i]
      const progress = Math.round(((i + 1) / roomFiles.length) * 100)
      spinner.text = `Processing room files... ${i + 1}/${roomFiles.length} [${progress}%]`

      try {
        // Read the git room file
        const fileContent = await fs.readFile(roomFile, 'utf-8')
        const gitRoom: GitRoom = JSON.parse(fileContent)
        
        // Extract the room data and use room ID as key
        const roomId = gitRoom.room.id.toString()
        rooms[roomId] = gitRoom.room

      } catch (error: any) {
        errors.push({
          err: `Failed to process room file: ${error.message}`,
          file: roomFile
        })
      }
    }

    // Convert rooms object to array and write to output file
    spinner.text = "Writing built mapdb.json..."
    const roomsArray = Object.values(rooms)
    const mapdbContent = JSON.stringify(roomsArray, null, 2)
    
    await fs.writeFile(outputFile, mapdbContent, 'utf-8')
    
    return {
      roomsProcessed: roomsArray.length,
      errors
    }

  } catch (error: any) {
    throw new Error(`Standard build failed: ${error.message}`)
  }
}

/**
 * Recursively finds all room.json files in the git directory
 * @param gitDir - Root directory to search
 * @returns Array of file paths to room.json files
 */
async function findRoomFiles(gitDir: string): Promise<string[]> {
  const roomFiles: string[] = []
  
  async function scanDirectory(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          await scanDirectory(fullPath)
        } else if (entry.isFile() && entry.name === 'room.json') {
          roomFiles.push(fullPath)
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await scanDirectory(gitDir)
  return roomFiles
}

/**
 * Builds mapdb in userland format with bundled StringProcs for cartographer.lic
 * Creates both mapdb.json with Cartographer.evaluate_script() references and stringprocs/ directory
 * @param {BuildConfig} config - Configuration object for the operation
 * @returns {Promise<BuildResults>} Results of the build
 */
async function buildUserland(config: BuildConfig): Promise<BuildResults> {
  const { project, spinner, gitDir, outputDir } = config
  
  if (!outputDir) {
    throw new Error("outputDir is required for userland build")
  }
  const errors: Array<{err: string, file: string}> = []
  const rooms: ValidRoom[] = []
  const stringProcFiles: Array<{path: string, content: string}> = []

  spinner.text = "Scanning git directory for room and StringProc files..."

  try {
    // Find all room.json files in the git directory
    const roomFiles = await findRoomFiles(gitDir)
    spinner.text = `Found ${roomFiles.length} room files, processing for userland format...`

    // Process each room file
    for (let i = 0; i < roomFiles.length; i++) {
      const roomFile = roomFiles[i]
      const progress = Math.round(((i + 1) / roomFiles.length) * 100)
      spinner.text = `Processing rooms for userland format... ${i + 1}/${roomFiles.length} [${progress}%]`

      try {
        // Read the git room file
        const fileContent = await fs.readFile(roomFile, 'utf-8')
        const gitRoom: GitRoom = JSON.parse(fileContent)
        
        // Create a Room instance in userland mode to generate Cartographer.evaluate_script() references
        const room = new Room(gitRoom.room, true) // true = userland mode
        rooms.push(room.validated)

        // Collect StringProc files for this room
        for (const proc of room.stringprocs) {
          stringProcFiles.push({
            path: proc.userlandPath,
            content: proc.ruby
          })
        }

      } catch (error: any) {
        errors.push({
          err: `Failed to process room file: ${error.message}`,
          file: roomFile
        })
      }
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    // Write mapdb.json with Cartographer.evaluate_script() references
    spinner.text = "Writing userland mapdb.json..."
    const mapdbContent = JSON.stringify(rooms, null, 2)
    const mapdbPath = path.join(outputDir, 'mapdb.json')
    await fs.writeFile(mapdbPath, mapdbContent, 'utf-8')

    // Create stringprocs directory structure and write StringProc files
    spinner.text = "Writing StringProc files..."
    const stringProcsDir = path.join(outputDir, 'stringprocs')
    await fs.mkdir(stringProcsDir, { recursive: true })
    await fs.mkdir(path.join(stringProcsDir, 'wayto'), { recursive: true })
    await fs.mkdir(path.join(stringProcsDir, 'timeto'), { recursive: true })

    for (const proc of stringProcFiles) {
      const fullPath = path.join(stringProcsDir, proc.path)
      await fs.writeFile(fullPath, proc.content, 'utf-8')
    }
    
    return {
      roomsProcessed: rooms.length,
      errors
    }

  } catch (error: any) {
    throw new Error(`Userland build failed: ${error.message}`)
  }
}