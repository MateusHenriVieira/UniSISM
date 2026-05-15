/**
 * Inicializa o bucket no MinIO (idempotente).
 * Roda como: `npx ts-node-dev --transpile-only scripts/init-minio.ts`
 *
 * Lê env: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY.
 * Cria o bucket se não existir. Opcionalmente, aplica política de lifecycle
 * (expire uploads incompletos após 7 dias).
 */
import 'dotenv/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  S3Client,
} from '@aws-sdk/client-s3';

async function main() {
  const endpoint = process.env['S3_ENDPOINT'] ?? 'http://localhost:9000';
  const region = process.env['S3_REGION'] ?? 'us-east-1';
  const bucket = process.env['S3_BUCKET'] ?? 'unisism-anexos';
  const accessKey = process.env['S3_ACCESS_KEY'] ?? 'unisism';
  const secretKey = process.env['S3_SECRET_KEY'] ?? 'unisism12345';

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  console.log(`→ Verificando bucket "${bucket}" em ${endpoint}...`);

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`✓ Bucket "${bucket}" já existe.`);
  } catch {
    console.log(`  Bucket não existe, criando...`);
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`✓ Bucket "${bucket}" criado.`);
  }

  // Lifecycle: limpa multipart uploads órfãos após 7 dias
  try {
    await client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: 'abort-incomplete-uploads',
              Status: 'Enabled',
              Filter: { Prefix: '' },
              AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
            },
          ],
        },
      }),
    );
    console.log(`✓ Lifecycle policy aplicada (aborta multipart incompleto em 7d).`);
  } catch (err) {
    console.log(`  (lifecycle policy skip — nem todos os backends suportam): ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log('');
  console.log(`Pronto. Console MinIO: http://localhost:9001`);
  console.log(`  user: ${accessKey}`);
  console.log(`  pass: ${secretKey}`);
}

main().catch((e) => {
  console.error('falhou:', e);
  process.exit(1);
});
