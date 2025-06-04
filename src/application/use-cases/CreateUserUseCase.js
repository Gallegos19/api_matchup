class CreateUserUseCase {
  constructor(userRepository, emailValidator, passwordHasher) {
    this.userRepository = userRepository;
    this.emailValidator = emailValidator;
    this.passwordHasher = passwordHasher;
  }

  async execute(userData) {
    // 1. Validar email universitario
    const universityEmail = new UniversityEmail(userData.email);
    
    // 2. Verificar que el usuario no exista
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('El usuario ya existe con este email');
    }

    // 3. Verificar matrícula única
    const studentId = universityEmail.extractStudentId();
    const existingStudent = await this.userRepository.findByStudentId(studentId);
    if (existingStudent) {
      throw new Error('Ya existe un usuario con esta matrícula');
    }

    // 4. Crear perfil académico
    const academicProfile = new AcademicProfile({
      userId: userData.id,
      studentId: studentId,
      career: userData.career,
      semester: userData.semester,
      campus: userData.campus,
      academicInterests: userData.academicInterests || []
    });

    // 5. Crear usuario
    const user = new User({
      ...userData,
      email: universityEmail.toString(),
      academicProfile: academicProfile,
      isEmailVerified: false,
      isProfileComplete: false
    });

    // 6. Guardar usuario
    const savedUser = await this.userRepository.save(user);

    // 7. Enviar email de verificación (implementar después)
    // await this.emailService.sendVerificationEmail(savedUser);

    return savedUser;
  }
}
module.exports = {
  CreateUserUseCase
};