
# Ticketz

Ticketz is a Discord bot for managing support tickets. This bot allows users to create tickets, manage them efficiently, and provide support with ease.

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/DevelopedByAlex/Ticketz.git
   cd Ticketz
   ```

2. **Install Dependencies**
   Ensure you have [Node.js](https://nodejs.org/) installed. Then, install the necessary packages:
   ```bash
   npm install
   ```

3. **Configure the Bot**
   Open `config.yml` and edit the configuration values to match your Discord server settings and bot requirements.

4. **Run the Bot**
   Start the bot by running:
   ```bash
   node index.js
   ```

## Commands

The bot includes the following commands:
- **Add**: Adds a user to an existing ticket.
- **Alert**: Initiates a 12-hour countdown to close the ticket if no further activity is detected.
- **Close**: Closes a ticket and provides a transcript.
- **Panel**: Generates a panel to interact with ticket options.
- **Remove**: Removes a user from a ticket.
- **Rename**: Renames the ticket for clarity.
- **Transcript**: Sends a transcript without closing the ticket.

## Contributing

Feel free to submit issues or pull requests to help improve the project.

## License

This project is open-source and available under the MIT License.
