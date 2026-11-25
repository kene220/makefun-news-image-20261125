import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_IMAGE_BYTES = 1_048_576;
const EXPECTED_SHA256 = '46fb192c6b01794ead3a06765ce70d0200621a3d937c8eea87662fce6155788b';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertValidImageHeader(bytes: Buffer): void {
  const isPng = bytes.byteLength >= PNG_MAGIC.byteLength && bytes.subarray(0, PNG_MAGIC.byteLength).equals(PNG_MAGIC);
  const isJpeg = bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isPng && !isJpeg) {
    throw new Error('Unsupported image format: expected a valid PNG or JPEG header.');
  }
}

function resolveOutputDir(): string {
  const configured = process.env.MAKEFUN_OUTPUT_DIR?.trim();
  return configured && configured.length > 0 ? configured : '/output';
}

function main(): void {
  const repoDir = dirname(fileURLToPath(import.meta.url));
  const sourcePath = join(repoDir, 'entry.png');
  const imageBytes = readFileSync(sourcePath);

  if (imageBytes.byteLength === 0 || imageBytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(
      `Invalid image size: ${imageBytes.byteLength} bytes (must be between 1 and ${MAX_IMAGE_BYTES} bytes).`,
    );
  }

  assertValidImageHeader(imageBytes);

  const actualSha256 = createHash('sha256').update(imageBytes).digest('hex');
  if (actualSha256 !== EXPECTED_SHA256) {
    throw new Error(
      `Image SHA-256 mismatch: expected ${EXPECTED_SHA256}, got ${actualSha256}.`,
    );
  }

  const outputDir = resolveOutputDir();
  mkdirSync(outputDir, { recursive: true });

  const destinationPath = join(outputDir, 'entry.png');
  writeFileSync(destinationPath, imageBytes);
}

main();
