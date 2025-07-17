import type { Ora } from "ora";
import { type Project } from "../project"
import { type GitRoom, type ValidRoom } from "../room/room";
import * as fs from "node:fs/promises"
import path from "path"

/**
 * Configuration for reconstructing mapdb from git directory
 * @interface ReconstructConfig
 * @property {Project} project - Project instance containing configuration
 * @property {string} gitDir - Directory containing git-structured room files
 * @property {string} outputFile - Path to write the reconstructed mapdb.json
 */
export interface ReconstructConfig {
  project: Project;
  spinner: Ora;
  gitDir: string;
  outputFile: string;
}

/**
 * Results of the reconstruction operation
 */
export interface ReconstructResults {
  roomsProcessed: number;
  errors: Array<{err: string, file: string}>;
}

/**
 * Reconstructs a mapdb.json file from git directory structure
 * @param {ReconstructConfig} config - Configuration object for the operation
 * @returns {Promise<ReconstructResults>} Results of the reconstruction
 */
export async function reconstruct(config: ReconstructConfig): Promise<ReconstructResults> {
  const { project, spinner, gitDir, outputFile } = config
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
    spinner.text = "Writing reconstructed mapdb.json..."
    const roomsArray = Object.values(rooms)
    const mapdbContent = JSON.stringify(roomsArray, null, 2)
    
    await fs.writeFile(outputFile, mapdbContent, 'utf-8')
    
    return {
      roomsProcessed: roomsArray.length,
      errors
    }

  } catch (error: any) {
    throw new Error(`Reconstruction failed: ${error.message}`)
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