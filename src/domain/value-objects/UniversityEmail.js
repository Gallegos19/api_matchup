class UniversityEmail {
  constructor(email) {
    this.value = email;
    this.domain = this.extractDomain(email);
    this.validate();
  }

  extractDomain(email) {
    return email.split('@')[1];
  }

  validate() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.value)) {
      throw new Error('Formato de email inválido');
    }

    // Validar formato específico de UPChiapas
    // Formato: matricula@carrera.upchiapas.edu.mx
    const upchiapasPattern = /^[^@]+@[a-z]+\.upchiapas\.edu\.mx$/i;
    
    if (!upchiapasPattern.test(this.value)) {
      throw new Error('Debes usar tu email institucional con formato: matricula@carrera.upchiapas.edu.mx (ejemplo: 223204@ids.upchiapas.edu.mx)');
    }

    // Verificar que termine con upchiapas.edu.mx
    if (!this.domain.endsWith('upchiapas.edu.mx')) {
      throw new Error('El email debe ser de la Universidad Politécnica de Chiapas (@carrera.upchiapas.edu.mx)');
    }
  }

  extractStudentId() {
    // Extraer solo la matrícula (parte antes del @)
    return this.value.split('@')[0];
  }

  extractCareerCode() {
    // Extraer las siglas de la carrera (parte entre @ y .upchiapas.edu.mx)
    // Ejemplo: de "223204@ids.upchiapas.edu.mx" extrae "ids"
    const parts = this.value.split('@')[1].split('.');
    return parts[0].toLowerCase();
  }

  getCareerName() {
    // Mapear códigos de carrera a nombres completos
    const careerMapping = {
      'ids': 'Ingeniería en Desarrollo de Software',
      'isi': 'Ingeniería en Sistemas Informáticos',
      'iin': 'Ingeniería Industrial',
      'ial': 'Ingeniería en Alimentos',
      'iem': 'Ingeniería Electromecánica',
      'igeo': 'Ingeniería en Geomática',
      'ienr': 'Ingeniería en Energías Renovables',
      'lag': 'Licenciatura en Administración y Gestión',
      'lcp': 'Licenciatura en Contaduría Pública',
      'lgn': 'Licenciatura en Gastronomía',
      'ltu': 'Licenciatura en Turismo',
      // Agrega más carreras según necesites
    };

    const careerCode = this.extractCareerCode();
    return careerMapping[careerCode] || `Carrera ${careerCode.toUpperCase()}`;
  }

  toString() {
    return this.value;
  }
}

module.exports = UniversityEmail;