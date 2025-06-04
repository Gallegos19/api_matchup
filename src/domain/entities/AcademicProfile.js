class AcademicProfile {
  constructor({
    userId,
    studentId,
    career,
    semester,
    campus,
    university = 'Universidad Politécnica de Chiapas',
    academicInterests = [],
    studySchedule = {},
    gpa = null,
    graduationYear,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.userId = userId;
    this.studentId = studentId;
    this.career = career;
    this.semester = semester;
    this.campus = campus;
    this.university = university;
    this.academicInterests = academicInterests;
    this.studySchedule = studySchedule;
    this.gpa = gpa;
    this.graduationYear = graduationYear;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isInSameCareer(otherProfile) {
    return this.career === otherProfile.career;
  }

  isInSameCampus(otherProfile) {
    return this.campus === otherProfile.campus;
  }

  getSimilarityScore(otherProfile) {
    let score = 0;
    
    // Misma carrera: +40 puntos
    if (this.isInSameCareer(otherProfile)) score += 40;
    
    // Mismo campus: +20 puntos
    if (this.isInSameCampus(otherProfile)) score += 20;
    
    // Semestre similar (+/- 2): +15 puntos
    const semesterDiff = Math.abs(this.semester - otherProfile.semester);
    if (semesterDiff <= 2) score += 15;
    
    // Intereses académicos en común: +25 puntos máximo
    const commonInterests = this.academicInterests.filter(interest => 
      otherProfile.academicInterests.includes(interest)
    );
    score += Math.min(commonInterests.length * 5, 25);
    
    return Math.min(score, 100);
  }
}
module.exports = {
  AcademicProfile
};  