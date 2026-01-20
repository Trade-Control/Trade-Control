'use client'

import { useState } from 'react'
import { deleteDocument, getDocumentDownloadUrl } from '@/actions/documents'
import { useRouter } from 'next/navigation'

export default function DocumentList({ documents, canDelete }: { documents: any[], canDelete: boolean }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = async (document: any) => {
    const result = await getDocumentDownloadUrl(document.file_path)
    if (result.success && result.url) {
      window.open(result.url, '_blank')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    setDeleting(id)
    const result = await deleteDocument(id)
    
    if (result.error) {
      alert(result.error)
      setDeleting(null)
      return
    }

    router.refresh()
    setDeleting(null)
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No documents uploaded yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {documents.map((doc: any) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {doc.file_name}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{formatFileSize(doc.file_size)}</span>
                <span>•</span>
                <span>Uploaded by {doc.uploaded_by_user?.first_name} {doc.uploaded_by_user?.last_name}</span>
                <span>•</span>
                <span>{new Date(doc.created_at).toLocaleDateString('en-AU')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleDownload(doc)}
              className="px-3 py-1.5 text-sm text-primary hover:bg-blue-50 rounded-md"
            >
              Download
            </button>
            
            {canDelete && (
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
              >
                {deleting === doc.id ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
