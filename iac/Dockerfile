FROM amazon/aws-cli:latest

WORKDIR /app

# Copy CloudFormation templates
COPY images-s3.yml /app/
COPY distribution.yml /app/

# Copy deployment script
COPY deploy.sh /app/
RUN chmod +x /app/deploy.sh

# Set the entrypoint to the deployment script
ENTRYPOINT ["/app/deploy.sh"]

# Default command (will be passed as arguments to the entrypoint)
CMD ["kiro-demo-game"]