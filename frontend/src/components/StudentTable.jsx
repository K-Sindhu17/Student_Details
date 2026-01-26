function StudentTable({ students, currentPage, limit }) {
  const startIndex = (currentPage - 1) * limit

  return (
    <div className="student-table-container">
      <table className="student-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Roll Number</th>
            <th>Name</th>
            <th>Age</th>
            <th>Class</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => (
            <tr key={student.id}>
              <td className="serial-number">{startIndex + index + 1}</td>
              <td><span className="roll-number">{student.roll_number}</span></td>
              <td>{student.name}</td>
              <td>{student.age}</td>
              <td>{student.class}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StudentTable
