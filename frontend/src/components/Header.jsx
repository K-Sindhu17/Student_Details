function Header({ totalStudents }) {
  return (
    <header className="header">
      <h1>Student Details Management</h1>
      <div className="header-stats">
        Total Students: {totalStudents.toLocaleString()} | 500 students per page
      </div>
    </header>
  )
}

export default Header
