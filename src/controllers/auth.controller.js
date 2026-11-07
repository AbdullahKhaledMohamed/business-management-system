import { authenticateUser, getUserById } from '../services/auth.service.js';
import { recordAuditLog } from '../services/audit.service.js';

export async function login(req, res, next) {
  const { username, password } = req.body;
  const ipAddress = req.ip;

  try {
    const user = await authenticateUser(username, password);

    // ---- Session fixation protection ----
    // Regenerate the session ID on privilege change (anonymous -> authenticated)
    // instead of reusing whatever session ID the client arrived with.
    req.session.regenerate(async (regenerateErr) => {
      if (regenerateErr) return next(regenerateErr);

      req.session.user = {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
      };

      req.session.save(async (saveErr) => {
        if (saveErr) return next(saveErr);

        await recordAuditLog({
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          entityType: 'User',
          entityId: user.id,
          ipAddress,
        });

        res.json({
          success: true,
          data: {
            id: user.id,
            fullName: user.fullName,
            username: user.username,
            role: user.role,
          },
        });
      });
    });
  } catch (error) {
    await recordAuditLog({
      userId: null,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: null,
      details: { attemptedUsername: username },
      ipAddress,
    });
    next(error);
  }
}

export function logout(req, res, next) {
  const userId = req.session?.user?.id ?? null;
  const ipAddress = req.ip;

  req.session.destroy(async (err) => {
    if (err) return next(err);

    res.clearCookie('bms.sid');

    await recordAuditLog({
      userId,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
      ipAddress,
    });

    res.json({ success: true, data: { message: 'تم تسجيل الخروج بنجاح.' } });
  });
}

export async function me(req, res, next) {
  try {
    const sessionUser = req.session.user;
    const user = await getUserById(sessionUser.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
