const Canvas = require('canvas');
const path = require('path');

async function createWelcomeImage(member, customBg, type = 'welcome') {
  const canvas = Canvas.createCanvas(1024, 450);
  const ctx = canvas.getContext('2d');

  // Chargement de la bannière en fond
  try {
    const bannerPath = customBg || path.join(__dirname, '../assets/banner.png');
    const background = await Canvas.loadImage(bannerPath);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    console.error("Erreur chargement bannière Canvas:", e);
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const avatarSize = 220;
  const avatarX = 100;
  const avatarY = (canvas.height - avatarSize) / 2;

  let avatarURL = "https://cdn.discordapp.com/embed/avatars/0.png";
  try {
    if (member && member.user) {
      avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 }) || avatarURL;
    }
  } catch (e) {}

  try {
    const avatar = await Canvas.loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2, true);
    ctx.stroke();
  } catch (err) {}

  const textX = avatarX + avatarSize + 170;
  const startY = (canvas.height / 2) - 25;

  const mainText = type === 'goodbye' ? 'À bientôt' : 'Bienvenue';
  const subText = 'sur le serveur Discord';

  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px Arial, sans-serif';
  ctx.fillText(mainText, textX, startY);
  
  ctx.font = '24px Arial, sans-serif';
  ctx.fillStyle = '#dcdcdc';
  ctx.fillText(subText, textX, startY + 45);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText(member.guild.name, textX, startY + 95);

  return canvas.toBuffer();
}

module.exports = { createWelcomeImage };
