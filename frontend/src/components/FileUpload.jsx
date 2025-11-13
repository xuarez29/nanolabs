import { useRef, useState } from 'react'

const FileUpload = ({ onSubmit, loading }) => {
  const [file, setFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const inputRef = useRef(null)

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0]
    setFile(selected || null)
    setLocalError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!file) {
      setLocalError('Please choose a PDF file to upload.')
      return
    }
    await onSubmit(file)
    setFile(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-dashed border-slate-300 bg-white p-6"
    >
      <p className="text-sm text-slate-500">Select a PDF from your device and submit it for parsing.</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="mt-4 w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        onChange={handleFileChange}
      />
      {file && <p className="mt-2 text-xs text-slate-500">Selected: {file.name}</p>}
      {localError && <p className="mt-2 text-xs text-red-600">{localError}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-md bg-accent px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {loading ? 'Uploading…' : 'Upload report'}
      </button>
    </form>
  )
}

export default FileUpload
