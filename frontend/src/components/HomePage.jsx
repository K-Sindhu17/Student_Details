function HomePage({ onSelectClass }) {
  const classes = Array.from({ length: 10 }, (_, i) => i + 1);

  const getOrdinal = (n) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  return (
    <div className="home-page">
      <h2>Select a Class</h2>
      <p className="home-subtitle">Choose a class to view or manage student details</p>
      <div className="class-grid">
        {classes.map(cls => (
          <div
            key={cls}
            className="class-card"
            onClick={() => onSelectClass(cls)}
          >
            <div className="class-number">{cls}</div>
            <div className="class-label">{getOrdinal(cls)} Class</div>
            <div className="class-subjects">
              {cls <= 5 ? '5 Subjects' : '7 Subjects'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
