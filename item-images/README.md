# Item Images Server

A simple REST API server built with Bun for generating and managing item images for this game. Note: there is an officially deployed central version of this service, so you don't necessarily need to build, deploy, and run this service yourself.

## Features

- Generate images for items, based on a short description of them
- Use a vector embedding to keep track of generated images
- Match incoming image requests to previously generated images using a vector database, as an optimization
- Stores item images in S3, with a CloudFront distribution in front

## API Endpoints

__`GET /`__

Simple healthcheck. Just returns 200 status code

__`GET /image?description=red%20bag`__

Fetch an image. The image will either be freshly generated if this
is the first time anyone has requested an image with this description.
Or a previously generated matching image will be returned, if a
closely matching image is found in the vector database.

Returned images will have a dimension of 320 pixels by 320 pixels, and will be in a cute pixel art style. Expect response times of about 600ms if a previously generated image is found, and response times of about 5-10 seconds if no matching image is found, and a fresh image must be generated from scratch.

Example response:

```json
{
  "id": "b3108a46-3054-423d-87dd-02d2865069d4",
  "description": "red bag",
  "imageUrl": "https://d8a4w5rlouwtf.cloudfront.net/e63251b2-5f61-4c1c-84e1-be0c6f8fd79b.png"
}
```

