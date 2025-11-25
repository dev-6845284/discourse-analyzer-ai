import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Quote from '../models/Quote';
import Person from '../models/Person';

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

    res.status(201).json(quote);
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
      dateFrom,    // date range start
      dateTo,      // date range end
      rating,      // analysis rating filter (None, Low, Medium, High, Severe)
      language,    // language code filter
      provider     // analyzedByProvider filter
    } = req.query;
    
    const query: any = {};

    // Person filter
    if (personId) {
      query.person = personId;
    }

    // Text search using MongoDB text index
    if (text && typeof text === 'string' && text.trim()) {
      query.$text = { $search: text.trim() };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        query.date.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        query.date.$lte = new Date(dateTo as string);
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

    // Rating filter - filter by highest rating in analysis.ratings
    // Valid ratings: None, Low, Medium, High, Severe
    const validRatings = ['None', 'Low', 'Medium', 'High', 'Severe'];
    if (rating && typeof rating === 'string' && validRatings.includes(rating)) {
      // Match quotes where any category in metadata.analysis has the specified rating
      query.$or = [
        { 'metadata.analysis.Populism.rating': rating },
        { 'metadata.analysis.Fact Twisting.rating': rating },
        { 'metadata.analysis.Lies & False Claims.rating': rating },
        { 'metadata.analysis.Inflammatory Language.rating': rating },
      ];
    }

    const quotes = await Quote.find(query)
      .populate('person')
      .sort({ createdAt: -1 });

    res.json(quotes);
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

    res.json(quote);
  } catch (error: any) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Failed to update quote', details: error.message });
  }
};
