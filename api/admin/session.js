const { getSessionAdmin } = require('../_lib/auth');

/** Lets the admin frontend check "am I logged in?" without exposing anything sensitive. */
module.exports = async (req, res) => {
  try {
    const adminId = await getSessionAdmin(req);
    res.status(200).json({ authenticated: !!adminId });
  } catch (err) {
    res.status(200).json({ authenticated: false });
  }
};
