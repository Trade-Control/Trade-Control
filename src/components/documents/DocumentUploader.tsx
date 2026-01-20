'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadDocument } from '@/actions/documents'
import { useRouter } from 'next/navigation'

export default function DocumentUploader({ jobId, organizationId }: { jobId: string, organizationId: string }) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (!file) return

    setError('')
    setUploading(true)

    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const filePath = `${organizationId}/${jobId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        setError('Failed to upload file')
        setUploading(false)
        return
      }

      // Save metadata to database
      const result = await uploadDocument({
        job_id: jobId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
      })

      if (result.error) {
        setError(result.error)
        setUploading(false)
        return
      }

      setUploading(false)
      router.refresh()
    } catch (err) {
      console.error('Upload error:', err)
      setError('An unexpected error occurred')
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          dragActive ? 'border-primary bg-blue-50' : 'border-gray-300'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />
        
        <label
          htmlFor="file-upload"
          className="cursor-pointer"
        >
          <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          
          {uploading ? (
            <p className="text-gray-600">Uploading...</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-gray-500 mt-1">
                PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 10MB)
              </p>
            </>
          )}
        </label>
      </div>
    </div>
  )
}
