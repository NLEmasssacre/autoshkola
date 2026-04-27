const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Токен не предоставлен' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ message: 'Недействительный или просроченный токен' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ message: 'Недостаточно прав доступа' });
  next();
};

module.exports = { authenticate, authorize };
