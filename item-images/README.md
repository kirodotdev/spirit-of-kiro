# Item Images Server

A simple REST API server built with Bun for managing item images for the AI Scrapyard game.

## Features

- Serve static image files
- List all available images
- Get specific images by ID/filename
- Upload new images
- Delete existing images
- CORS support for client applications

## API Endpoints

- `GET /images` - List all available images
- `GET /images/:id` - Get a specific image by ID/filename
- `POST /images` - Upload a new image (multipart/form-data)
- `DELETE /images/:id` - Delete an image

## Setup

1. Install dependencies:
   ```
   bun install
   ```

2. Start the server:
   ```
   bun start
   ```

   Or for development with auto-reload:
   ```
   bun dev
   ```

## Configuration

The server runs on port 3001 by default, but you can configure it using environment variables:

```
PORT=8080 bun start
```

## Example Usage

### List all images
```
curl http://localhost:3001/images
```

### Get a specific image
```
curl http://localhost:3001/images/example.jpg
```

### Upload an image
```
curl -X POST -F "image=@/path/to/local/image.jpg" http://localhost:3001/images
```

### Delete an image
```
curl -X DELETE http://localhost:3001/images/example.jpg
```