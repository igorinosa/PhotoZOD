import { injectCopyright, CopyrightPayload } from './copyrightEngine';
import { ImageMetadata } from '../engines/metadata/exif';

export async function runCopyrightTests() {
  console.log('--- STARTING COPYRIGHT INJECTION TESTS ---');

  const mockMetadata: ImageMetadata = {
    camera: 'Sony A7IV',
    lens: '35mm f/1.4',
    iso: 100,
    shutterSpeed: '1/200',
    aperture: 1.4,
    focalLength: 35,
    orientation: 1,
    dateTaken: new Date().toISOString(),
    width: 6000,
    height: 4000,
    captureTime: Date.now(),
    originalCaptureTime: Date.now()
  };

  const payload: CopyrightPayload = {
    author: 'Igor Inosa',
    notice: '© 2026 Igor Inosa',
    email: 'igor@example.com',
    website: 'igorinosa.com'
  };

  // Test 1: Injection Logic
  console.log('Test 1: Injection Logic');
  const injected = injectCopyright(mockMetadata, payload);
  
  const success1 = 
    injected.exif?.Artist === payload.author &&
    injected.exif?.Copyright === payload.notice &&
    injected.iptc?.Byline === payload.author &&
    injected.iptc?.CopyrightNotice === payload.notice &&
    injected.xmp?.['dc:creator'] === payload.author &&
    injected.xmp?.['dc:rights'] === payload.notice &&
    injected.xmp?.['dc:creatorContactInfo']?.email === payload.email;

  console.log(success1 ? '✅ Test 1 Passed' : '❌ Test 1 Failed');

  // Test 2: Non-Destructive Check
  console.log('Test 2: Non-Destructive Check');
  const success2 = 
    injected.camera === mockMetadata.camera &&
    injected.lens === mockMetadata.lens &&
    injected.iso === mockMetadata.iso;

  console.log(success2 ? '✅ Test 2 Passed' : '❌ Test 2 Failed');

  // Test 3: Multi-Standard Mapping
  console.log('Test 3: Multi-Standard Mapping');
  const success3 = 
    injected.exif?.Artist !== undefined && // EXIF
    injected.iptc?.Byline !== undefined && // IPTC
    injected.xmp?.['dc:creator'] !== undefined; // XMP

  console.log(success3 ? '✅ Test 3 Passed' : '❌ Test 3 Failed');

  console.log('--- COPYRIGHT INJECTION TESTS COMPLETE ---');
  return success1 && success2 && success3;
}
