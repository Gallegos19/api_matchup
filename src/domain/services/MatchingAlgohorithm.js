class MatchingAlgorithm {
  calculateCompatibility(profile1, profile2) {
    let compatibility = 0;

    if (!profile1 || !profile2) {
      return 0;
    }

    // Factor académico (60% del peso)
    if (profile1.career === profile2.career) {
      compatibility += 40;
    }

    // Factor de campus (20% del peso)
    if (profile1.campus === profile2.campus) {
      compatibility += 20;
    }

    // Factor de semestre (20% del peso)
    const semesterDiff = Math.abs(profile1.semester - profile2.semester);
    const semesterScore = Math.max(0, 100 - (semesterDiff * 10));
    compatibility += semesterScore * 0.2;

    return Math.round(Math.min(compatibility, 100));
  }

  generatePotentialMatches(userProfile, candidateProfiles, limit = 10) {
    if (!candidateProfiles || candidateProfiles.length === 0) {
      return [];
    }

    const scoredCandidates = candidateProfiles.map(candidate => ({
      profile: candidate,
      compatibility: this.calculateCompatibility(userProfile, candidate.academicProfile || candidate)
    }));

    return scoredCandidates
      .sort((a, b) => b.compatibility - a.compatibility)
      .slice(0, limit)
      .map(candidate => candidate.profile);
  }
}

module.exports = MatchingAlgorithm;