const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearmsall')
    .setDescription('Supprime tous les messages du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Tu dois être **Administrateur** pour utiliser cette commande.', flags: 64 });
    }

    await interaction.reply({ content: '🧹 Suppression en cours...', flags: 64 });

    const guild = interaction.guild;
    const textChannels = [...guild.channels.cache.filter(ch => {
      if (ch.type !== ChannelType.GuildText) return false;
      const perms = ch.permissionsFor(guild.members.me);
      return perms && perms.has(PermissionFlagsBits.ManageMessages);
    }).values()];

    let success = 0;
    let errors = 0;

    await Promise.all(textChannels.map(async channel => {
      try {
        const position = channel.position;
        const clone = await channel.clone({ reason: 'clearmsall' });
        await clone.setPosition(position);
        await channel.delete();
        success++;
      } catch (err) {
        console.error(`❌ #${channel.name}:`, err.message);
        errors++;
      }
    }));

    console.log(`✅ ${success} salons vidés, ${errors} erreurs`);
  },
};
