const { createCanvas, loadImage } = require('canvas');

async function createWelcomeImage(member, bannerUrl) {
    const canvas = createCanvas(1000, 300);
    const ctx = canvas.getContext('2d');

    const background = await loadImage(bannerUrl);
    ctx.drawImage(background, 0, 0, 1000, 300);

    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 80, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    try {
        const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, 70, 70, 160, 160);
    } catch (e) {
        console.error("Erreur chargement avatar:", e);
    }
    ctx.restore();

    ctx.font = 'bold 38px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Bienvenue ${member.user.username}`, 280, 155);

    return canvas.toBuffer();
}

module.exports = { createWelcomeImage };
