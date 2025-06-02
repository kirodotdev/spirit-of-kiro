# Setup and Dependencies

You can run the game locally by launching the "client" and "server" components.
At this time it is not necessary to run the item images server locally, as a remote
version of the service is provided.

## 1. Clone repo

To get started:

```sh
git clone git@github.com:kirodotdev/kiro-demo-game.git
```

## 2. Setup your environment and install dependencies

Running this project relies on the following dependencies:

* A local installation of [Docker Desktop](https://www.docker.com/products/docker-desktop/) or [Podman](https://podman.io/).
* An AWS account, [credentials to access that AWS account](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-prereqs.html), and [`aws` CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html).
* AWS Bedrock access to the following models
   - One or more of:
      - Amazon Nova Pro
      - Anthropic Claude Sonnet 3.7
      - Anthropic Claude Sonnet 4
   - Amazon Titan Text Embeddings v2 (only if you want to generate item images yourself)
   - Amazon Nova Canvas (only if you want to generate item images yourself)

Run the following script to verify that the dependencies are fulfilled:

```sh
./scripts/check-dependencies.sh
```

## 3. Launch the game stack

Launch the game stack using the following command:

```sh
podman compose build && podman compose up --watch
```
_(You can substitute `docker` for `podman` if you choose to use Docker Desktop)_

## 4. Bootstrap the DynamoDB tables

The first time you run the stack, the local DynamoDB will be
empty, with no tables. Run the following commands to create the required tables:

```sh
podman exec server mkdir -p /app/server/iac &&
podman cp scripts/bootstrap-local-dynamodb.js server:/app/ &&
podman cp server/iac/dynamodb.yml server:/app/server/iac/ &&
podman exec server bun run /app/bootstrap-local-dynamodb.js
```
_(You can substitute `docker` for `podman` if you choose to use Docker Desktop)_

Note: If you add a new table to the infrastructure as code, or modify a table structure
then you should delete `docker/dynamodb/shared-local-instance.db` and rerun the command above.

# Don't like containers?

It is also possible to run the project outside of the Docker Compose stack if you prefer to run all the dependencies locally. You will 
need to install the following dependencies:

* [Bun](https://bun.sh/) - JavaScript runtime for running the client and server. 
* [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)

Then:
* You will need to run `bun install` in three places:
   1. Root of the project
   2. `client` folder
   3. `server` folder
* You will need to run `bun ./scripts/bootstrap-local-dynamodb.js` script to setup the DynamoDB tables

You can then launch the components of the stack locally, directly on your host:

- Client: `cd client && bun run dev`
- Server: `cd server && bun --watch server.ts`