function formatStudentProgressRows(students) {
    return students.map((student) => ({
        student: student.name,
        email: student.email,
        className: student.classes || '',
        completedModules: Number(student.completed_modules || 0),
        totalModules: Number(student.total_modules || 0),
        quizAverage: student.quiz_average == null ? null : Number(student.quiz_average),
        preScore: student.pre_score == null ? null : Number(student.pre_score),
        postScore: student.post_score == null ? null : Number(student.post_score),
        xpPoints: Number(student.xp_points || 0),
    }))
}

module.exports = { formatStudentProgressRows }
