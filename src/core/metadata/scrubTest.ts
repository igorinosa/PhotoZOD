import { scrubMetadata } from './scrubEngine';
import { ImageMetadata } from '../engines/metadata/exif';

const mockMetadata: any = {
  width: 1920,
  height: 1080,
  camera: 'Canon EOS R5',
  lens: 'RF24-70mm F2.8 L IS USM',
  focalLength: 35,
  aperture: 2.8,
  iso: 100,
  shutterSpeed: '1/200',
  date: '2023-10-27T10:00:00.000Z',
  gpsLatitude: 37.7749,
  gpsLongitude: -122.4194,
  gpsAltitude: 15,
  bodySerialNumber: '1234567890',
  lensSerialNumber: '0987654321',
  cameraOwnerName: 'John Doe',
  software: 'Adobe Photoshop Lightroom Classic 12.5',
  location: 'San Francisco',
  city: 'San Francisco',
  country: 'USA',
  copyright: '© 2023 John Doe',
  author: 'John Doe'
};

console.log("--- SAFE MODE ---");
console.log(scrubMetadata(mockMetadata, { mode: 'safe' }));

console.log("\n--- FULL MODE ---");
console.log(scrubMetadata(mockMetadata, { mode: 'full' }));

console.log("\n--- CUSTOM MODE (remove location, preserve gps) ---");
console.log(scrubMetadata(mockMetadata, { mode: 'custom', remove: ['location', 'gps'], preserve: ['gps'] }));
