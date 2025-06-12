#!/bin/bash

echo "Stopping all running containers..."
podman stop $(podman ps -q) 2>/dev/null || echo "No running containers to stop"

echo "Removing all containers..."
podman rm -f $(podman ps -a -q) 2>/dev/null || echo "No containers to remove"

echo "Removing all images..."
podman rmi -f $(podman images -q) 2>/dev/null || echo "No images to remove"

echo "Removing all volumes..."
podman volume rm $(podman volume ls -q) 2>/dev/null || echo "No volumes to remove"

echo "Removing all networks..."
podman network rm $(podman network ls -q) 2>/dev/null || echo "No networks to remove"

echo "Podman cleanup complete!"
