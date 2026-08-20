const Canvas = require('canvas');
const path = require('path');

let cachedBanner = null;
(async () => {
  try {
    const bannerPath = path.join(__dirname, '../assets/banner.png');
    cachedBanner = await Canvas.loadImage(bannerPath);
  } catch (e) {
    console.error("Impossible de précharger la bannière:", e);
  }
})();

async function createWelcomeImage(member, customBg, type = 'welcome') {
  const canvas = Canvas.createCanvas(700, 300);
  const ctx = canvas.getContext('2d');

  try {
    const background = cachedBanner || await Canvas.loadImage(customBg || path.join(__dirname, '../assets/banner.png'));
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const avatarSize = 140;
  const avatarX = 100;
  const avatarY = (canvas.height - avatarSize) / 2;

  let avatarURL = "https://cdn.discordapp.com/embed/avatars/0.png";
  try {
    if (member && member.user) {
      avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 }) || avatarURL;
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
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2, true);
    ctx.stroke();
  } catch (err) {}

  // Texte rapproché de la PP (260 au lieu de 320)
  const textX = 260;
  const startY = (canvas.height / 2) - 25;

  const mainText = type === 'goodbye' ? 'À bientôt' : 'Bienvenue';
  const subText = 'sur le serveur Discord';

  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.fillText(mainText, textX, startY);
  
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillStyle = '#dcdcdc';
  ctx.fillText(subText, textX, startY + 38);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.fillText(member.guild.name, textX, startY + 78);

  return canvas.toBuffer('image/png', { compressionLevel: 3 });
}

module.exports = { createWelcomeImage };
