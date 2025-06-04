class User {
  constructor({
    id,
    email,
    firstName,
    lastName,
    dateOfBirth,
    academicProfile,
    photos = [],
    bio = '',
    interests = [],
    isEmailVerified = false,
    isProfileComplete = false,
    isActive = true,
    lastActive = new Date(),
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.dateOfBirth = dateOfBirth;
    this.academicProfile = academicProfile;
    this.photos = photos;
    this.bio = bio;
    this.interests = interests;
    this.isEmailVerified = isEmailVerified;
    this.isProfileComplete = isProfileComplete;
    this.isActive = isActive;
    this.lastActive = lastActive;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  getAge() {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  getMainPhoto() {
    return this.photos.find(photo => photo.isMain) || this.photos[0] || null;
  }

  isEligibleForMatching() {
    return this.isEmailVerified && 
           this.isProfileComplete && 
           this.isActive && 
           this.photos.length > 0;
  }

  updateLastActive() {
    this.lastActive = new Date();
    this.updatedAt = new Date();
  }

  markProfileComplete() {
    this.isProfileComplete = true;
    this.updatedAt = new Date();
  }
}

module.exports = {
  User
};