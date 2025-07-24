import * as fs from "node:fs/promises"
import { Room } from "../room/room"
import { fromError } from 'zod-validation-error'

export interface ValidateMapdbConfig {
  filePath: string;
}

export interface RoomValidationError {
  title: string;
  id: number;
  error: string;
}

export interface ValidateMapdbResult {
  errors: RoomValidationError[];
  rooms: Room[];
}

export async function validateMapdb(config: ValidateMapdbConfig): Promise<ValidateMapdbResult> {
  const { filePath } = config
  const errors: RoomValidationError[] = []
  const validatedRooms: Room[] = []

  try {
    // Read and parse the mapdb.json file
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const rooms = JSON.parse(fileContent)

    if (!Array.isArray(rooms)) {
      throw new Error('Invalid mapdb.json format: expected an array of rooms')
    }

    // Validate each room in the file
    for (const pending of rooms) {
      try {
        const validatedRoom = await Room.validate(pending)
        validatedRooms.push(validatedRoom)
      } catch (err: any) {
        let errorMessage = err.message
        
        // If it's a Zod validation error, make it more readable
        if (err.name === 'ZodError') {
          const humanized = fromError(err)
          errorMessage = humanized.toString()
        }

        errors.push({
          title: pending.title?.[0] || 'Unknown',
          id: pending.id || 0,
          error: errorMessage
        })
      }
    }

    return { errors, rooms: validatedRooms }

  } catch (error: any) {
    // File reading or parsing error
    throw new Error(`Failed to read or parse ${filePath}: ${error.message}`)
  }
}