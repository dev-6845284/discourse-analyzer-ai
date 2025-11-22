import { Request, Response } from 'express';
import Quote from '../models/Quote';
import Person from '../models/Person';

export const saveQuote = async (req: Request, res: Response) => {
  try {
    const { text, personName, source, date, context, tags, metadata, analysisContext, links } = req.body;

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

    // Create the quote
    const quote = new Quote({
      text,
      person: person._id,
      sourceUrl: source,
      date: date ? new Date(date) : undefined,
      context,
      analysisContext,
      tags: tags || [],
      metadata: finalMetadata,
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
    const { personId } = req.query;
    const query: any = {};

    if (personId) {
      query.person = personId;
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
