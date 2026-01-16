import { Request, Response, NextFunction } from 'express';
import SystemSettings from '../models/SystemSettings';

export const checkFeature = (featureKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Admins always have access
            if (req.session?.user?.role === 'admin') {
                return next();
            }

            const settings = await (SystemSettings as any).findOne({ key: 'feature_toggles' }).exec();
            // If no settings found, default to true (enabled)
            const isEnabled = (settings?.value as any)?.[featureKey] ?? true;

            if (!isEnabled) {
                return res.status(403).json({
                    message: `Feature '${featureKey}' is currently disabled for your role.`
                });
            }

            next();
        } catch (error) {
            console.error('[FeatureToggle] Error checking feature status:', error);
            // Fail safe: allow if error? Or block? Better to fail closed or open depending on criticality.
            // Usually fail open for features if DB is down might be bad, but failing closed is safer.
            // However, if settings missing it defaults true.
            res.status(500).json({ message: 'Internal server error checking feature status' });
        }
    };
};
