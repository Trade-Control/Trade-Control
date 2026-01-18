'use client';

import { useState, useEffect } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DocumentUpload from '@/components/jobs/DocumentUpload';

export default function DocumentsPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [documents, setDocuments] = useState<any[]>([]);
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (supabase) {
      fetchData();
    }
  }, [jobId, supabase]);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    
    // Fetch job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobData) setJob(jobData);

    // Fetch documents
    const { data: documentsData } = await supabase
      .from('documents')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    if (documentsData) setDocuments(documentsData);
    
    setLoading(false);
  };

  const handleDownload = async (document: any) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('job-documents')
        .download(document.file_path);

      if (error) throw error;

      // Create a download link
      const url = window.URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (document: any) => {
    if (!confirm(`Delete ${document.file_name}?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('job-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      fetchData();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) return '🖼️';
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝';
    if (fileType?.includes('excel') || fileType?.includes('sheet')) return '📊';
    if (fileType?.includes('zip') || fileType?.includes('rar')) return '📦';
    return '📁';
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <Link href={`/jobs/${jobId}`} className="text-primary hover:text-primary-hover mb-4 inline-block">
          ← Back to Job
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-2">{job?.title}</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-8">
        <DocumentUpload jobId={jobId} onSuccess={fetchData} />
      </div>

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              Uploaded Documents ({documents.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {documents.map((document) => (
              <div key={document.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="text-4xl">{getFileIcon(document.file_type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {document.file_name}
                      </h3>
                      {document.description && (
                        <p className="text-sm text-gray-600 mt-1">{document.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{formatFileSize(document.file_size || 0)}</span>
                        <span>•</span>
                        <span>{new Date(document.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload(document)}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-sm font-medium transition-colors"
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={() => handleDelete(document)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Documents Yet</h2>
          <p className="text-gray-600">
            Upload documents related to this job
          </p>
        </div>
      )}
    </div>
  );
}
