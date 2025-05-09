import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { S3_CONFIG, CLOUDFRONT_CONFIG } from '../config';

const IMAGES_BUCKET_NAME = S3_CONFIG.bucketName;
if (!IMAGES_BUCKET_NAME) {
  throw new Error('S3_BUCKET_NAME environment variable is required');
}

const CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME = CLOUDFRONT_CONFIG.domain;
if (!CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME) {
  throw new Error('CLOUDFRONT_DOMAIN environment variable is required');
}

const bedrockRuntime = new BedrockRuntimeClient({ region: "us-east-1" });
const s3Client = new S3Client();

export async function generateImage(prompt) {
  const params = {
    modelId: 'amazon.nova-canvas-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      taskType: "TEXT_IMAGE", 
      textToImageParams: {
        text: prompt,
        negativeText: 'shadow'
      },
      imageGenerationConfig: {
        cfgScale: 9.9,
        seed: Math.floor(Math.random() * 1000000),
        quality: "standard", 
        // Smallest possible size for Nova canvas (https://docs.aws.amazon.com/nova/latest/userguide/image-gen-access.html#image-gen-resolutions)
        width: 320, 
        height: 320,
        numberOfImages: 1
      }
    })
  };

  try {
    const command = new InvokeModelCommand(params);
    const response = await bedrockRuntime.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.images[0];
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

export async function uploadToS3(imageData, fileName) {
  // Resize the base64 image to 128x128 pixels
  const resizedImageBuffer = await sharp(Buffer.from(imageData, 'base64'))
    .resize(128, 128)
    .toBuffer();

  const params = {
    Bucket: IMAGES_BUCKET_NAME,
    Key: fileName,
    Body: resizedImageBuffer,
    ContentType: "image/png"
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    return `https://${CLOUDFRONT_DISTRIBUTION_DOMAIN_NAME}/${fileName}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

export async function generateAndUploadImage(item) {
  const imagePrompt = `Single, standalone ${item.icon}. Simple, rounded pixel art design, soft pastel colors. Neutral, solid color background`;
  console.log(imagePrompt);
  let attempts = 0;
  let imageData;
  while (attempts < 3) {
    try {
      imageData = await generateImage(imagePrompt);
      break;
    } catch (error) {
      attempts++;
      if (attempts === 3) {
        throw error;
      }
      console.log(`Image generation attempt ${attempts} failed, retrying...`);
    }
  }  const fileName = `${item.id}.png`;
  const s3Url = await uploadToS3(imageData, fileName);
  return s3Url;
}