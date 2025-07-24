import * as fs from "node:fs/promises"
import { Room } from "../room/room"
import { fromError } from 'zod-validation-error'

export interface ValidateFilesConfig {
  files: string[];
  json: boolean;
}

export interface FileValidationError {
  file: string;
  id?: number;
  title?: string;
  error: string;
}

export interface ValidateFilesResult {
  validFiles: number;
  errors: FileValidationError[];
  files: string[];
}

export async function validateFiles(config: ValidateFilesConfig): Promise<ValidateFilesResult> {
  const { files } = config
  const errors: FileValidationError[] = []
  let validFiles = 0

  for (const file of files) {
    try {
      // Read the git room file
      const fileContent = await fs.readFile(file, 'utf-8')
      const gitRoom = JSON.parse(fileContent)
      
      // Extract room data - handle both GitRoom format and direct room format
      const roomData = gitRoom.room || gitRoom
      
      // Validate using Room class
      await Room.validate(roomData)
      validFiles++
      
    } catch (error: any) {
      let errorMessage = error.message
      let roomId: number | undefined
      let roomTitle: string | undefined
      
      // Try to extract room info even if validation failed
      try {
        const fileContent = await fs.readFile(file, 'utf-8')
        const gitRoom = JSON.parse(fileContent)
        const roomData = gitRoom.room || gitRoom
        roomId = roomData.id
        roomTitle = roomData.title?.[0]
      } catch {
        // Ignore errors when trying to extract room info
      }
      
      // If it's a Zod validation error, make it more readable
      if (error.name === 'ZodError') {
        const humanized = fromError(error)
        errorMessage = humanized.toString()
      }
      
      errors.push({
        file,
        id: roomId,
        title: roomTitle,
        error: errorMessage
      })
    }
  }

  return {
    validFiles,
    errors,
    files
  }
}