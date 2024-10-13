const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    open: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date }
});

module.exports = mongoose.model('Ticket', TicketSchema);