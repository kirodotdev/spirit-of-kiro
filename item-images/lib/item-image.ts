import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { S3_CONFIG, CLOUDFRONT_CONFIG } from '../config';
import { nearestMatch, storeKeyValue } from '../state/vector-store';

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
        negativeText: 'shadow, floor, human, person, realistic'
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
  // Resize the base64 image to 320x320 pixels
  const resizedImageBuffer = await sharp(Buffer.from(imageData, 'base64'))
    .resize(320, 320)
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

/**
 * Gets the key to use for vector operations for an item
 * @param {Object} item - The item object
 * @returns {string} - Key for vector operations
 */
function getItemVectorKey(item) {
  // Use the item's icon as the key for vector operations
  return item.icon;
}

/**
 * Gets an image for an item, either from the vector store or by generating a new one
 * @param {Object} item - The item object to get an image for
 * @param {number} [similarityThreshold=0.3] - Threshold for considering images similar (0-1)
 * @returns {Promise<string>} - URL of the image
 */
export async function getImage(item, similarityThreshold = 0.25) {
  let similarImage;
  try {
    // Get the key for vector operations
    const itemKey = getItemVectorKey(item);
    
    // Search for similar images in the vector store
    similarImage = await nearestMatch(itemKey);

    if (similarImage && similarImage.value.score < similarityThreshold) {
      console.log(`MATCH: "${item.icon}" to "${similarImage.value.text}" with score ${similarImage.value.score}: ${similarImage.value.value}`);
      return similarImage.value.value;
    }
    
    // No similar image found, generate a new one
    const imageUrl = await generateAndUploadImage(item);
    
    // Store the new image with its key
    await storeKeyValue(
      itemKey,  // Use item icon as the key
      imageUrl,  // Store the image URL as the value
      { id: item.id, text: itemKey }  // Store item metadata
    );
    
    console.log(`NEW: "${item.icon}" Closest match "${similarImage.value.key_text}" with score ${similarImage.value.score}: ${imageUrl}`);
    return imageUrl;
  } catch (error) {

    if (similarImage) {
      console.log(`"ERROR: ${item.icon}" fallback to "${similarImage.value.text}" with score ${similarImage.value.score}: ${similarImage.value.value}`);      
      return similarImage.value.value;
    } else {
      throw error;
    }
  }
}