import { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import type { PageProps } from './types';
import { importPlaces } from '../services/placeService';
import { UploadCloud, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';

const UploadPlace = (_props: PageProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (
        validTypes.includes(droppedFile.type) ||
        droppedFile.name.endsWith('.xlsx') ||
        droppedFile.name.endsWith('.csv') ||
        droppedFile.name.endsWith('.xls')
      ) {
        setFile(droppedFile);
        setMessage('');
      } else {
        setMessage('Invalid file type. Please upload Excel or CSV files only.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select an Excel file first.');
      return;
    }

    setLoading(true);
    setMessage('');

    const result = await importPlaces(file);
    setMessage(result.message);

    if (result.success) {
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '40px auto' }}>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2
            style={{ margin: '0 0 8px 0', color: '#3b2c85', fontSize: '1.5rem', fontWeight: 700 }}
          >
            Upload Places
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Import multiple places directly via Excel or CSV file.
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragOver ? '#3b2c85' : '#cbd5e1'}`,
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            backgroundColor: isDragOver ? '#f8fafc' : '#ffffff',
            cursor: file ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '24px',
            position: 'relative',
          }}
          onMouseOver={(e) => {
            if (!file && !isDragOver) {
              e.currentTarget.style.borderColor = '#94a3b8';
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }
          }}
          onMouseOut={(e) => {
            if (!file && !isDragOver) {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }
          }}
        >
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />

          {!file ? (
            <div style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <UploadCloud size={32} color="#3b2c85" />
              </div>
              <h4
                style={{
                  margin: '0 0 8px 0',
                  color: '#334155',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}
              >
                Click to upload or drag and drop
              </h4>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>
                XLSX, XLS, or CSV (max. 10MB)
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '16px',
                  flexShrink: 0,
                }}
              >
                <FileSpreadsheet size={24} color="#16a34a" />
              </div>
              <div style={{ flexGrow: 1, textAlign: 'left', overflow: 'hidden' }}>
                <h5
                  style={{
                    margin: '0 0 4px 0',
                    color: '#0f172a',
                    fontSize: '1rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {file.name}
                </h5>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s',
                  display: 'flex',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
                title="Remove file"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {message && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
              backgroundColor: message.includes('successfully') ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${message.includes('successfully') ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            <div style={{ marginRight: '12px', marginTop: '2px' }}>
              {message.includes('successfully') ? (
                <CheckCircle size={20} color="#16a34a" />
              ) : (
                <AlertCircle size={20} color="#ef4444" />
              )}
            </div>
            <div
              style={{
                color: message.includes('successfully') ? '#166534' : '#991b1b',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {message}
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: !file ? '#e2e8f0' : '#3b2c85',
            color: !file ? '#94a3b8' : '#ffffff',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: !file || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onMouseOver={(e) => {
            if (file && !loading) e.currentTarget.style.backgroundColor = '#2a1f63';
          }}
          onMouseOut={(e) => {
            if (file && !loading) e.currentTarget.style.backgroundColor = '#3b2c85';
          }}
        >
          {loading ? (
            <>
              <svg
                style={{
                  animation: 'spin 1s linear infinite',
                  marginRight: '8px',
                  height: '20px',
                  width: '20px',
                }}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  opacity="0.25"
                ></circle>
                <path
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  opacity="0.75"
                ></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Upload File'
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadPlace;
