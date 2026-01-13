import express from 'express';
import SystemSettings from '../models/SystemSettings';
import { authorizeMiddleware } from '../middleware/authorize';

const router = express.Router();

// Get settings - accessible to authenticated users
router.get('/', authorizeMiddleware, async (req, res) => {
    try {
        const settings = await SystemSettings.findOne({ key: 'feature_toggles' });
        // Default values if not found
        const defaultSettings = {
            search: true,
            text_extract: true,
            youtube_transcript: true,
            import_transcript: true,
            import_analysis: true,
            // 'people' are not included as per requirements
        };

        if (!settings) {
            return res.json(defaultSettings);
        }

        // Merge with defaults to ensure all keys exist
        return res.json({ ...defaultSettings, ...settings.value });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Error fetching settings' });
    }
});

// Update settings - accessible mostly to admins (checked by authorizeMiddleware / permissions)
router.put('/', authorizeMiddleware, async (req, res) => {
    try {
        const { features } = req.body;

        if (!features) {
            return res.status(400).json({ message: 'No features provided' });
        }

        const userId = req.session?.user?._id;

        const settings = await SystemSettings.findOneAndUpdate(
            { key: 'feature_toggles' },
            {
                value: features,
                updatedBy: userId
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json(settings.value);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
});

export default router;
