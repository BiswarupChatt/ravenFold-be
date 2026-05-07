import '@/config/env.config.js';

export default {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: process.env.AWS_REGION || 'ap-south-1',
  s3Bucket: process.env.AWS_S3_BUCKET || '',
  cloudFrontDomain: process.env.AWS_CLOUDFRONT_DOMAIN || '',
};