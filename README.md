## Kiro Demo Game

This project is a game developed using Kiro. >95% of the code
has been written by prompting Kiro. This demo project is
designed to show best practices for Kiro, and AI engineering
in general.

This game has a sample branch that is deliberately left
unfinished, with a few bugs. Read the [CHALLENGE.md](CHALLENGE.md)
file to learn more about these tasks. You can use Kiro to work
on these tasks, or checkout the `main` branch for a completed,
up-to-date experience.

## Key Features

This game is made up of three applications:

- Client:
  * Vue.js based game engine which represents game objects as
    Vue components.
  * Flexible tile grid system that adapts to varying screen sizes
  * Interactive game objects (dispenser, workbench, garbage, storage chest, computer)
  * Physics-based movement and collision system
  
- Server:
  * WebSocket protocol for low latency bi-directional communication between client and server
  * DynamoDB storage of inventories and item metadata.
  * AWS Bedrock integration powering the following features:
     * Random item generation. Infinite variations of items. Unique item names,
       descriptions, damage, and skills, written by generative AI.
     * Crafting. Transform, improve, combine, and consume items in a
       realistic manner.
     * Appraisal. Sell your crafted items to see what the AI thinks
       they are worth.
  
- Image generation:
  * AWS Bedrock integration:
    * Amazon Nova Canvas to generate unique images for items
    * Amazon Titan Text Embeddings v2 to generate vector embeddings of item descriptions
  * Amazon MemoryDB vector database to do vector matching of previously generated item images to new item image requests
  * S3 to store item images, CloudFront distribution as ingress.

This application can be run locally and played in a standalone mode,
however the best experience requires playing with other people
on a shared server. This is because item and image generation has
a network effect: when you discard an item, another player can find it.
Additionally, generated game images can be reused for other
similar items. This means that when multiple players
interact on a shared game server, there will be fewer heavy
generative AI functions will need to activate, making the game
server faster and lighter.

### Roadmap

The core game loop of this demo project is complete, however, there is
also a roadmap of potential ideas that could be built into this game.
Check the [ROADMAP.md](ROADMAP.md) for ideas on what you might be
able to build into the game using Kiro. 

Open source contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md)
for instructions on how to contribute.

### Setup and Dependencies

## 1. Clone repo

To get started:

```sh
git clone git@github.com:kirodotdev/kiro-demo-game.git
```

## 2. Setup your environment and install dependencies

Running this project relies on the following dependencies:

* A local installation of Docker Desktop or Podman.
* An AWS account, and local credentials to access that account
   - AWS Bedrock access to the following models
     - Amazon Nova Pro
     - Anthropic Claude Sonnet 3.7
     - Anthropic Claude Sonnet 4
     - Amazon Titan Text Embeddings v2 (if you want to generate item images yourself)
     - Amazon Nova Canvas (only if you want to generate item images yourself)

Run the following script to verify that the dependencies are fulfilled:

```sh
./scripts/check-dependencies.sh
```

## 3. Launch the game stack

The game stack is launched using one of the following commands, depending on
which container runtime is setup on your machine:

```sh
podman compose build && podman compose up --watch
```
_(You can substitute `docker` for `podman`)_

## 4. Bootstrap the DynamoDB tables

The first time you run the stack, the local DynamoDB will be
empty, with no tables. Run the following commands to create the required tables:

```sh
podman exec server mkdir -p /app/server/iac &&
podman cp scripts/bootstrap-local-dynamodb.js server:/app/ &&
podman cp server/iac/dynamodb.yml server:/app/server/iac/ &&
podman exec server bun run /app/bootstrap-local-dynamodb.js
```
_(You can substitute `docker` for `podman`)_

Note: If you add a new table to the infrastructure as code, or modify a table structure
then you should delete `docker/dynamodb/shared-local-instance.db` and rerun the command above.

### Don't like containers?

It is also possible to run the project outside of the Docker Compose stack if you prefer to run all the dependencies locally. You will 
need to install the following tools:

* [Bun](https://bun.sh/) - JavaScript runtime
* [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)

Then:
* You will need to run `bun install` in the root of the project, as well as inside the `client` and `server` folders.
* You will need to run `bun ./scripts/bootstrap-local-dynamodb.js` script to setup the DynamoDB tables

You can then launch the components of the stack locally, directly on your host:

- Client: `cd client && bun run dev`
- Server: `cd server && bun --watch server.ts`

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

