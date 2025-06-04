// src/domain/value-objects/Location.js
class Location {
  constructor({ latitude, longitude, address = null, campus = null }) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.address = address;
    this.campus = campus;
    this.validate();
  }

  validate() {
    if (this.latitude < -90 || this.latitude > 90) {
      throw new Error('Latitud inválida');
    }
    if (this.longitude < -180 || this.longitude > 180) {
      throw new Error('Longitud inválida');
    }
  }

  distanceTo(otherLocation) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(otherLocation.latitude - this.latitude);
    const dLon = this.toRad(otherLocation.longitude - this.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(this.latitude)) * Math.cos(this.toRad(otherLocation.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }
}

module.exports = {
  Location
};