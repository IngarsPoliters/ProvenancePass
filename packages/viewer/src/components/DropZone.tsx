import React, { useCallback, useState } from 'react'

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void
}

export function DropZone({ onFilesDropped }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onFilesDropped(files)
    }
  }, [onFilesDropped])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onFilesDropped(files)
    }
  }, [onFilesDropped])

  const handleClick = useCallback(() => {
    const input = document.getElementById('file-input') as HTMLInputElement
    input?.click()
  }, [])

  return (
    <>
      <div 
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="dropzone-icon">📁</div>
        <h3>Drop files here to verify</h3>
        <p>
          Drag and drop media files (PNG, JPEG, PDF, DOCX) or passport files
        </p>
        <small>
          Supports C2PA-embedded provenance and *.passport.json sidecar files<br/>
          You can drop multiple files to pair them automatically
        </small>
      </div>
      
      <input
        id="file-input"
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.pdf,.docx,.json"
        onChange={handleFileInput}
        className="file-input"
      />
    </>
  )
}