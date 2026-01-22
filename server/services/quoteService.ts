import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Quote from '../models/Quote';
import Person from '../models/Person';
import { getAllCategories } from './categoryService';

// Helper to normalize quote structure (handle legacy fields)
const normalizeQuote = (q: any) => {
  if (!q) return q;
  const quote = q.toObject ? q.toObject() : q;

  if (quote.metadata?.audit) {
    if (!quote.metadata.audit.verdict && quote.metadata.audit.classification) {
      quote.metadata.audit.verdict = quote.metadata.audit.classification;
    }
  }
  return quote;
};

export const saveQuote = async (req: Request, res: Response) => {
  try {
    const {
      text, personName, source, date, context, tags, metadata, analysisContext, links,
      // Audit fields from request
      savedByUser, savedByName, analyzedByUser, analyzedByName, analyzedByProvider, analyzedAt,
      improvedByUser, improvedByName, improvedByProvider, improvedAt
    } = req.body;

    if (!text || !personName) {
      return res.status(400).json({ error: 'Text and personName are required' });
    }

    // Find or create the person
    let person = await Person.findOne({ name: personName });
    if (!person) {
      // Try to find by alias if not found by name
      person = await Person.findOne({ aliases: personName });

      if (!person) {
        // Create new person if still not found
        person = new Person({
          name: personName,
          aliases: [],
        });
        await person.save();
      }
    }

    const finalMetadata = metadata || {};
    if (links) {
      finalMetadata.links = links;
    }

    // Create the quote with audit fields
    const quote = new Quote({
      text,
      person: person._id,
      sourceUrl: source,
      date: date ? new Date(date) : undefined,
      context,
      analysisContext,
      tags: tags || [],
      metadata: finalMetadata,
      // Audit fields
      savedByUser: savedByUser ? new mongoose.Types.ObjectId(savedByUser) : undefined,
      savedByName,
      savedAt: new Date(),
      analyzedByUser: analyzedByUser ? new mongoose.Types.ObjectId(analyzedByUser) : undefined,
      analyzedByName,
      analyzedByProvider,
      analyzedAt: analyzedAt ? new Date(analyzedAt) : undefined,
      improvedByUser: improvedByUser ? new mongoose.Types.ObjectId(improvedByUser) : undefined,
      improvedByName,
      improvedByProvider,
      improvedAt: improvedAt ? new Date(improvedAt) : undefined,
    });

    await quote.save();

    res.status(201).json(normalizeQuote(quote));
  } catch (error: any) {
    console.error('Error saving quote:', error);
    res.status(500).json({ error: 'Failed to save quote', details: error.message });
  }
};

