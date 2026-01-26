import { useState } from 'react'
import Header from './components/Header'
import StudentTable from './components/StudentTable'
import Pagination from './components/Pagination'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalStudents, setTotalStudents] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [showData, setShowData] = useState(false)
  const [fetchTime, setFetchTime] = useState(null)
  const limit = 500

  const fetchStudents = async (page) => {
    setLoading(true)
    setError(null)
    const startTime = performance.now()

    try {
      const response = await fetch(`${API_URL}/students?page=${page}&limit=${limit}`)

      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }

      const data = await response.json()
      const endTime = performance.now()
      const timeTaken = ((endTime - startTime) / 1000).toFixed(3)

      setStudents(data.students)
      setTotalPages(data.totalPages)
      setTotalStudents(data.total)
      setFetchTime(timeTaken)
    } catch (err) {
      setError(err.message)
      setFetchTime(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (selectedOption === 'yes') {
      setShowData(true)
      fetchStudents(1)
    } else if (selectedOption === 'no') {
      setShowData(false)
      setStudents([])
      setTotalStudents(0)
      setTotalPages(0)
      setFetchTime(null)
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    fetchStudents(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleReset = () => {
    setSelectedOption(null)
    setShowData(false)
    setStudents([])
    setTotalStudents(0)
    setTotalPages(0)
    setCurrentPage(1)
    setFetchTime(null)
  }

  return (
    <div className="app">
      <Header totalStudents={totalStudents} />

      <main className="main-content">
        {!showData && (
          <div className="question-card">
            <h2>Do you want to see all the student details?</h2>

            <div className="radio-group">
              <label className={`radio-option ${selectedOption === 'yes' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="viewChoice"
                  value="yes"
                  checked={selectedOption === 'yes'}
                  onChange={(e) => setSelectedOption(e.target.value)}
                />
                <span className="radio-checkmark"></span>
                Yes, show all student details
              </label>

              <label className={`radio-option ${selectedOption === 'no' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="viewChoice"
                  value="no"
                  checked={selectedOption === 'no'}
                  onChange={(e) => setSelectedOption(e.target.value)}
                />
                <span className="radio-checkmark"></span>
                No, I don't want to see
              </label>
            </div>

            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={selectedOption === null}
            >
              Submit
            </button>

            {selectedOption === 'no' && (
              <p className="info-text">You selected No. Click Submit to confirm.</p>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            Error: {error}
            <button onClick={() => fetchStudents(currentPage)}>Retry</button>
          </div>
        )}

        {showData && loading && (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading students...</p>
          </div>
        )}

        {showData && !loading && students.length > 0 && (
          <>
            <div className="data-header">
              <div className="page-info">
                Showing {students.length} students (Page {currentPage} of {totalPages})
              </div>
              <button className="reset-btn" onClick={handleReset}>
                Go Back
              </button>
            </div>

            {fetchTime && (
              <div className="fetch-time">
                Data fetched in <strong>{fetchTime} seconds</strong>
              </div>
            )}

            <StudentTable students={students} currentPage={currentPage} limit={limit} />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default App
