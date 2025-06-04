class BaseRepository {
  constructor(database) {
    this.db = database;
  }

  // Convertir row de DB a entidad
  mapRowToEntity(row, EntityClass) {
    if (!row) return null;
    
    // Convertir campos JSON de PostgreSQL
    const mappedRow = { ...row };
    
    // Convertir arrays y objetos JSON
    if (mappedRow.photos && typeof mappedRow.photos === 'string') {
      mappedRow.photos = JSON.parse(mappedRow.photos);
    }
    if (mappedRow.interests && typeof mappedRow.interests === 'string') {
      mappedRow.interests = JSON.parse(mappedRow.interests);
    }
    if (mappedRow.academic_interests && typeof mappedRow.academic_interests === 'string') {
      mappedRow.academic_interests = JSON.parse(mappedRow.academic_interests);
    }
    if (mappedRow.study_schedule && typeof mappedRow.study_schedule === 'string') {
      mappedRow.study_schedule = JSON.parse(mappedRow.study_schedule);
    }
    if (mappedRow.metadata && typeof mappedRow.metadata === 'string') {
      mappedRow.metadata = JSON.parse(mappedRow.metadata);
    }
    if (mappedRow.requirements && typeof mappedRow.requirements === 'string') {
      mappedRow.requirements = JSON.parse(mappedRow.requirements);
    }

    // Convertir snake_case a camelCase
    const camelCaseRow = this.toCamelCase(mappedRow);
    
    return new EntityClass(camelCaseRow);
  }

  // Convertir entidad a row de DB
  mapEntityToRow(entity) {
    const row = { ...entity };
    
    // Convertir camelCase a snake_case
    const snakeCaseRow = this.toSnakeCase(row);
    
    // Convertir arrays y objetos a JSON string para PostgreSQL
    if (snakeCaseRow.photos && Array.isArray(snakeCaseRow.photos)) {
      snakeCaseRow.photos = JSON.stringify(snakeCaseRow.photos);
    }
    if (snakeCaseRow.interests && Array.isArray(snakeCaseRow.interests)) {
      snakeCaseRow.interests = snakeCaseRow.interests;
    }
    if (snakeCaseRow.academic_interests && Array.isArray(snakeCaseRow.academic_interests)) {
      snakeCaseRow.academic_interests = snakeCaseRow.academic_interests;
    }
    if (snakeCaseRow.study_schedule && typeof snakeCaseRow.study_schedule === 'object') {
      snakeCaseRow.study_schedule = JSON.stringify(snakeCaseRow.study_schedule);
    }
    if (snakeCaseRow.metadata && typeof snakeCaseRow.metadata === 'object') {
      snakeCaseRow.metadata = JSON.stringify(snakeCaseRow.metadata);
    }
    if (snakeCaseRow.requirements && Array.isArray(snakeCaseRow.requirements)) {
      snakeCaseRow.requirements = JSON.stringify(snakeCaseRow.requirements);
    }

    return snakeCaseRow;
  }

  toCamelCase(obj) {
    const camelObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      camelObj[camelKey] = value;
    }
    return camelObj;
  }

  toSnakeCase(obj) {
    const snakeObj = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeObj[snakeKey] = value;
    }
    return snakeObj;
  }
}

module.exports = BaseRepository;