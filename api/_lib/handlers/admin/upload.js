const { parseBody } = require('../../body');
const storage = require('../../storage');

// Vercel caps request bodies at 4.5MB and base64 inflates ~33%, so the raw
// file must stay under ~3MB. The panel resizes photos before sending.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Protected (enforced by the admin router): uploads one product image to Storage. */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!storage.isConfigured()) {
    res.status(503).json({
      error: 'storage_not_configured',
      message:
        'Upload indisponível: o armazenamento de imagens ainda não foi configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY). Enquanto isso, cole a URL de uma imagem.',
    });
    return;
  }

  const base64 = String(parseBody(req).imageBase64 || '');
  if (!base64 || base64.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    res.status(400).json({ error: 'invalid_image', message: 'Imagem inválida ou maior que 3 MB.' });
    return;
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    res.status(400).json({ error: 'invalid_image', message: 'Imagem inválida ou maior que 3 MB.' });
    return;
  }

  try {
    const url = await storage.uploadImage(buffer);
    res.status(200).json({ url });
  } catch (err) {
    if (err.code === 'invalid_image') {
      res.status(400).json({ error: 'invalid_image', message: 'Formato não suportado. Envie JPG, PNG ou WebP.' });
      return;
    }
    res.status(502).json({ error: 'upload_failed', message: 'Não foi possível enviar a imagem agora. Tente novamente.' });
  }
};
