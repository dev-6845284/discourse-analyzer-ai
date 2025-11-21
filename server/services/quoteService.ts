import { Request, Response } from 'express';
import Quote from '../models/Quote';
import Person from '../models/Person';

export const saveQuote = async (req: Request, res: Response) => {
  try {
    const { text, personName, source, date, context, tags, metadata } = req.body;

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

    // Create the quote
    const quote = new Quote({
      text,
      person: person._id,
      sourceUrl: source,
      date: date ? new Date(date) : undefined,
      context,
      tags: tags || [],
      metadata: metadata || {},
    });

    await quote.save();

    res.status(201).json(quote);
  } catch (error: any) {
    console.error('Error saving quote:', error);
    res.status(500).json({ error: 'Failed to save quote', details: error.message });
  }
};