export const getQuotes = async (req: Request, res: Response) => {
  try {
    const {
      personId,
      text,        // text search
      dateFrom,    // quote date range start
      dateTo,      // quote date range end
      savedAtFrom, // savedAt range start
      savedAtTo,   // savedAt range end
      analyzedAtFrom, // analyzedAt range start
      analyzedAtTo,   // analyzedAt range end
      improvedAtFrom, // improvedAt range start
      improvedAtTo,   // improvedAt range end
      isAnalyzed,  // filter by analyzed status: 'true', 'false', or 'all'
      isImproved,  // filter by improved status: 'true', 'false', or 'all'
      rating,      // analysis rating filter (None, Low, Medium, High, Severe)
      language,    // language code filter
      provider,    // analyzedByProvider filter
      sortField,   // field to sort by: savedAt, analyzedAt, improvedAt, date
      sortOrder    // newest or oldest
    } = req.query;

    const query: any = {};

    // Exclude deprecated quotes by default
    query.isDeprecated = { $ne: true };

    // Person filter
    if (personId) {
      query.person = personId;
    }

    // Text search using MongoDB text index
    if (text && typeof text === 'string' && text.trim()) {
      query.$text = { $search: text.trim() };
    }

    // Quote date range filter
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        query.date.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        query.date.$lte = new Date(dateTo as string);
      }
    }

    // SavedAt date range filter
    if (savedAtFrom || savedAtTo) {
      query.savedAt = {};
      if (savedAtFrom) {
        query.savedAt.$gte = new Date(savedAtFrom as string);
      }
      if (savedAtTo) {
        query.savedAt.$lte = new Date(savedAtTo as string);
      }
    }

    // AnalyzedAt date range filter
    if (analyzedAtFrom || analyzedAtTo) {
      query.analyzedAt = {};
      if (analyzedAtFrom) {
        query.analyzedAt.$gte = new Date(analyzedAtFrom as string);
      }
      if (analyzedAtTo) {
        query.analyzedAt.$lte = new Date(analyzedAtTo as string);
      }
    }

    // ImprovedAt date range filter
    if (improvedAtFrom || improvedAtTo) {
      query.improvedAt = {};
      if (improvedAtFrom) {
        query.improvedAt.$gte = new Date(improvedAtFrom as string);
      }
      if (improvedAtTo) {
        query.improvedAt.$lte = new Date(improvedAtTo as string);
      }
    }

    // Language filter (matches metadata.languageCode)
    if (language && typeof language === 'string' && language !== 'all') {
      query['metadata.languageCode'] = language;
    }

    // Provider filter
    if (provider && typeof provider === 'string' && provider !== 'all') {
      query.analyzedByProvider = provider;
    }

    // Rating/Severity filter - support both legacy analysis and new audit structure
    // Legacy ratings: None, Low, Medium, High, Severe (title-case)
    // New severity levels: NONE, LOW, MEDIUM, HIGH, SEVERE (uppercase)
    const legacyRatings = ['None', 'Low', 'Medium', 'High', 'Severe'];
    const newSeverityLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE'];

    if (rating && typeof rating === 'string') {
      // Normalize to uppercase for comparison
      const upperRating = rating.toUpperCase();
      const titleRating = rating.charAt(0).toUpperCase() + rating.slice(1).toLowerCase();

      if (newSeverityLevels.includes(upperRating) || legacyRatings.includes(titleRating)) {
        // Match quotes where any category has the specified severity/rating
        // Support both legacy analysis structure and new audit structure
        query.$or = [];

        const categories = getAllCategories();
        // Dynamically build query for all active categories
        for (const cat of categories) {
          // New audit structure
          query.$or.push({ [`metadata.audit.categories.${cat.title}.severity`]: upperRating });

          // Legacy mappings from config
          if (cat.legacyNames && cat.legacyNames.length > 0) {
            for (const legacyName of cat.legacyNames) {
              query.$or.push({ [`metadata.analysis.${legacyName}.rating`]: titleRating });
            }
          }
        }
      }
    }

    // Analyzed status filter
    if (isAnalyzed === 'true') {
      query.analyzedAt = { ...query.analyzedAt, $exists: true, $ne: null };
    } else if (isAnalyzed === 'false') {
      query.$and = query.$and || [];
      query.$and.push({ $or: [{ analyzedAt: { $exists: false } }, { analyzedAt: null }] });
    }

    // Improved status filter
    if (isImproved === 'true') {
      query.improvedAt = { ...query.improvedAt, $exists: true, $ne: null };
    } else if (isImproved === 'false') {
      query.$and = query.$and || [];
      query.$and.push({ $or: [{ improvedAt: { $exists: false } }, { improvedAt: null }] });
    }

    // Determine sort configuration
    const validSortFields = ['savedAt', 'analyzedAt', 'improvedAt', 'date'];
    const field = validSortFields.includes(sortField as string) ? sortField as string : 'savedAt';
    const order = sortOrder === 'oldest' ? 1 : -1;

    // Build sort object with fallback to savedAt for missing values
    // MongoDB will use the primary sort field, falling back naturally
    const sortConfig: any = { [field]: order };
    if (field !== 'savedAt') {
      sortConfig.savedAt = order; // Secondary sort for consistency
    }

    const quotes = await Quote.find(query)
      .populate('person')
      .sort(sortConfig)
      .lean();

    res.json(quotes.map(normalizeQuote));
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ error: 'Failed to fetch quotes', details: error.message });
  }
};

export const updateQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert string user IDs to ObjectIds for audit fields
    if (updateData.analyzedByUser) {
      updateData.analyzedByUser = new mongoose.Types.ObjectId(updateData.analyzedByUser);
    }
    if (updateData.improvedByUser) {
      updateData.improvedByUser = new mongoose.Types.ObjectId(updateData.improvedByUser);
    }
    if (updateData.savedByUser) {
      updateData.savedByUser = new mongoose.Types.ObjectId(updateData.savedByUser);
    }

    const quote = await Quote.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true } // Return the updated document
    ).populate('person');

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json(normalizeQuote(quote));
  } catch (error: any) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Failed to update quote', details: error.message });
  }
};

export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const quote = await Quote.findByIdAndDelete(id);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({ message: 'Quote deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Failed to delete quote', details: error.message });
  }
};
