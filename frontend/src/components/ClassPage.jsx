function ClassPage({ selectedClass, user, onNavigate }) {
  const isTeacherForClass = user && user.class === selectedClass;

  return (
    <div className="class-page">
      <button className="back-btn" onClick={() => onNavigate('home')}>&larr; Back to Classes</button>

      <h2>Class {selectedClass}</h2>
      <p className="class-subtitle">
        {selectedClass <= 5 ? '5 Subjects: Maths, Physical Activity, Telugu, English, Drawing'
          : '7 Subjects: Maths, Physics, Biology, Hindi, Telugu, English, Social'}
      </p>

      <div className="class-options">
        <div
          className={`option-card ${!isTeacherForClass ? 'disabled' : ''}`}
          onClick={() => isTeacherForClass ? onNavigate('enter') : null}
        >
          <div className="option-icon">+</div>
          <h3>Enter Student Details</h3>
          <p>Add a new student to your section</p>
          {!user && <span className="option-note">Login required</span>}
          {user && !isTeacherForClass && <span className="option-note">Only for Class {selectedClass} teachers</span>}
        </div>

        <div
          className="option-card"
          onClick={() => onNavigate('view')}
        >
          <div className="option-icon">&#128269;</div>
          <h3>View Student Details</h3>
          <p>View all students in this class</p>
        </div>
      </div>
    </div>
  )
}

export default ClassPage
