## Kiro Demo Game

This project is a demo project developed using Kiro. >95% of the code has been written
by prompting Kiro. This demo project is designed to show best practices for Kiro, and
AI engineering in general.

This game has a sample branch that is deliberately left unfinished, with a few bugs. Read the
[CHALLENGE.md](CHALLENGE.md) file to learn more about these tasks.

## Key Features

- Physics-based movement and collision system
- Real-time WebSocket communication between client and server
- AI-powered item generation with unique descriptions and images
- Interactive game objects (dispensers, workbenches, garbage chutes)
- Inventory and equipment management
- Item recycling system with ownership history tracking
- Discarded items can be found by other players (but not by their previous owner)
- Item recycling system with ownership history tracking
- Discarded items can be found by other players (but not by their previous owner)

### Setup and Dependencies

To get started:

```
git clone git@github.com:kirodotdev/kiro-demo-game.git
```

Running this project relies on the following dependencies:

* A local installation of Docker Desktop or Podman.
* An AWS account, and local credentials to access that account
   - AWS Bedrock access to the following models
     - Amazon Nova Lite
     - Amazon Nova Canvas

The game stack is launched using one of the following commands, depending on
which dev tool is setup on your machine:

```
podman compose up --watch
```

or

```
docker compose up --watch
```

It is also possible to run the project outside of it's intended Docker Compose stack. However, this will require that you have the following dependencies:

* [Bun](https://bun.sh/) - JavaScript runtime
* [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
* You will need to run `bun install` in the root of the project, as well as inside the `client` and `server` folders.

You can then launch the game by running the following command in the root of the project:

```
bun start
```


## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

